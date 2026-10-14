import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

export const CameraCaptureScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CameraCapture'>>();
  const inspectionMode = route.params?.inspectionMode || 'ONLINE';

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // GPS Telemetry State (Real GPS or null if denied/unavailable)
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<
    'locating' | 'locked' | 'denied' | 'unavailable'
  >('locating');

  useEffect(() => {
    let isMounted = true;

    async function acquireGPS() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;

        if (status !== 'granted') {
          setGpsStatus('denied');
          setGpsLocation(null);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        if (isMounted) {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setGpsStatus('locked');
        }
      } catch (err) {
        if (isMounted) {
          console.warn('GPS telemetry acquisition notice:', err);
          setGpsStatus('unavailable');
          setGpsLocation(null);
        }
      }
    }

    acquireGPS();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleTorch = () => {
    setTorchEnabled((prev) => !prev);
  };

  const handleCapture = async () => {
    if (!cameraRef.current) {
      setCaptureError('Camera sensor is not ready. Please try again.');
      return;
    }

    if (isCapturing) return;

    setCaptureError(null);
    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false
      });

      if (photo?.uri) {
        const timestamp = new Date().toISOString();
        navigation.navigate('ImagePreview', {
          imageUri: photo.uri,
          latitude: gpsLocation ? gpsLocation.latitude : null,
          longitude: gpsLocation ? gpsLocation.longitude : null,
          timestamp,
          mode: inspectionMode
        });
      } else {
        setCaptureError('Camera hardware did not return a valid image frame.');
      }
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Unknown camera capture failure';
      setCaptureError(`Camera capture failed: ${errMsg}`);
    } finally {
      setIsCapturing(false);
    }
  };

  // State: Loading camera permissions
  if (!permission) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.centerText}>Initializing camera sensor...</Text>
      </SafeAreaView>
    );
  }

  // State: Camera Permission Denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <View style={styles.deniedIconBox}>
          <Ionicons name="camera-outline" size={56} color="#EF4444" />
        </View>
        <Text style={styles.deniedTitle}>Camera Access Required</Text>
        <Text style={styles.deniedSubtitle}>
          CrackSense AI uses real camera optics to inspect surfaces for structural fissures.
          Please grant camera permission to proceed with inspections.
        </Text>

        <Pressable
          style={styles.permissionBtn}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Grant Camera Permission"
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={styles.btnIcon} />
          <Text style={styles.permissionBtnText}>GRANT CAMERA PERMISSION</Text>
        </Pressable>

        <Pressable
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Cancel Inspection"
        >
          <Text style={styles.cancelBtnText}>CANCEL & RETURN</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        enableTorch={torchEnabled}
        ref={(ref) => {
          cameraRef.current = ref;
        }}
      >
        {/* Top Controls Bar */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Close Camera"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>

          {/* GPS Telemetry Pill Badge */}
          <View
            style={[
              styles.gpsPill,
              gpsStatus === 'locked' && styles.gpsPillLocked,
              (gpsStatus === 'denied' || gpsStatus === 'unavailable') && styles.gpsPillOffline
            ]}
          >
            <Ionicons
              name={
                gpsStatus === 'locked'
                  ? 'location'
                  : gpsStatus === 'locating'
                  ? 'navigate'
                  : 'location-outline'
              }
              size={14}
              color={
                gpsStatus === 'locked'
                  ? '#10B981'
                  : gpsStatus === 'locating'
                  ? '#38BDF8'
                  : '#F59E0B'
              }
              style={styles.gpsIcon}
            />
            <Text style={styles.gpsText}>
              {gpsStatus === 'locked' && gpsLocation
                ? `${gpsLocation.latitude.toFixed(4)}, ${gpsLocation.longitude.toFixed(4)}`
                : gpsStatus === 'locating'
                ? 'Acquiring GPS...'
                : 'Location unavailable'}
            </Text>
          </View>

          <Pressable
            style={[styles.iconBtn, torchEnabled && styles.torchActive]}
            onPress={toggleTorch}
            accessibilityRole="button"
            accessibilityLabel="Toggle Torch"
          >
            <Ionicons
              name={torchEnabled ? 'flash' : 'flash-off'}
              size={22}
              color={torchEnabled ? '#F59E0B' : '#FFFFFF'}
            />
          </Pressable>
        </View>

        {/* Capture Error Banner if hardware fails */}
        {captureError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#F87171" style={styles.errorIcon} />
            <Text style={styles.errorText}>{captureError}</Text>
          </View>
        )}

        {/* Bounding Alignment Box for Concrete Surface */}
        <View style={styles.crosshairOverlay} pointerEvents="none">
          <View style={styles.targetFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <View style={styles.centerCross} />
            <Text style={styles.targetLabel}>SURFACE ALIGNMENT TARGET</Text>
          </View>
        </View>

        {/* Bottom Shutter Controls */}
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.iconBtn}
            onPress={toggleCameraFacing}
            accessibilityRole="button"
            accessibilityLabel="Switch Camera"
          >
            <Ionicons name="camera-reverse-outline" size={26} color="#FFFFFF" />
          </Pressable>

          {/* Shutter Button */}
          <Pressable
            style={[styles.shutterOuter, isCapturing && styles.shutterCapturing]}
            onPress={handleCapture}
            disabled={isCapturing}
            accessibilityRole="button"
            accessibilityLabel="Capture Inspection Photo"
          >
            {isCapturing ? (
              <ActivityIndicator color="#0284C7" size="small" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>

          <View style={styles.placeholderBtn} />
        </View>
      </CameraView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  centerText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 16,
    fontWeight: '600'
  },
  deniedIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#EF4444'
  },
  deniedTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center'
  },
  deniedSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 28,
    maxWidth: 320
  },
  permissionBtn: {
    minHeight: 52,
    width: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  btnIcon: {
    marginRight: 8
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8
  },
  cancelBtn: {
    minHeight: 48,
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  torchActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.4)',
    borderColor: '#F59E0B'
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  gpsPillLocked: {
    borderColor: '#10B981'
  },
  gpsPillOffline: {
    borderColor: '#F59E0B'
  },
  gpsIcon: {
    marginRight: 6
  },
  gpsText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700'
  },
  errorContainer: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  errorIcon: {
    marginRight: 8
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1
  },
  crosshairOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  targetFrame: {
    width: 270,
    height: 330,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#38BDF8'
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3
  },
  centerCross: {
    width: 16,
    height: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)'
  },
  targetLabel: {
    position: 'absolute',
    bottom: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 36
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  shutterCapturing: {
    borderColor: '#38BDF8'
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF'
  },
  placeholderBtn: {
    width: 48
  }
});
