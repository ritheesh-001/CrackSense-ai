---
trigger: always_on
---

# CrackSense AI — Workspace Code Style Guide

## 1. Repository & Folder Boundaries
- `cracksense-mobile/`: React Native + Expo (TypeScript) for the native Android app (`com.cracksenseai.app`).
- `cracksense-web/`: React + Vite + Tailwind CSS (TypeScript) for the Authority/Admin monitoring website.
- `cracksense-yolo/`: Python 3.10+ + FastAPI + Ultralytics YOLOv8 for the AI inference API.
- Never import files across `cracksense-mobile` and `cracksense-web`. Keep dependencies strictly isolated in each folder's `package.json`.

## 2. React Native / Android Style (`cracksense-mobile`)
- **Language:** Strict TypeScript (`.tsx` for components/screens, `.ts` for services/hooks/types). Avoid `any`; define explicit interfaces for all navigation params, SQLite rows, InsForge payloads, and YOLOv8 responses.
- **Native Components Only:** Use React Native primitives (`View`, `Text`, `Pressable`, `ScrollView`, `FlatList`, `Image`) and `StyleSheet.create()`. NEVER use web HTML elements (`div`, `span`, `p`, `button`, `img`) inside `cracksense-mobile`.
- **Android UX Standards:**
  - Wrap all screens in `SafeAreaView` from `react-native-safe-area-context`.
  - Minimum touch target size of `48x48dp` for all buttons, especially Emergency/SOS actions.
  - Use explicit loading, empty, error, and offline banners on every screen.
- **Native Storage & Files:**
  - Use `expo-sqlite` for persistent offline emergency incident queues.
  - Use `expo-file-system` (`FileSystem.documentDirectory`) for permanent offline evidence images—never rely on temporary cache URIs.
  - Use `expo-secure-store` for authentication tokens.
- **Package Management:** Always install native modules via `npx expo install` to maintain Expo SDK compatibility.

## 3. Authority Website Style (`cracksense-web`)
- **Language & Stack:** TypeScript (`.tsx`), functional React components, hooks, and Tailwind CSS utility classes.
- **Data Layer:** Centralize all InsForge database queries, real-time subscriptions, and storage fetches inside `src/services/`.

## 4. Python / YOLOv8 API Style (`cracksense-yolo`)
- **Standards:** Follow PEP 8 naming conventions (`snake_case` for functions/variables, `PascalCase` for classes) with full Python type hints.
- **Validation:** Use Pydantic `BaseModel` schemas to enforce the exact JSON response format (`detected`, `confidence`, `detections`, `crackCount`, `severity`, `recommendation`).
- **Error Handling:** Raise structured FastAPI `HTTPException` responses with clear status codes; never return fabricated or random detection numbers on model failure.

## 5. Security & Data Integrity Rules
- Prefix public mobile environment variables with `EXPO_PUBLIC_`.
- Never hardcode URLs, API keys, or private InsForge service-role keys in source files.
- Never generate mock/fake data for GPS coordinates, camera captures, AI confidence scores, offline analysis, or SOS alert states.