import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { EmergencyFAB } from '../components/EmergencyFAB';
import { Header } from '../components/Header';
import { OfflineBanner } from '../components/OfflineBanner';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { fetchInspectionsList } from '../services/insforge';
import { getOfflineIncidents } from '../services/sqliteQueue';
import { Inspection } from '../types/models';
import { RootStackParamList } from '../types/navigation';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadDashboardData = async () => {
    try {
      const [inspRes, offlineList] = await Promise.all([
        fetchInspectionsList(10),
        getOfflineIncidents()
      ]);

      const list = inspRes.inspections || [];
      setInspections(list);
      setOfflineCount(offlineList.filter((i) => i.is_synced === 0).length);

      const crit = list.filter((i) => i.severity === 'CRITICAL').length;
      setCriticalCount(crit);
    } catch (err) {
      console.warn('Dashboard load notice:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const renderInspectionItem = ({ item }: { item: Inspection }) => (
    <Pressable
      onPress={() =>
        navigation.navigate('InspectionDetails', {
          inspectionId: item.id,
          inspection: item
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`View inspection ${item.id}`}
    >
      <Card style={styles.inspectionCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.inspectionDate}>
              {new Date(item.created_at).toLocaleDateString()} •{' '}
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            <Text style={styles.inspectionMode}>
              MODE: {item.mode} • LOC: {item.location_status}
            </Text>
          </View>
          <StatusBadge severity={item.severity} size="small" />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Cracks</Text>
            <Text style={styles.metricValue}>{item.crack_count}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Confidence</Text>
            <Text style={styles.metricValue}>
              {Math.round(item.confidence * 100)}%
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Dimensions</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {item.dimensions || 'N/A'}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="CrackSense AI" showEmergencyButton={true} />
      <OfflineBanner
        onPressOfflineAction={() => navigation.navigate('OfflineIncidentQueue')}
      />

      <FlatList
        data={inspections}
        keyExtractor={(item) => item.id}
        renderItem={renderInspectionItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#38BDF8"
          />
        }
        ListHeaderComponent={
          <>
            {/* User welcome card */}
            <View style={styles.welcomeRow}>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.userName}>{user?.name || 'Inspector'}</Text>
              </View>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#38BDF8" />
                <Text style={styles.roleText}>{user?.role || 'Inspector'}</Text>
              </View>
            </View>

            {/* Metrics cards */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statNumber}>{inspections.length}</Text>
                <Text style={styles.statTitle}>Total Inspections</Text>
              </Card>

              <Card style={[styles.statCard, styles.criticalStat]}>
                <Text style={[styles.statNumber, styles.criticalText]}>
                  {criticalCount}
                </Text>
                <Text style={styles.statTitle}>Critical Hazards</Text>
              </Card>

              <Pressable
                style={styles.statCardWrapper}
                onPress={() => navigation.navigate('OfflineIncidentQueue')}
              >
                <Card style={[styles.statCard, offlineCount > 0 && styles.warningStat]}>
                  <Text
                    style={[
                      styles.statNumber,
                      offlineCount > 0 && styles.warningText
                    ]}
                  >
                    {offlineCount}
                  </Text>
                  <Text style={styles.statTitle}>Offline Queued</Text>
                </Card>
              </Pressable>
            </View>

            {/* Primary Action Button: Start Inspection */}
            <Pressable
              style={styles.startBtn}
              onPress={() => navigation.navigate('StartInspection')}
              accessibilityRole="button"
              accessibilityLabel="Start New Inspection"
            >
              <View style={styles.startBtnLeft}>
                <View style={styles.startBtnIconCircle}>
                  <Ionicons name="camera" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.startBtnTitle}>START NEW INSPECTION</Text>
                  <Text style={styles.startBtnSubtitle}>
                    Real-time YOLOv8 AI fissure analysis
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </Pressable>

            {/* Offline SOS Banner Card */}
            <Pressable
              onPress={() => navigation.navigate('OfflineEmergencyMode')}
              accessibilityRole="button"
              accessibilityLabel="Launch Offline Emergency Mode"
            >
              <Card variant="hazard" style={styles.emergencyCard}>
                <View style={styles.emergencyContent}>
                  <Ionicons name="warning" size={32} color="#EF4444" />
                  <View style={styles.emergencyTextWrap}>
                    <Text style={styles.emergencyTitle}>
                      OFFLINE EMERGENCY SOS MODE
                    </Text>
                    <Text style={styles.emergencySubtitle}>
                      Zero-connectivity instant structural hazard broadcast & local queuing
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>

            {/* Recent Inspections Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent AI Inspections</Text>
              <Pressable
                onPress={() => navigation.navigate('InspectionHistory')}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>View All</Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.emptyText}>Loading inspections from cloud...</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={48} color="#475569" />
              <Text style={styles.emptyText}>No inspection records found.</Text>
              <Text style={styles.emptySubText}>
                Tap "Start New Inspection" above to analyze your first surface.
              </Text>
            </View>
          )
        }
      />

      <EmergencyFAB />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  listContent: {
    padding: 16,
    paddingBottom: 110
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  greeting: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500'
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  roleText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  statCardWrapper: {
    flex: 1
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginVertical: 4
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC'
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4
  },
  criticalStat: {
    borderColor: '#7F1D1D'
  },
  criticalText: {
    color: '#F87171'
  },
  warningStat: {
    borderColor: '#B45309'
  },
  warningText: {
    color: '#FBBF24'
  },
  startBtn: {
    minHeight: 64,
    backgroundColor: '#0284C7',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4
  },
  startBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  startBtnIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  startBtnTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5
  },
  startBtnSubtitle: {
    color: '#BAE6FD',
    fontSize: 12,
    marginTop: 2
  },
  emergencyCard: {
    marginVertical: 8
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  emergencyTextWrap: {
    marginLeft: 12,
    flex: 1
  },
  emergencyTitle: {
    color: '#FCA5A5',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5
  },
  emergencySubtitle: {
    color: '#F87171',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800'
  },
  seeAllBtn: {
    minHeight: 48,
    justifyContent: 'center'
  },
  seeAllText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600'
  },
  inspectionCard: {
    marginVertical: 6
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  inspectionDate: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700'
  },
  inspectionMode: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10
  },
  metricItem: {
    flex: 1
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500'
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center'
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12
  },
  emptySubText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4
  }
});
