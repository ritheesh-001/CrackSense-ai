import { NavigatorScreenParams } from '@react-navigation/native';
import { Inspection, SeverityLevel, YOLODetectResponse } from './models';

export type MainTabParamList = {
  HomeTab: undefined;
  InspectTab: undefined;
  HistoryTab: undefined;
  ReportsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  // Auth & Launch Screens
  Splash: undefined;
  Login: undefined;
  Register: undefined;

  // Main Tabs Entry
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;

  // Inspection Workflow Screens
  StartInspection: undefined;
  CameraCapture: { inspectionMode?: 'ONLINE' | 'OFFLINE' } | undefined;
  ImagePreview: {
    imageUri: string;
    latitude: number | null;
    longitude: number | null;
    timestamp: string;
    mode?: 'ONLINE' | 'OFFLINE';
  };
  AIAnalysis: {
    imageUri: string;
    latitude: number | null;
    longitude: number | null;
    timestamp: string;
    mode?: 'ONLINE' | 'OFFLINE';
  };
  DetectionResult: {
    imageUri: string;
    uploadedImageUrl?: string;
    yoloResult: YOLODetectResponse;
    latitude: number | null;
    longitude: number | null;
    timestamp: string;
    mode?: 'ONLINE' | 'OFFLINE';
  };
  SeverityResult: {
    imageUri: string;
    uploadedImageUrl?: string;
    yoloResult: YOLODetectResponse;
    inspectionId?: string;
    latitude: number | null;
    longitude: number | null;
    timestamp: string;
    mode?: 'ONLINE' | 'OFFLINE';
  };
  EmergencyAlert: {
    inspectionId?: string;
    severity?: SeverityLevel;
    latitude: number | null;
    longitude: number | null;
    confidence?: number;
    timestamp?: string;
    imageUri?: string;
    crackCount?: number;
    dimensions?: string;
  };

  // History & Reports Details
  InspectionHistory: undefined;
  InspectionDetails: {
    inspectionId: string;
    inspection?: Inspection;
  };
  Reports: undefined;

  // Offline SOS & Incident Management
  OfflineEmergencyMode: undefined;
  OfflineIncidentQueue: undefined;

  // Profile
  Profile: undefined;
};
