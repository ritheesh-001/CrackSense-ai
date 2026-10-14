import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { addSyncListener, isDeviceOnline } from '../services/offlineSync';
import { enqueueOfflineIncident, getOfflineIncidents } from '../services/sqliteQueue';
import { OfflineIncidentRecord } from '../types/models';
import { RootStackParamList } from '../types/navigation';

export const OfflineEmergencyModeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [isOffline, setIsOffline] = useState<boolean>(true);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [incidents, setIncidents] = useState<OfflineIncidentRecord[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  const loadData = async () => {
    try {
      const online = await isDeviceOnline();
      setIsOffline(!online);

      const rows = await getOfflineIncidents();
      setIncidents(rows || []);

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low
      }).catch(() => null);

      if (loc) {
        setCurrentCoords({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude
        });
      }
    } catch (err) {
      console.warn('Offline mode init notice:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to sync events (e.g. "Connection restored. Syncing emergency incidents...")
    const unsubSync = addSyncListener((message, syncing) => {
      setSyncStatusMsg(message);
      setIsSyncing(syncing);
      if (!syncing) {
        loadData();
      }
    });

    // Listen to network changes via expo-network
    let netSub: { remove: () => void } | null = null;
    try {
      netSub = Network.addNetworkStateListener((state) => {
        setIsOffline(!state.isConnected || !state.isInternetReachable);
      });
    } catch (err) {
      console.warn('Network listener error:', err);
    }

    return () => {
      unsubSync();
      if (netSub) {
        netSub.remove();
      }
    };
  }, []);

  const handle1TapEmergencySOS = async () => {
    setIsCapturing(true);
    try {
      // 1-Tap SOS instant persistence in SQLite
      const record = await enqueueOfflineIncident({
        localImageUri: 'emergency_sos_beacon',
        latitude: currentCoords?.lat ?? null,
        longitude: currentCoords?.lng ?? null,
        severity: 'CRITICAL',
        confidence: 0.99,
        crackCount: 1,
        dimensions: 'Emergency Hazard',
        status: 'Cloud AI analysis pending.',
        detectionsJson: JSON.stringify([{ type: '1TAP_OFFLINE_SOS', timestamp: new Date().toISOString() }])
      });

      await loadData();

      Alert.alert(
        'EMERGENCY INCIDENT RECORDED',
        `Evidence logged in SQLite storage (ID: ${record.id}).\n\nStatus: Cloud AI analysis pending.\nGPS: ${
          currentCoords ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}` : 'Location unavailable'
        }\n\nThis incident persists permanently on this device and will automatically sync once connectivity returns.`,
        [
          { text: 'View Queue', onPress: () => navigation.navigate('OfflineIncidentQueue') },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (err) {
      Alert.alert('Notice', 'Failed to write emergency incident to SQLite.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleLaunchCamera = () => {
    navigation.navigate('CameraCapture', { inspectionMode: 'OFFLINE' });
  };

  const pendingCount = incidents.filter((i) => i.is_synced === 0).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Offline Emergency Mode" showBack={true} showEmergencyButton={false} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Live Sync Status Banner */}
        {syncStatusMsg && (
          <View
            style={[
              styles.syncBanner,
              isSyncing ? styles.syncBannerActive : styles.syncBannerInfo
            ]}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={styles.syncSpinner} />
            ) : (
              <Ionicons
                name="information-circle"
                size={18}
                color="#FFFFFF"
                style={styles.syncSpinner}
              />
            )}
            <Text style={styles.syncBannerText}>{syncStatusMsg}</Text>
          </View>
        )}

        {/* Offline Emergency Mode Banner */}
        <View style={styles.emergencyBanner}>
          <Ionicons name="warning" size={24} color="#FFFFFF" style={styles.bannerIcon} />
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>OFFLINE EMERGENCY MODE</Text>
            <Text style={styles.bannerSubtitle}>
              Zero-connectivity active. All captures are permanently saved to FileSystem & SQLite
              with status "Cloud AI analysis pending."
            </Text>
          </View>
        </View>

        {/* 1-Tap SOS Hero Button */}
        <View style={styles.buttonWrapper}>
          <Pressable
            style={styles.bigSOSButton}
            onPress={handle1TapEmergencySOS}
            disabled={isCapturing}
            accessibilityRole="button"
            accessibilityLabel="Instant 1-Tap Emergency SOS"
          >
            {isCapturing ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="alert-circle" size={56} color="#FFFFFF" />
                <Text style={styles.bigSOSTitle}>1-TAP SOS</Text>
                <Text style={styles.bigSOSSubtitle}>LOG STRUCTURAL HAZARD</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Local Telemetry & Queue Status */}
        <Card variant="hazard" style={styles.card}>
          <Text style={styles.cardHeader}>OFFLINE TELEMETRY & PERSISTENCE</Text>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Network State:</Text>
            <Text style={styles.dataHazard}>
              {isOffline ? 'NO INTERNET (OFFLINE)' : 'ONLINE'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Device GPS:</Text>
            <Text style={styles.dataValue}>
              {currentCoords
                ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`
                : 'Location unavailable'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Queued in SQLite:</Text>
            <Text style={styles.dataWarning}>
              {pendingCount} Incidents Pending Sync
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Storage Status:</Text>
            <Text style={styles.dataValue}>
              Cloud AI analysis pending.
            </Text>
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={styles.cameraBtn}
            onPress={handleLaunchCamera}
            accessibilityRole="button"
            accessibilityLabel="Capture Offline Camera Evidence"
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.cameraBtnText}>CAPTURE CAMERA EVIDENCE</Text>
          </Pressable>

          <Pressable
            style={styles.queueBtn}
            onPress={() => navigation.navigate('OfflineIncidentQueue')}
            accessibilityRole="button"
            accessibilityLabel="Open Offline Incident Queue"
          >
            <Ionicons name="list" size={20} color="#38BDF8" style={styles.btnIcon} />
            <Text style={styles.queueBtnText}>
              VIEW SQLITE QUEUE ({pendingCount})
            </Text>
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
    paddingBottom: 40,
    alignItems: 'center'
  },
  emergencyBanner: {
    width: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6
  },
  bannerIcon: {
    marginRight: 12
  },
  bannerTextWrap: {
    flex: 1
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  bannerSubtitle: {
    color: '#FEE2E2',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15
  },
  buttonWrapper: {
    marginVertical: 12,
    alignItems: 'center'
  },
  bigSOSButton: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#DC2626',
    borderWidth: 6,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 12
  },
  bigSOSTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
    marginTop: 6
  },
  bigSOSSubtitle: {
    color: '#FEE2E2',
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 2
  },
  card: {
    width: '100%',
    padding: 16,
    marginVertical: 20
  },
  cardHeader: {
    color: '#FCA5A5',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 10
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
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
    fontWeight: '700'
  },
  dataHazard: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900'
  },
  dataWarning: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '800'
  },
  actions: {
    width: '100%',
    gap: 12
  },
  cameraBtn: {
    minHeight: 52,
    backgroundColor: '#0284C7',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  queueBtn: {
    minHeight: 52,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnIcon: {
    marginRight: 8
  },
  cameraBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8
  },
  queueBtnText: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8
  },
  syncBanner: {
    width: '100%',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  syncBannerActive: {
    backgroundColor: '#0284C7',
    borderWidth: 1,
    borderColor: '#38BDF8'
  },
  syncBannerInfo: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155'
  },
  syncSpinner: {
    marginRight: 8
  },
  syncBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1
  }
});
