import * as FileSystem from 'expo-file-system/legacy';
import { YOLODetectResponse } from '../types/models';

const RAW_YOLO_URL =
  process.env.EXPO_PUBLIC_YOLO_API_URL || 'http://10.0.2.2:8000/api/v1/detect';

function getEndpoints(): { detectUrl: string; base64Url: string } {
  let base = RAW_YOLO_URL.trim();
  if (base.endsWith('/api/v1/detect')) {
    base = base.replace(/\/api\/v1\/detect$/, '');
  } else if (base.endsWith('/api/v1/detect-base64')) {
    base = base.replace(/\/api\/v1\/detect-base64$/, '');
  }
  base = base.replace(/\/+$/, '');
  return {
    detectUrl: `${base}/api/v1/detect`,
    base64Url: `${base}/api/v1/detect-base64`
  };
}

/**
 * Execute YOLOv8 detection with automatic fallback between FormData and JSON Base64.
 * Never uses `as unknown as Blob` to avoid Android React Native's
 * "Unsupported FormDataPart implementation" exception.
 */
export async function detectCracksWithYOLO(
  imageUri: string
): Promise<{ result: YOLODetectResponse | null; error: string | null }> {
  const { detectUrl, base64Url } = getEndpoints();
  let lastError: string | null = null;

  // Strategy 1: React Native standard FormData (using pure object, NO Blob casting)
  try {
    const formData = new FormData();
    const filePart: any = {
      uri: imageUri,
      name: 'crack.jpg',
      type: 'image/jpeg'
    };
    formData.append('file', filePart);
    formData.append('image', filePart);

    const response = await fetch(detectUrl, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json'
      }
    });

    if (response.ok) {
      const data = (await response.json()) as YOLODetectResponse;
      return { result: data, error: null };
    } else {
      const errBody = await response.text();
      lastError = `HTTP ${response.status}: ${errBody}`;
    }
  } catch (formErr) {
    lastError = formErr instanceof Error ? formErr.message : 'FormData inference error';
    console.warn('FormData YOLO inference notice, attempting Base64 fallback:', lastError);
  }

  // Strategy 2: JSON Base64 Fallback via expo-file-system
  // Completely immune to React Native FormDataPart / multipart serialization bugs on Android
  try {
    const base64Data = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Try /api/v1/detect with JSON payload
    let jsonResponse = await fetch(detectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        image_base64: base64Data,
        image: base64Data
      })
    });

    if (!jsonResponse.ok) {
      // Fallback to /api/v1/detect-base64 endpoint
      jsonResponse = await fetch(base64Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          image_base64: base64Data,
          image: base64Data
        })
      });
    }

    if (jsonResponse.ok) {
      const data = (await jsonResponse.json()) as YOLODetectResponse;
      return { result: data, error: null };
    }

    const jsonErr = await jsonResponse.text();
    return {
      result: null,
      error: `AI Server returned error (${jsonResponse.status}): ${jsonErr}`
    };
  } catch (b64Err) {
    const msg = b64Err instanceof Error ? b64Err.message : 'Base64 inference failed';
    return {
      result: null,
      error: `Inference connection failed: ${lastError || msg}. Make sure cracksense-yolo service is running.`
    };
  }
}
