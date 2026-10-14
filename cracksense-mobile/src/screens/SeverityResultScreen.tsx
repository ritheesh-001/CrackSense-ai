import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { saveInspectionRecord } from '../services/insforge';
import { RootStackParamList } from '../types/navigation';

export const SeverityResultScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SeverityResult'>>();
  const {
    imageUri,
    uploadedImageUrl,
    yoloResult,
    latitude,
    longitude,
    timestamp,
    mode = 'ONLINE'
  } = route.params;

  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState<boolean>(true);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const getSeverityActionAdvice = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL':
        return 'Immediate professional structural inspection recommended.';
      case 'MEDIUM':
        return 'Professional structural inspection recommended.';
      case 'LOW':
      default:
        return 'Monitor periodically.';
    }
  };

  const adviceText = getSeverityActionAdvice(yoloResult.severity);
  const isCritical = yoloResult.severity === 'CRITICAL';
  const hasLocation = latitude !== null && longitude !== null;

  useEffect(() => {
    async function persistInspection() {
      setIsSaving(true);
      setSaveError(null);
      try {
        const finalUrl = uploadedImageUrl || imageUri;

        const { data, error } = await saveInspectionRecord({
          user_id: user?.id || null,
          original_image_url: finalUrl,
          detection_image_url: finalUrl,
          latitude: latitude,
          longitude: longitude,
          location_status: hasLocation ? 'EXACT' : 'OFFLINE',
          confidence: yoloResult.confidence,
          crack_count: yoloResult.crackCount,
          detections_json: yoloResult.detections,
          dimensions: yoloResult.detections[0]?.dimensions || null,
          severity: yoloResult.severity,
          recommendation: adviceText,
          mode: mode
        });

        if (data?.id) {
          setSavedId(data.id);
        } else if (error) {
          setSaveError(error);
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Database save notice');
      } finally {
        setIsSaving(false);
      }
    }

    persistInspection();
  }, []);

  const handleTriggerSOS = () => {
    navigation.navigate('EmergencyAlert', {
      inspectionId: savedId || `temp_${Date.now()}`,
      severity: yoloResult.severity,
      latitude,
      longitude,
      crackCount: yoloResult.crackCount,
      confidence: yoloResult.confidence
    });
  };

  const handleReturnHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }]
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Severity Assessment" showBack={false} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Prominent Mandatory AI Disclaimer */}
        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerHeader}>
            <Ionicons name="shield-outline" size={18} color="#38BDF8" style={styles.discIcon} />
            <Text style={styles.disclaimerTitle}>
              AI-based preliminary risk assessment
            </Text>
          </View>
          <Text style={styles.disclaimerBody}>
            CrackSense AI provides machine-learning visual inference. This preliminary risk assessment
            is an informational aid and does not certify complete building safety.
          </Text>
        </View>

        {/* Severity Hero Card */}
        <Card variant={isCritical ? 'hazard' : 'default'} style={styles.heroCard}>
          <View style={styles.badgeWrap}>
            <StatusBadge severity={yoloResult.severity} size="large" />
          </View>

          <Text style={styles.heroTitle}>
            {yoloResult.severity === 'CRITICAL'
              ? 'CRITICAL DEFECT DETECTED'
              : yoloResult.severity === 'MEDIUM'
              ? 'MODERATE DEFECT DETECTED'
              : 'LOW RISK SURFACE FISSURE'}
          </Text>

          <Text style={styles.heroAdvice}>{adviceText}</Text>
        </Card>

        {/* Metrics Grid */}
        <Card style={styles.summaryCard}>
          <Text style={styles.cardHeader}>AUDIT SUMMARY</Text>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Identified Cracks:</Text>
            <Text style={styles.dataValue}>{yoloResult.crackCount}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Model Confidence:</Text>
            <Text style={styles.dataValue}>{Math.round(yoloResult.confidence * 100)}%</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Estimated Dimensions:</Text>
            <Text style={styles.dataValue}>{yoloResult.detections[0]?.dimensions || 'None'}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>GPS Coordinates:</Text>
            <Text style={[styles.dataValue, !hasLocation && { color: '#F59E0B' }]}>
              {hasLocation
                ? `${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}`
                : 'Location unavailable'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Capture Timestamp:</Text>
            <Text style={styles.dataValue}>{new Date(timestamp).toLocaleString()}</Text>
          </View>
        </Card>

        {/* Cloud Sync State */}
        <Card style={styles.syncCard}>
          <View style={styles.syncRow}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#38BDF8" />
            ) : saveError ? (
              <Ionicons name="alert-circle" size={22} color="#F59E0B" />
            ) : (
              <Ionicons name="cloud-done" size={22} color="#10B981" />
            )}

            <View style={styles.syncTextWrap}>
              <Text style={styles.syncTitle}>
                {isSaving
                  ? 'Syncing with InsForge Database...'
                  : saveError
                  ? 'Queued in Local Storage'
                  : 'Record Confirmed in Cloud'}
              </Text>
              <Text style={styles.syncSubtitle}>
                {isSaving
                  ? 'Writing inspection row...'
                  : saveError
                  ? `Notice: ${saveError}`
                  : `ID: ${savedId}`}
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {isCritical && (
            <Pressable
              style={styles.sosButton}
              onPress={handleTriggerSOS}
              accessibilityRole="button"
              accessibilityLabel="Broadcast Emergency SOS"
            >
              <Ionicons name="warning" size={22} color="#FFFFFF" style={styles.btnIcon} />
              <Text style={styles.sosButtonText}>BROADCAST EMERGENCY SOS</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.homeBtn}
            onPress={handleReturnHome}
            accessibilityRole="button"
            accessibilityLabel="Return to Dashboard"
          >
            <Ionicons name="home-outline" size={18} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.homeBtnText}>RETURN TO DASHBOARD</Text>
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
  disclaimerCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  discIcon: {
    marginRight: 6
  },
  disclaimerTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  disclaimerBody: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16
  },
  heroCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16
  },
  badgeWrap: {
    marginBottom: 14
  },
  heroTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  heroAdvice: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20
  },
  summaryCard: {
    padding: 16,
    marginBottom: 16
  },
  cardHeader: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  dataLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600'
  },
  dataValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700'
  },
  syncCard: {
    padding: 14,
    marginBottom: 20
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  syncTextWrap: {
    marginLeft: 12,
    flex: 1
  },
  syncTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700'
  },
  syncSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2
  },
  actionContainer: {
    gap: 12
  },
  sosButton: {
    minHeight: 56,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#F87171',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6
  },
  btnIcon: {
    marginRight: 8
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.8
  },
  homeBtn: {
    minHeight: 52,
    backgroundColor: '#0284C7',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8
  }
});
