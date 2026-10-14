import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { enqueueOfflineIncident } from '../services/sqliteQueue';
import { RootStackParamList } from '../types/navigation';

export const ImagePreviewScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ImagePreview'>>();
  const { imageUri, latitude, longitude, timestamp, mode = 'ONLINE' } = route.params;

  const [isPersisting, setIsPersisting] = useState<boolean>(false);
  const hasLocation = latitude !== null && longitude !== null;
  const isOfflineMode = mode === 'OFFLINE';

  const handleConfirmAction = async () => {
    if (isOfflineMode) {
      setIsPersisting(true);
      try {
        const record = await enqueueOfflineIncident({
          localImageUri: imageUri,
          latitude: latitude,
          longitude: longitude,
          severity: 'LOW',
          confidence: 0.0,
          crackCount: 0,
          dimensions: 'Pending Online AI Analysis',
          status: 'Cloud AI analysis pending.',
          detectionsJson: JSON.stringify([{ type: 'OFFLINE_CAPTURE', timestamp }])
        });

        Alert.alert(
          'OFFLINE EVIDENCE RECORDED',
          `Captured frame permanently saved to FileSystem & SQLite.\n\nStatus: Cloud AI analysis pending.\nIncident ID: ${record.id}\nGPS Telemetry: ${
            hasLocation ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}` : 'Location unavailable'
          }\n\nEvidence will automatically synchronize with InsForge and YOLOv8 once connection returns.`,
          [
            {
              text: 'View SQLite Queue',
              onPress: () => navigation.replace('OfflineIncidentQueue')
            },
            {
              text: 'Return to Offline Mode',
              onPress: () => navigation.navigate('OfflineEmergencyMode')
            }
          ]
        );
      } catch (err) {
        Alert.alert('Save Error', 'Failed to save offline incident to persistent SQLite database.');
      } finally {
        setIsPersisting(false);
      }
    } else {
      navigation.navigate('AIAnalysis', {
        imageUri,
        latitude,
        longitude,
        timestamp,
        mode
      });
    }
  };

  const handleRetake = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Confirm Capture" showBack={true} />

      <View style={styles.content}>
        {isOfflineMode && (
          <View style={styles.offlineAlert}>
            <Ionicons name="warning" size={18} color="#FFFFFF" style={styles.offlineIcon} />
            <View style={styles.offlineAlertTextWrap}>
              <Text style={styles.offlineAlertTitle}>OFFLINE EMERGENCY MODE</Text>
              <Text style={styles.offlineAlertSub}>
                Zero-connectivity active. Confirming will copy image to permanent FileSystem and
                save to SQLite with status "Cloud AI analysis pending."
              </Text>
            </View>
          </View>
        )}

        {/* Real Captured Image Frame */}
        <View style={styles.imageFrame}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />

          {/* Telemetry Overlay */}
          <View style={styles.telemetryOverlay}>
            <View style={styles.telemetryLeft}>
              <Ionicons
                name={hasLocation ? 'location' : 'location-outline'}
                size={16}
                color={hasLocation ? '#10B981' : '#F59E0B'}
              />
              <Text style={[styles.telemetryText, !hasLocation && styles.telemetryWarning]}>
                {hasLocation
                  ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}`
                  : 'Location unavailable'}
              </Text>
            </View>

            <Text style={styles.telemetryTime}>
              {new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {/* Audit Verification Card */}
        <Card style={styles.verificationCard}>
          <Text style={styles.cardHeader}>INSPECTION TELEMETRY CHECK</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Surface Target:</Text>
            <Text style={styles.infoValue}>Captured Frame Ready</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>GPS Telemetry:</Text>
            <Text style={[styles.infoValue, !hasLocation && { color: '#F59E0B' }]}>
              {hasLocation ? 'Acquired via Satellite' : 'Location unavailable'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Capture Timestamp:</Text>
            <Text style={styles.infoValue}>{new Date(timestamp).toLocaleString()}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inference Target:</Text>
            <Text style={[styles.infoValue, isOfflineMode && { color: '#F59E0B' }]}>
              {isOfflineMode ? 'Cloud AI analysis pending.' : 'Cloud YOLOv8 Engine'}
            </Text>
          </View>
        </Card>

        {/* Preview Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.retakeBtn}
            onPress={handleRetake}
            disabled={isPersisting}
            accessibilityRole="button"
            accessibilityLabel="Retake Photo"
          >
            <Ionicons name="refresh" size={18} color="#94A3B8" style={styles.btnIcon} />
            <Text style={styles.retakeBtnText}>RETAKE</Text>
          </Pressable>

          <Pressable
            style={[styles.confirmBtn, isOfflineMode && styles.confirmBtnOffline]}
            onPress={handleConfirmAction}
            disabled={isPersisting}
            accessibilityRole="button"
            accessibilityLabel={isOfflineMode ? 'Persist Offline Evidence' : 'Confirm and Analyze with AI'}
          >
            {isPersisting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={isOfflineMode ? 'save-outline' : 'checkmark-circle'}
                  size={18}
                  color="#FFFFFF"
                  style={styles.btnIcon}
                />
                <Text style={styles.confirmBtnText}>
                  {isOfflineMode ? 'SAVE OFFLINE EVIDENCE' : 'CONFIRM & ANALYZE'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
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
    justifyContent: 'space-between'
  },
  imageFrame: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: '#334155'
  },
  previewImage: {
    width: '100%',
    height: '100%'
  },
  telemetryOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155'
  },
  telemetryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  telemetryText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6
  },
  telemetryWarning: {
    color: '#F59E0B'
  },
  telemetryTime: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600'
  },
  verificationCard: {
    marginVertical: 12,
    padding: 14
  },
  cardHeader: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600'
  },
  infoValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12
  },
  retakeBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnIcon: {
    marginRight: 8
  },
  retakeBtnText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5
  },
  confirmBtn: {
    flex: 2,
    minHeight: 52,
    backgroundColor: '#0284C7',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4
  },
  confirmBtnOffline: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626'
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8
  },
  offlineAlert: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F87171'
  },
  offlineIcon: {
    marginRight: 8
  },
  offlineAlertTextWrap: {
    flex: 1
  },
  offlineAlertTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.6
  },
  offlineAlertSub: {
    color: '#FEE2E2',
    fontSize: 10,
    marginTop: 2,
    lineHeight: 13
  }
});
