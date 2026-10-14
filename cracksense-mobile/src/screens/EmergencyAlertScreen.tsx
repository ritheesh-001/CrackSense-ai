import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { isDeviceOnline } from '../services/offlineSync';
import { triggerEmergencySOS } from '../services/insforge';
import { enqueueOfflineIncident } from '../services/sqliteQueue';
import { RootStackParamList } from '../types/navigation';

export const EmergencyAlertScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EmergencyAlert'>>();
  const {
    inspectionId,
    severity = 'CRITICAL',
    latitude,
    longitude,
    confidence = 0.94,
    timestamp = new Date().toISOString(),
    imageUri,
    crackCount = 1,
    dimensions = 'N/A'
  } = route.params;

  const { user } = useAuth();
  const [isSendingSOS, setIsSendingSOS] = useState<boolean>(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [sosStatus, setSosStatus] = useState<'IDLE' | 'SENT' | 'FAILED_QUEUED'>('IDLE');

  const hasLocation = latitude !== null && longitude !== null;

  // 1. Button 1: SEND SOS ALERT with confirmation dialog & failure handling
  const handleSendSOSAlert = () => {
    Alert.alert(
      'Confirm Emergency Broadcast',
      'Are you sure you want to broadcast a Priority 1 emergency structural hazard dispatch to municipal engineering authorities?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'BROADCAST SOS',
          style: 'destructive',
          onPress: async () => {
            setIsSendingSOS(true);
            try {
              const { data, error } = await triggerEmergencySOS({
                inspection_id: inspectionId?.startsWith('temp_') ? null : inspectionId || null,
                user_id: user?.id || null,
                latitude: latitude || 0,
                longitude: longitude || 0,
                severity: 'CRITICAL',
                confidence: confidence,
                sos_status: 'TRIGGERED',
                synced_from_offline: false
              });

              if (error || !data) {
                throw new Error(error || 'Network error triggering cloud SOS');
              }

              setSosStatus('SENT');
              Alert.alert(
                'SOS DISPATCHED',
                `Emergency incident successfully broadcasted to InsForge Authority Hub (Incident ID: ${data.id}). Dispatch units have been notified.`
              );
            } catch (err) {
              // Real failure state handling: fallback queue to SQLite
              console.warn('Direct SOS broadcast failed, queueing locally in SQLite:', err);
              await enqueueOfflineIncident({
                localImageUri: imageUri || 'emergency_critical_capture',
                latitude: latitude,
                longitude: longitude,
                severity: 'CRITICAL',
                confidence: confidence,
                crackCount: crackCount,
                dimensions: dimensions,
                status: 'Cloud AI analysis pending.',
                detectionsJson: JSON.stringify([{ type: 'EMERGENCY_SOS_FALLBACK', error: String(err) }])
              });

              setSosStatus('FAILED_QUEUED');
              Alert.alert(
                'Network Notice',
                'Emergency dispatch link unreachable. Incident evidence has been securely preserved in local SQLite storage and will automatically transmit once network is restored.'
              );
            } finally {
              setIsSendingSOS(false);
            }
          }
        }
      ]
    );
  };

  // 2. Button 2: GENERATE REPORT with expo-print & expo-sharing
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const online = await isDeviceOnline();
      let embeddedImageTag = '';

      if (imageUri) {
        try {
          if (imageUri.startsWith('file://')) {
            const base64Data = await FileSystem.readAsStringAsync(imageUri, {
              encoding: 'base64'
            });
            embeddedImageTag = `
              <div class="image-box">
                <div class="image-label">CRITICAL STRUCTURAL HAZARD EVIDENCE CAPTURE</div>
                <img src="data:image/jpeg;base64,${base64Data}" alt="Hazard Evidence" />
              </div>
            `;
          } else if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
            embeddedImageTag = `
              <div class="image-box">
                <div class="image-label">CRITICAL STRUCTURAL HAZARD EVIDENCE CAPTURE</div>
                <img src="${imageUri}" alt="Hazard Evidence" />
              </div>
            `;
          }
        } catch (imgErr) {
          console.warn('Could not read image for PDF embedding:', imgErr);
        }
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; }
            .hazard-header { background: #dc2626; color: white; padding: 18px; border-radius: 8px; margin-bottom: 20px; border-left: 6px solid #7f1d1d; }
            .hazard-header h1 { margin: 0; font-size: 20px; font-weight: 800; }
            .hazard-sub { margin-top: 6px; font-size: 13px; opacity: 0.95; }
            .badge-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
            .badge { padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge-online { background: #e0f2fe; color: #0369a1; }
            .badge-offline { background: #fef3c7; color: #b45309; }
            .badge-crit { background: #fee2e2; color: #dc2626; border: 1px solid #f87171; }
            .badge-sos { background: #dc2626; color: #ffffff; }
            .image-box { text-align: center; margin: 18px 0 24px 0; background: #0f172a; padding: 12px; border-radius: 8px; }
            .image-label { color: #fca5a5; font-size: 11px; font-weight: bold; margin-bottom: 8px; letter-spacing: 0.5px; }
            .image-box img { max-width: 100%; max-height: 340px; border-radius: 6px; border: 2px solid #ef4444; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .table th, .table td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; font-size: 12px; }
            .table th { background: #f8fafc; font-weight: 700; width: 35%; color: #334155; }
            .disclaimer { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px; font-size: 11px; color: #166534; margin-top: 24px; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="hazard-header">
            <h1>CRITICAL STRUCTURAL HAZARD DOSSIER</h1>
            <div class="hazard-sub">Urgent Structural Integrity Report • CrackSense AI Emergency Pipeline</div>
          </div>

          <div class="badge-row">
            <span class="badge ${online ? 'badge-online' : 'badge-offline'}">
              ${online ? 'MODE: ONLINE CLOUD AUDIT' : 'MODE: OFFLINE EMERGENCY AUDIT'}
            </span>
            <span class="badge badge-crit">SEVERITY: CRITICAL</span>
            <span class="badge badge-sos">
              EMERGENCY SOS: ${sosStatus === 'SENT' ? 'BROADCASTED TO AUTHORITIES' : sosStatus === 'FAILED_QUEUED' ? 'QUEUED OFFLINE IN SQLITE' : 'ACTIVE DISPATCH'}
            </span>
          </div>

          ${embeddedImageTag}

          <table class="table">
            <tr><th>Inspection ID</th><td>${inspectionId || 'LIVE_CRITICAL_INCIDENT'}</td></tr>
            <tr><th>Inspector Name</th><td>${user?.name || 'Authorized Inspector'} (${user?.email || 'Field Agent'})</td></tr>
            <tr><th>Audit Timestamp</th><td>${new Date(timestamp).toLocaleString()}</td></tr>
            <tr><th>Telemetry Coordinates</th><td>${
              hasLocation
                ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}`
                : 'Location unavailable'
            }</td></tr>
            <tr><th>Model Confidence</th><td>${Math.round(confidence * 100)}%</td></tr>
            <tr><th>Crack Count</th><td>${crackCount}</td></tr>
            <tr><th>Measured Dimensions</th><td>${dimensions}</td></tr>
            <tr><th>Emergency SOS Status</th><td>${
              sosStatus === 'SENT' ? 'Broadcasted (Dispatched)' : sosStatus === 'FAILED_QUEUED' ? 'Saved to Offline SQLite Queue' : 'Triggered'
            }</td></tr>
            <tr><th>Mandated Action</th><td><strong>Immediate professional structural inspection recommended.</strong> Cordon area immediately.</td></tr>
          </table>

          <div class="disclaimer">
            <strong>AI-based preliminary risk assessment</strong><br/>
            This visual machine-learning assessment identifies immediate hazard risk and preliminary crack geometry. It does not certify structural safety. Professional engineering inspection is mandatory.
          </div>

          <div class="footer">
            CrackSense AI • Confidential Authority Dispatch File • Generated via Expo Print & Expo Sharing
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Report Generated', `PDF saved: ${uri}`);
      }
    } catch (err) {
      Alert.alert('Report Notice', 'Could not compile hazard report PDF.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // 3. Button 3: VIEW LOCATION with maps link
  const handleViewLocation = () => {
    if (!hasLocation) {
      Alert.alert(
        'Location Unavailable',
        'No GPS coordinates were acquired for this inspection frame.'
      );
      return;
    }

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(mapsUrl).catch((err) => {
      console.warn('Maps launch error:', err);
      Alert.alert('Map Error', 'Could not open native maps application.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Emergency Hazard Alert" showBack={true} showEmergencyButton={false} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Prominent Critical Structural Hazard Banner */}
        <View style={styles.hazardBanner}>
          <Ionicons name="warning" size={32} color="#FFFFFF" style={styles.hazardIcon} />
          <View style={styles.hazardTextWrap}>
            <Text style={styles.hazardTitle}>⚠ CRITICAL STRUCTURAL HAZARD</Text>
            <Text style={styles.hazardSubtitle}>
              Significant structural rupture detected. Immediate engineering triage and perimeter
              cordoning mandated.
            </Text>
          </View>
        </View>

        {/* Telemetry Card: Location, Severity, Confidence, Time */}
        <Card variant="hazard" style={styles.card}>
          <Text style={styles.cardHeader}>INCIDENT AUDIT TELEMETRY</Text>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Location:</Text>
            <Text style={[styles.dataValue, !hasLocation && { color: '#F59E0B' }]}>
              {hasLocation
                ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}`
                : 'Location unavailable'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Severity:</Text>
            <Text style={styles.dataHazardText}>CRITICAL</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Confidence:</Text>
            <Text style={styles.dataValue}>{Math.round(confidence * 100)}%</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Time:</Text>
            <Text style={styles.dataValue}>{new Date(timestamp).toLocaleString()}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Mandated Action:</Text>
            <Text style={styles.dataValue}>Immediate inspection recommended</Text>
          </View>
        </Card>

        {/* Mandatory Regulatory Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Ionicons name="shield-outline" size={16} color="#38BDF8" style={styles.discIcon} />
          <Text style={styles.disclaimerText}>
            AI-based preliminary risk assessment. Automated analysis does not certify complete
            structural safety.
          </Text>
        </View>

        {/* The 3 Required Action Buttons */}
        <View style={styles.actionSection}>
          {/* Button 1: SEND SOS ALERT */}
          <Pressable
            style={styles.sosButton}
            onPress={handleSendSOSAlert}
            disabled={isSendingSOS}
            accessibilityRole="button"
            accessibilityLabel="Send SOS Alert"
          >
            {isSendingSOS ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="megaphone" size={20} color="#FFFFFF" style={styles.btnIcon} />
                <Text style={styles.sosButtonText}>SEND SOS ALERT</Text>
              </>
            )}
          </Pressable>

          {/* Button 2: GENERATE REPORT */}
          <Pressable
            style={styles.reportButton}
            onPress={handleGenerateReport}
            disabled={isGeneratingReport}
            accessibilityRole="button"
            accessibilityLabel="Generate PDF Report"
          >
            {isGeneratingReport ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="document-text" size={20} color="#FFFFFF" style={styles.btnIcon} />
                <Text style={styles.reportButtonText}>GENERATE REPORT</Text>
              </>
            )}
          </Pressable>

          {/* Button 3: VIEW LOCATION */}
          <Pressable
            style={styles.locationButton}
            onPress={handleViewLocation}
            accessibilityRole="button"
            accessibilityLabel="View Location on Map"
          >
            <Ionicons name="map" size={20} color="#38BDF8" style={styles.btnIcon} />
            <Text style={styles.locationButtonText}>VIEW LOCATION</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  hazardBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#F87171'
  },
  hazardIcon: {
    marginRight: 12
  },
  hazardTextWrap: {
    flex: 1
  },
  hazardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  hazardSubtitle: {
    color: '#FEE2E2',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16
  },
  card: {
    padding: 16,
    marginBottom: 16
  },
  cardHeader: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  dataLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  dataValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right'
  },
  dataHazardText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 20
  },
  discIcon: {
    marginRight: 8
  },
  disclaimerText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    flex: 1
  },
  actionSection: {
    gap: 12
  },
  sosButton: {
    minHeight: 54,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6
  },
  reportButton: {
    minHeight: 54,
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
  locationButton: {
    minHeight: 54,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnIcon: {
    marginRight: 8
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.8
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.8
  },
  locationButtonText: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.8
  }
});
