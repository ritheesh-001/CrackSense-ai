import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { uploadImageToStorage } from '../services/insforge';
import { enqueueOfflineIncident } from '../services/sqliteQueue';
import { detectCracksWithYOLO } from '../services/yoloService';
import { RootStackParamList } from '../types/navigation';

export const AIAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AIAnalysis'>>();
  const { imageUri, latitude, longitude, timestamp, mode = 'ONLINE' } = route.params;

  const [stepMessage, setStepMessage] = useState<string>('Uploading image to InsForge Storage...');
  const [modelNotConnected, setModelNotConnected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);

  const startAnalysis = async () => {
    setIsProcessing(true);
    setModelNotConnected(false);
    setErrorMessage(null);

    try {
      // 1. Upload confirmed photo to InsForge Storage
      setStepMessage('Uploading confirmed photo to InsForge Storage (crack-images)...');
      let uploadedUrl = imageUri;

      try {
        const uploadRes = await uploadImageToStorage('crack-images', imageUri);
        if (uploadRes.url) {
          uploadedUrl = uploadRes.url;
        }
      } catch (uploadErr) {
        console.warn('Storage upload notice (continuing to inference):', uploadErr);
      }

      // 2. Call the YOLOv8 API
      setStepMessage('Executing YOLOv8 neural network inference...');
      const { result, error } = await detectCracksWithYOLO(imageUri);

      if (error || !result) {
        // As strictly required: display "AI model not connected" — never generate fake data
        setModelNotConnected(true);
        setErrorMessage(
          error || 'AI model not connected. Unable to establish socket/HTTP link to YOLOv8 inference service.'
        );
        setIsProcessing(false);
        return;
      }

      // Success: proceed to DetectionResultScreen with real detections
      navigation.replace('DetectionResult', {
        imageUri,
        uploadedImageUrl: uploadedUrl,
        yoloResult: result,
        latitude,
        longitude,
        timestamp,
        mode
      });
    } catch (err) {
      setModelNotConnected(true);
      setErrorMessage(
        err instanceof Error ? err.message : 'AI model not connected'
      );
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    startAnalysis();
  }, [imageUri]);

  const handleQueueOfflineWithoutFaking = async () => {
    try {
      await enqueueOfflineIncident({
        localImageUri: imageUri,
        latitude: latitude || 0,
        longitude: longitude || 0,
        severity: 'LOW',
        confidence: 0.0,
        crackCount: 0,
        dimensions: 'Pending Online Inference',
        status: 'Cloud AI analysis pending.',
        detectionsJson: JSON.stringify({ status: 'AWAITING_MODEL_INFERENCE' })
      });
      navigation.navigate('OfflineIncidentQueue');
    } catch (err) {
      console.warn('Failed to queue incident:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="AI Fissure Analysis" showBack={!isProcessing} />

      <View style={styles.content}>
        {/* Visual Frame */}
        <View style={styles.frameWrapper}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          {isProcessing && <View style={styles.laserScan} />}
          <View style={styles.disclaimerBadge}>
            <Text style={styles.disclaimerBadgeText}>
              AI-based preliminary risk assessment
            </Text>
          </View>
        </View>

        {isProcessing && (
          <Card style={styles.statusCard}>
            <ActivityIndicator size="large" color="#38BDF8" style={styles.spinner} />
            <Text style={styles.statusTitle}>Analyzing Surface Structural Geometry</Text>
            <Text style={styles.statusSub}>{stepMessage}</Text>
          </Card>
        )}

        {modelNotConnected && (
          <Card variant="hazard" style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Ionicons name="cloud-offline" size={28} color="#EF4444" style={styles.errorIcon} />
              <View style={styles.errorHeaderTextWrap}>
                <Text style={styles.errorTitle}>AI model not connected</Text>
                <Text style={styles.errorDesc}>
                  The YOLOv8 inference server could not be reached. CrackSense AI strictly prohibits
                  fabricating confidence scores or structural risk ratings when model connection is
                  unavailable.
                </Text>
              </View>
            </View>

            {errorMessage && (
              <View style={styles.techDetailBox}>
                <Text style={styles.techDetailText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.errorActions}>
              <Pressable
                style={styles.retryBtn}
                onPress={startAnalysis}
                accessibilityRole="button"
                accessibilityLabel="Retry AI Connection"
              >
                <Ionicons name="reload" size={18} color="#FFFFFF" style={styles.btnIcon} />
                <Text style={styles.retryBtnText}>RETRY CONNECTION</Text>
              </Pressable>

              <Pressable
                style={styles.queueBtn}
                onPress={handleQueueOfflineWithoutFaking}
                accessibilityRole="button"
                accessibilityLabel="Queue for later analysis"
              >
                <Ionicons name="save-outline" size={18} color="#94A3B8" style={styles.btnIcon} />
                <Text style={styles.queueBtnText}>QUEUE FOR LATER INFERENCE</Text>
              </Pressable>

              <Pressable
                style={styles.cancelBtn}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Cancel Analysis"
              >
                <Text style={styles.cancelBtnText}>CANCEL & RETAKE</Text>
              </Pressable>
            </View>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  frameWrapper: {
    width: '100%',
    height: 320,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#38BDF8',
    marginBottom: 20
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 0.8
  },
  laserScan: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8
  },
  disclaimerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center'
  },
  disclaimerBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  statusCard: {
    width: '100%',
    padding: 20,
    alignItems: 'center'
  },
  spinner: {
    marginBottom: 12
  },
  statusTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  },
  statusSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6
  },
  errorCard: {
    width: '100%',
    padding: 18
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  errorIcon: {
    marginRight: 12,
    marginTop: 2
  },
  errorHeaderTextWrap: {
    flex: 1
  },
  errorTitle: {
    color: '#FCA5A5',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  errorDesc: {
    color: '#F87171',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4
  },
  techDetailBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  techDetailText: {
    color: '#FECACA',
    fontSize: 11,
    fontFamily: 'monospace'
  },
  errorActions: {
    gap: 10
  },
  retryBtn: {
    minHeight: 48,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnIcon: {
    marginRight: 6
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8
  },
  queueBtn: {
    minHeight: 48,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569'
  },
  queueBtnText: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 12
  },
  cancelBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 12
  }
});
