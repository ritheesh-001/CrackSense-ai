# CrackSense AI — YOLOv8 Detection API

FastAPI service providing high-speed crack detection, bounding box extraction, metric dimension estimation, and structural risk severity classification.

## Getting Started

### 1. Setup Virtual Environment
```bash
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1

# Linux / macOS:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Model Weights
- Place custom trained weights as `best.pt` inside this directory.
- If `best.pt` is not present, the service automatically falls back to `yolov8n.pt`.

### 4. Run the API Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive OpenAPI docs will be available at: `http://localhost:8000/docs`

## API Endpoints

### `POST /api/v1/detect`
Accepts `multipart/form-data` with `file: UploadFile`.

#### Response Schema:
```json
{
  "detected": true,
  "confidence": 0.94,
  "detections": [
    {
      "bbox": [120.5, 45.2, 380.0, 110.8],
      "confidence": 0.94,
      "dimensions": "38.9mm x 2.4mm"
    }
  ],
  "crackCount": 1,
  "severity": "CRITICAL",
  "recommendation": "High structural risk detected. Significant crack propagation requires immediate engineering assessment, safety cordoning, and emergency reinforcement."
}
```

### `GET /api/v1/health`
Checks service and model status.
