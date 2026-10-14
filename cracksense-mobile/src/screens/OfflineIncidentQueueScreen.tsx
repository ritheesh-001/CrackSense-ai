import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  addSyncListener,
  isDeviceOnline,
  syncPendingIncidents
} from '../services/offlineSync';
import { deleteOfflineIncident, getOfflineIncidents } from '../services/sqliteQueue';
import { OfflineIncidentRecord } from '../types/models';

export const OfflineIncidentQueueScreen: React.FC = () => {
  const { user } = useAuth();

  const [incidents, setIncidents] = useState<OfflineIncidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusBanner, setSyncStatusBanner] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const rows = await getOfflineIncidents();
      setIncidents(rows || []);
    } catch (err) {
      console.warn('Could not read SQLite queue:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = addSyncListener((status, syncing) => {
      setSyncStatusBanner(status);
      setIsSyncing(syncing);
      if (!syncing) {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    const online = await isDeviceOnline();
    if (!online) {
      Alert.alert(
        'Offline',
        'Device has no active internet connection. Please connect to Wi-Fi or Cellular to sync incidents.'
      );
      return;
    }

    setIsSyncing(true);
    setSyncStatusBanner('Connection restored. Syncing emergency incidents...');

    const res = await syncPendingIncidents(user?.id);
    setIsSyncing(false);
    await loadData();

    if (res.failedCount > 0) {
      Alert.alert(
        'Sync Notice',
        `Synced: ${res.syncedCount}\nFailed: ${res.failedCount}\n\nEvidence for failed items is securely retained locally with status "Sync failed – Retry".`
      );
    } else if (res.syncedCount > 0) {
      Alert.alert(
        'Sync Complete',
        `Successfully uploaded ${res.syncedCount} incidents to InsForge and updated severity via YOLOv8.`
      );
    } else {
      Alert.alert('Queue Up To Date', 'All queued items are already synchronized.');
    }
  };

  const handleDeleteItem = async (id: string, isSynced: boolean) => {
    if (!isSynced) {
      Alert.alert(
        'Action Prohibited',
        'Cannot delete unsynced incident evidence before sync succeeds. Connect to internet and sync first.'
      );
      return;
    }

    Alert.alert('Remove Record', 'Remove this already-synced incident from device SQLite?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteOfflineIncident(id);
          loadData();
        }
      }
    ]);
  };

  const renderIncidentCard = ({ item }: { item: OfflineIncidentRecord }) => {
    const isSynced = item.is_synced === 1;
    const isImageFile = item.local_image_path && item.local_image_path.startsWith('file://');
    const hasLocation = item.latitude !== null && item.longitude !== null;

    let statusColor = '#F59E0B'; // Amber default for pending
    if (isSynced) statusColor = '#10B981'; // Green for synced
    if (item.status && item.status.includes('Retry')) statusColor = '#EF4444'; // Red for retry

    return (
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.idWrap}>
            <Text style={styles.incidentId}>{item.id}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleDateString()} •{' '}
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          <StatusBadge severity={item.severity} size="small" />
        </View>

        <View style={styles.cardBody}>
          {isImageFile && (
            <Image
              source={{ uri: item.local_image_path }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          )}

          <View style={styles.detailsWrap}>
            <Text style={styles.detailText}>
              GPS:{' '}
              {hasLocation
                ? `${item.latitude!.toFixed(4)}, ${item.longitude!.toFixed(4)}`
                : 'Location unavailable'}
            </Text>
            <Text style={styles.detailText}>Dimensions: {item.dimensions}</Text>
            <Text style={styles.detailText}>Confidence: {Math.round(item.confidence * 100)}%</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isSynced ? 'Synced to Cloud' : item.status || 'Cloud AI analysis pending.'}
            </Text>
          </View>

          {isSynced && (
            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDeleteItem(item.id, isSynced)}
              accessibilityRole="button"
              accessibilityLabel="Delete synced item"
            >
              <Ionicons name="trash-outline" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </Card>
    );
  };

  const pendingCount = incidents.filter((i) => i.is_synced === 0).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Offline Incident Queue" showBack={true} />

      {/* Sync Status Live Notification */}
      {syncStatusBanner && (
        <View
          style={[
            styles.syncBanner,
            syncStatusBanner.includes('Retry') || syncStatusBanner.includes('failed')
              ? styles.syncBannerError
              : null
          ]}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.bannerIcon} />
          ) : (
            <Ionicons name="information-circle" size={18} color="#FFFFFF" style={styles.bannerIcon} />
          )}
          <Text style={styles.syncBannerText}>{syncStatusBanner}</Text>
        </View>
      )}

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Persistent SQLite Store</Text>
          <Text style={styles.headerSubtitle}>
            {pendingCount} pending • {incidents.length} total local records
          </Text>
        </View>

        <Pressable
          style={[styles.syncAllBtn, isSyncing && styles.syncAllBtnDisabled]}
          onPress={handleManualSync}
          disabled={isSyncing}
          accessibilityRole="button"
          accessibilityLabel="Synchronize All Offline Incidents"
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={16} color="#FFFFFF" style={styles.syncBtnIcon} />
              <Text style={styles.syncAllText}>SYNC ALL</Text>
            </>
          )}
        </Pressable>
      </View>

      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id}
        renderItem={renderIncidentCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#38BDF8"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.emptyText}>Loading persistent incidents...</Text>
            </View>
          ) : (
            <View style={styles.centerBox}>
              <Ionicons name="file-tray" size={54} color="#475569" />
              <Text style={styles.emptyTitle}>SQLite Queue Empty</Text>
              <Text style={styles.emptySubtitle}>
                No incidents pending synchronization. Offline captures will appear here.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  syncBanner: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  syncBannerError: {
    backgroundColor: '#DC2626'
  },
  bannerIcon: {
    marginRight: 8
  },
  syncBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    flex: 1
  },
  headerBar: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  syncAllBtn: {
    minHeight: 46,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  syncAllBtnDisabled: {
    opacity: 0.6
  },
  syncBtnIcon: {
    marginRight: 6
  },
  syncAllText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8
  },
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  card: {
    marginVertical: 6,
    padding: 14
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  idWrap: {
    flex: 1
  },
  incidentId: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700'
  },
  timestamp: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#000000',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  detailsWrap: {
    flex: 1
  },
  detailText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700'
  },
  deleteBtn: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  centerBox: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 12
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center'
  }
});
