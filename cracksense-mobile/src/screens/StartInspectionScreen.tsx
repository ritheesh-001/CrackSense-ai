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
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { RootStackParamList } from '../types/navigation';

export const StartInspectionScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [mode, setMode] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'locked' | 'unavailable'>(
    'acquiring'
  );

  useEffect(() => {
    async function requestLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setGpsStatus('unavailable');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        setGpsLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy
        });
        setGpsStatus('locked');
      } catch (err) {
        console.warn('GPS location lock notice:', err);
        setGpsStatus('unavailable');
      }
    }
    requestLocation();
  }, []);

  const handleLaunchCamera = () => {
    navigation.navigate('CameraCapture', { inspectionMode: mode });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Start Inspection" showBack={true} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Inspection Protocol</Text>
          <Text style={styles.bannerSubtitle}>
            Calibrate capture parameters for high-precision millimeter fissure detection.
          </Text>
        </View>

        {/* GPS Sensor Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusIconCircle}>
              <Ionicons
                name={gpsStatus === 'locked' ? 'location' : 'location-outline'}
                size={22}
                color={gpsStatus === 'locked' ? '#10B981' : '#F59E0B'}
              />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusLabel}>GPS SENSOR STATUS</Text>
              {gpsStatus === 'locked' && gpsLocation ? (
                <Text style={styles.statusValue}>
                  {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                </Text>
              ) : gpsStatus === 'acquiring' ? (
                <View style={styles.acquiringRow}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={styles.acquiringText}>Locking satellite telemetry...</Text>
                </View>
              ) : (
                <Text style={styles.unavailableText}>
                  Location unavailable (Using fallback offline tags)
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Inference Mode Toggle */}
        <Text style={styles.sectionTitle}>SELECT INFERENCE MODE</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeCard, mode === 'ONLINE' && styles.modeCardActive]}
            onPress={() => setMode('ONLINE')}
            accessibilityRole="button"
            accessibilityLabel="Select Online AI Mode"
          >
            <Ionicons
              name="cloud-upload"
              size={24}
              color={mode === 'ONLINE' ? '#38BDF8' : '#94A3B8'}
            />
            <Text style={[styles.modeCardTitle, mode === 'ONLINE' && styles.modeCardTitleActive]}>
              Cloud YOLOv8
            </Text>
            <Text style={styles.modeCardDesc}>
              Real-time server inference, auto-cloud sync to InsForge.
            </Text>
          </Pressable>

          <Pressable
            style={[styles.modeCard, mode === 'OFFLINE' && styles.modeCardHazard]}
            onPress={() => setMode('OFFLINE')}
            accessibilityRole="button"
            accessibilityLabel="Select Offline Edge Mode"
          >
            <Ionicons
              name="hardware-chip"
              size={24}
              color={mode === 'OFFLINE' ? '#EF4444' : '#94A3B8'}
            />
            <Text
              style={[
                styles.modeCardTitle,
                mode === 'OFFLINE' && styles.modeCardTitleHazard
              ]}
            >
              Offline Edge
            </Text>
            <Text style={styles.modeCardDesc}>
              Zero-signal caching in SQLite with delayed cloud sync.
            </Text>
          </Pressable>
        </View>

        {/* Quality Guidelines */}
        <Card style={styles.guidelinesCard}>
          <Text style={styles.guidelinesTitle}>Capture Checklist</Text>
          <View style={styles.guideItem}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.guideIcon} />
            <Text style={styles.guideText}>Keep camera perpendicular (90°) to the fissure plane.</Text>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.guideIcon} />
            <Text style={styles.guideText}>Optimal inspection distance is 30cm to 60cm.</Text>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.guideIcon} />
            <Text style={styles.guideText}>Ensure uniform illumination; activate torch if shadowed.</Text>
          </View>
        </Card>

        {/* Launch Camera Button */}
        <Pressable
          style={styles.launchBtn}
          onPress={handleLaunchCamera}
          accessibilityRole="button"
          accessibilityLabel="Open Inspection Camera"
        >
          <Ionicons name="camera" size={22} color="#FFFFFF" style={styles.btnIcon} />
          <Text style={styles.launchBtnText}>OPEN INSPECTION CAMERA</Text>
        </Pressable>
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
  banner: {
    marginBottom: 16
  },
  bannerTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800'
  },
  bannerSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18
  },
  statusCard: {
    padding: 14,
    marginBottom: 20
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  statusTextWrap: {
    flex: 1
  },
  statusLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  statusValue: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2
  },
  acquiringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  acquiringText: {
    color: '#F59E0B',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600'
  },
  unavailableText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 14,
    minHeight: 120
  },
  modeCardActive: {
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.15)'
  },
  modeCardHazard: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)'
  },
  modeCardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4
  },
  modeCardTitleActive: {
    color: '#38BDF8'
  },
  modeCardTitleHazard: {
    color: '#F87171'
  },
  modeCardDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15
  },
  guidelinesCard: {
    padding: 16,
    marginBottom: 24
  },
  guidelinesTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  guideIcon: {
    marginRight: 8,
    marginTop: 2
  },
  guideText: {
    color: '#CBD5E1',
    fontSize: 13,
    flex: 1,
    lineHeight: 18
  },
  launchBtn: {
    minHeight: 56,
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
  btnIcon: {
    marginRight: 10
  },
  launchBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.8
  }
});
