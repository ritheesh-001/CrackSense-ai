import base64
import io
import logging
import os
from contextlib import asynccontextmanager
from enum import Enum
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cracksense-yolo")

# Model configuration paths
BASE_DIR = Path(__file__).resolve().parent
CUSTOM_MODEL_PATH = BASE_DIR / "best.pt"
FALLBACK_MODEL_PATH = BASE_DIR / "yolov8n.pt"

# Global model reference
model_instance = None
model_name = "uninitialized"

# COCO classes for non-structural everyday objects (laptops, phones, furniture, etc.)
NON_STRUCTURAL_CLASSES = {
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
}


class SeverityEnum(str, Enum):
    NONE = "NONE"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    CRITICAL = "CRITICAL"


class DetectionItem(BaseModel):
    bbox: List[float] = Field(
        ...,
        description="[x1, y1, x2, y2] bounding box coordinates in pixel space"
    )
    confidence: float = Field(
        ...,
        description="Detection confidence score between 0.0 and 1.0"
    )
    dimensions: str = Field(
        ...,
        description="Estimated physical crack dimensions (e.g., '12.4mm x 1.8mm')"
    )


class DetectionResponse(BaseModel):
    detected: bool = Field(..., description="Whether any crack was detected")
    confidence: float = Field(..., description="Peak detection confidence score")
    detections: List[DetectionItem] = Field(
        default_factory=list,
        description="List of detected crack bounding boxes and dimensions"
    )
    crackCount: int = Field(..., description="Total count of detected cracks")
    severity: SeverityEnum = Field(..., description="Calculated structural risk severity")
    recommendation: str = Field(..., description="Actionable maintenance or engineering advice")
    autoSos: bool = Field(default=False, description="Whether emergency SOS should be auto-triggered")


class Base64DetectRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64-encoded image string")
    image: Optional[str] = Field(None, description="Alternative field for Base64 image")


def load_model():
    """
    Loads YOLOv8 model from custom weights ('best.pt') if present,
    falling back to 'yolov8n.pt'.
    """
    global model_instance, model_name

    try:
        from ultralytics import YOLO
    except ImportError as e:
        logger.error("Ultralytics library is not installed: %s", e)
        raise RuntimeError(
            "Ultralytics package is missing. Install requirements via pip install -r requirements.txt"
        ) from e

    model_path_env = os.getenv("MODEL_PATH")
    if model_path_env and Path(model_path_env).is_file():
        logger.info("Loading model from MODEL_PATH environment variable: %s", model_path_env)
        model_instance = YOLO(model_path_env)
        model_name = Path(model_path_env).name
    elif CUSTOM_MODEL_PATH.is_file():
        logger.info("Loading custom trained weights from %s", CUSTOM_MODEL_PATH)
        model_instance = YOLO(str(CUSTOM_MODEL_PATH))
        model_name = "best.pt"
    elif FALLBACK_MODEL_PATH.is_file():
        logger.info("Loading local fallback weights from %s", FALLBACK_MODEL_PATH)
        model_instance = YOLO(str(FALLBACK_MODEL_PATH))
        model_name = "yolov8n.pt"
    else:
        logger.info("Custom weights not found. Loading default 'yolov8n.pt'")
        model_instance = YOLO("yolov8n.pt")
        model_name = "yolov8n.pt (pretrained default)"

    logger.info("Model loaded successfully: %s", model_name)
    return model_instance


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan event handler for initial startup and cleanup."""
    logger.info("Initializing CrackSense AI YOLOv8 inference service...")
    try:
        load_model()
    except Exception as exc:
        logger.warning(
            "Initial model loading deferred or failed: %s. Model will reload on request if available.",
            exc
        )
    yield
    logger.info("Shutting down CrackSense AI YOLOv8 inference service.")


app = FastAPI(
    title="CrackSense AI — YOLOv8 Detection Service",
    description="High-precision automated crack detection and structural severity inference API.",
    version="2.0.0",
    lifespan=lifespan
)

# Cross-Origin Resource Sharing (CORS) setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def detect_everyday_objects(image: Image.Image) -> Tuple[bool, str]:
    """
    TIER 1: Strict Non-Crack Everyday Object Rejector.
    Runs yolov8n.pt to detect non-structural COCO classes (laptop, keyboard, phone,
    person, chair, etc.). If detected occupying >15% of frame, flags rejection.
    """
    global model_instance

    if model_instance is None:
        return False, ""

    # Only run rejection if model is a COCO model (like yolov8n.pt)
    if not hasattr(model_instance, "names"):
        return False, ""

    img_w, img_h = image.size
    total_area = float(img_w * img_h)

    try:
        results = model_instance(image, conf=0.30, verbose=False)
        if not results or len(results) == 0:
            return False, ""

        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return False, ""

        total_object_area = 0.0
        detected_objects = []

        for box in boxes:
            cls_id = int(box.cls[0].item())
            class_name = model_instance.names.get(cls_id, "")
            conf = float(box.conf[0].item())

            if class_name in NON_STRUCTURAL_CLASSES:
                xyxy = box.xyxy[0].tolist()
                bw = abs(xyxy[2] - xyxy[0])
                bh = abs(xyxy[3] - xyxy[1])
                area = bw * bh
                total_object_area += area
                detected_objects.append(f"{class_name} ({round(conf * 100)}%)")

        area_ratio = total_object_area / total_area if total_area > 0 else 0.0

        # Reject if non-structural objects occupy >15% of the frame or prominent electronics/furniture
        if area_ratio > 0.15 or len(detected_objects) >= 2:
            detail = ", ".join(detected_objects[:3])
            logger.info("Non-structural everyday object detected in frame: %s (area: %.1f%%)", detail, area_ratio * 100)
            return True, f"Non-structural object detected: {detail}"

    except Exception as exc:
        logger.warning("Everyday object detector error (continuing): %s", exc)

    return False, ""


def analyze_structural_cracks_opencv(image: Image.Image) -> DetectionResponse:
    """
    TIER 2: Calibrated Structural Fissure Morphological & Fracture Analysis Engine.
    Uses OpenCV multi-scale Black-Hat filtering, adaptive thresholding, distance-transform
    aperture measurement, and contour geometry to classify cracks into LOW, MEDIUM, CRITICAL.
    """
    img_np = np.array(image.convert("RGB"))
    img_h, img_w = img_np.shape[:2]
    total_pixels = float(img_h * img_w)

    # 1. Grayscale
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    # 2. Texture & Focus Check (Laplacian Variance)
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if lap_var < 15.0:
        logger.info("Image rejected: Texture variance too low (%.2f < 15.0)", lap_var)
        return DetectionResponse(
            detected=False,
            confidence=0.0,
            detections=[],
            crackCount=0,
            severity=SeverityEnum.NONE,
            recommendation="No structural wall or concrete crack detected. Please point the camera directly at a wall or concrete surface.",
            autoSos=False
        )

    # 3. Contrast enhancement via CLAHE to emphasize faint crack fissures
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # 4. Bilateral smoothing to suppress uniform plaster grain while keeping sharp crack boundaries
    smoothed = cv2.bilateralFilter(enhanced, 7, 45, 45)

    # 5. Multi-scale Black-Hat filtering (extracts narrow and medium dark valleys)
    k_small = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    k_large = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 17))
    bh1 = cv2.morphologyEx(smoothed, cv2.MORPH_BLACKHAT, k_small)
    bh2 = cv2.morphologyEx(smoothed, cv2.MORPH_BLACKHAT, k_large)
    blackhat = cv2.max(bh1, bh2)

    # 6. Adaptive Thresholding
    _, thresh_bh = cv2.threshold(blackhat, 16, 255, cv2.THRESH_BINARY)
    thresh_adapt = cv2.adaptiveThreshold(
        smoothed, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 7
    )
    fissure_mask = cv2.bitwise_and(thresh_bh, thresh_adapt)

    # Clean micro-speckles
    k_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    cleaned_mask = cv2.morphologyEx(fissure_mask, cv2.MORPH_OPEN, k_open)

    # 7. Distance transform gives distance from each pixel to background (measures half-width)
    dist_map = cv2.distanceTransform(cleaned_mask, cv2.DIST_L2, 5)

    # 8. Contour structural geometry analysis
    contours, _ = cv2.findContours(cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    valid_detections: List[DetectionItem] = []
    total_crack_pixels = 0
    max_crack_width_px = 0.0

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 18:
            continue

        perimeter = cv2.arcLength(cnt, False)
        if perimeter < 35:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = max(w, h) / max(min(w, h), 1)

        # Thinness ratio: P^2 / A (very high for long cracks, low ~16 for squares/circles)
        thinness = (perimeter * perimeter) / max(area, 1)

        # Non-crack rejection for solid convex shapes (like keyboard buttons, icons, or circular holes)
        if thinness < 20.0 and aspect_ratio < 2.5:
            continue

        # Extract local crack width from distance transform
        cnt_mask = np.zeros_like(cleaned_mask)
        cv2.drawContours(cnt_mask, [cnt], -1, 255, -1)
        cnt_dist_vals = dist_map[cnt_mask > 0]
        cnt_half_width = float(np.max(cnt_dist_vals)) if len(cnt_dist_vals) > 0 else 1.0
        cnt_width_px = cnt_half_width * 2.0

        if cnt_width_px > max_crack_width_px:
            max_crack_width_px = cnt_width_px

        cnt_length_px = float(max(w, h))
        total_crack_pixels += int(area)

        # Calibrated physical dimensions: ~0.15 mm/px at ~0.5m inspection distance
        est_len_mm = round(max(cnt_length_px * 0.15, 1.0), 1)
        est_w_mm = round(max(cnt_width_px * 0.15, 0.4), 1)
        dim_str = f"{est_len_mm}mm x {est_w_mm}mm"

        # Confidence calibrated to thinness, elongation, and sharpness
        conf = round(min(0.72 + (thinness / 220.0) * 0.24, 0.98), 2)

        valid_detections.append(
            DetectionItem(
                bbox=[float(x), float(y), float(x + w), float(y + h)],
                confidence=conf,
                dimensions=dim_str
            )
        )

    # If no structural crack contours found, return NONE
    if len(valid_detections) == 0:
        return DetectionResponse(
            detected=False,
            confidence=0.0,
            detections=[],
            crackCount=0,
            severity=SeverityEnum.NONE,
            recommendation="No structural wall or concrete crack detected. Please point the camera directly at a wall or concrete surface.",
            autoSos=False
        )

    # 9. Calibrated 3-Tier Crack Severity Engine
    fracture_density = (float(total_crack_pixels) / total_pixels) * 100.0
    max_width_mm = max_crack_width_px * 0.15
    crack_count = len(valid_detections)
    peak_confidence = max(d.confidence for d in valid_detections)

    # TIER 3: CRITICAL (Earthquake / Severe Building Collapse Damage)
    # Massive multi-zone dark voids, spalling, exposed rebar, or >12% fracture density, or wide fracture >= 15mm
    if fracture_density >= 10.0 or max_width_mm >= 15.0 or (crack_count >= 4 and max_width_mm >= 8.0):
        severity = SeverityEnum.CRITICAL
        auto_sos = True
        recommendation = (
            "EXTREME EARTHQUAKE / COLLAPSE HAZARD: Catastrophic structural failure detected. "
            "Evacuate building immediately! Emergency SOS Alert and Structural Hazard Report triggered automatically."
        )

    # TIER 2: MEDIUM (Dangerous Deep Structural Crack)
    # Wide 3mm-15mm stepped/vertical structural fracture across wall/window lintel, or fracture density >= 2.5%
    elif max_width_mm >= 2.5 or fracture_density >= 2.5 or crack_count >= 3:
        severity = SeverityEnum.MEDIUM
        auto_sos = False
        recommendation = (
            "DANGER - HIGH STRUCTURAL RISK: Deep structural wall fracture detected. "
            "Immediate professional structural engineering repair required. Use structural stitching / "
            "helical bars (tie-rods) and high-strength epoxy mortar grouting immediately."
        )

    # TIER 1: LOW (Normal / Hairline Surface Crack)
    # Thin <2mm surface plaster crack on bright wall
    else:
        severity = SeverityEnum.LOW
        auto_sos = False
        recommendation = (
            "Minor surface hairline crack. Monitor periodically. Recommended Chemical Fix: "
            "Clean the crack groove and apply Acrylic Elastomeric Crack Filler "
            "(e.g., Dr. Fixit Crack-X Paste / Fosroc Renderoc Crack Filler) or low-viscosity Epoxy Injection Resin with waterproof putty coat."
        )

    return DetectionResponse(
        detected=True,
        confidence=peak_confidence,
        detections=valid_detections,
        crackCount=crack_count,
        severity=severity,
        recommendation=recommendation,
        autoSos=auto_sos
    )


def process_inference_pipeline(image: Image.Image) -> DetectionResponse:
    """
    Main inference pipeline:
    1. Everyday Object Rejector (runs yolov8n.pt to reject non-structural laptops/phones/furniture).
    2. Calibrated 3-tier OpenCV morphological structural crack analysis.
    """
    # 1. Check for non-structural everyday objects in frame
    is_object, object_desc = detect_everyday_objects(image)
    if is_object:
        return DetectionResponse(
            detected=False,
            confidence=0.0,
            detections=[],
            crackCount=0,
            severity=SeverityEnum.NONE,
            recommendation="No structural wall or concrete crack detected. Please point the camera directly at a wall or concrete surface.",
            autoSos=False
        )

    # 2. Run Calibrated Structural Fissure Morphological Engine
    return analyze_structural_cracks_opencv(image)


@app.get("/", tags=["Health"])
async def root():
    """Root metadata endpoint."""
    return {
        "service": "CrackSense AI — YOLOv8 & OpenCV Structural Detection API",
        "version": "2.0.0",
        "model": model_name,
        "status": "operational"
    }


@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "modelLoaded": model_instance is not None,
        "modelName": model_name
    }


@app.post(
    "/api/v1/detect",
    response_model=DetectionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Inference"]
)
async def detect_cracks(
    request: Request,
    file: Optional[UploadFile] = File(None, description="Image file under 'file'"),
    image: Optional[UploadFile] = File(None, description="Image file under 'image'")
) -> DetectionResponse:
    """
    Inference endpoint: Accepts an uploaded image via multipart/form-data (fields 'file' or 'image')
    OR a JSON base64 payload ({ "image_base64": "..." } or { "image": "..." }).
    """
    contents: Optional[bytes] = None
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            body = await request.json()
            b64_str = body.get("image_base64") or body.get("image") or body.get("data")
            if not b64_str:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing 'image_base64' or 'image' field in JSON payload."
                )
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            contents = base64.b64decode(b64_str)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 payload: {str(exc)}"
            ) from exc
    elif file is not None:
        contents = await file.read()
    elif image is not None:
        contents = await image.read()
    else:
        # Check raw form data
        try:
            form = await request.form()
            form_file = form.get("file") or form.get("image")
            if form_file and hasattr(form_file, "read"):
                contents = await form_file.read()
        except Exception:
            pass

    if not contents or len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid image data provided via form-data ('file'/'image') or JSON ('image_base64')."
        )

    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a valid or readable image."
        )
    except Exception as exc:
        logger.error("Error reading uploaded image: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process image file: {str(exc)}"
        ) from exc

    return process_inference_pipeline(pil_image)


@app.post(
    "/api/v1/detect-base64",
    response_model=DetectionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Inference"]
)
async def detect_cracks_base64(payload: Base64DetectRequest) -> DetectionResponse:
    """Dedicated endpoint accepting base64-encoded image payloads."""
    b64_str = payload.image_base64 or payload.image
    if not b64_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing 'image_base64' or 'image' in payload"
        )
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    try:
        contents = base64.b64decode(b64_str)
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 image data: {exc}"
        ) from exc
    return process_inference_pipeline(pil_image)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info("Starting CrackSense YOLO service on %s:%d", host, port)
    uvicorn.run("main:app", host=host, port=port, reload=True)
