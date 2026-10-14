import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { addSyncListener, isDeviceOnline, startNetworkAutoSyncWatcher } from '../services/offlineSync';

interface Props {
  onPressBanner?: (action: 'OFFLINE_MODE' | 'QUEUE') => void;
}

export const NetworkSyncBanner: React.FC<Props> = ({ onPressBanner }) => {
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // 1. Initial network check
    isDeviceOnline().then((online) => setIsOffline(!online));

    // 2. Start global network auto-sync watcher
    const stopWatcher = startNetworkAutoSyncWatcher(user?.id);

    // 3. Listen to sync progress events
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubSync = addSyncListener((statusMessage, syncing) => {
      setSyncStatus(statusMessage);
      setIsSyncing(syncing);

      if (dismissTimer) {
        clearTimeout(dismissTimer);
        dismissTimer = null;
      }

      if (statusMessage.includes('successfully') || statusMessage.includes('synchronized')) {
        dismissTimer = setTimeout(() => {
          setSyncStatus(null);
        }, 4000);
      }
    });

    // 4. Network state listener
    let netSub: { remove: () => void } | null = null;
    try {
      netSub = Network.addNetworkStateListener((state) => {
        const offline = !state.isConnected || !state.isInternetReachable;
        setIsOffline(offline);
      });
    } catch (err) {
      console.warn('NetworkSyncBanner listener error:', err);
    }

    return () => {
      stopWatcher();
      unsubSync();
      if (dismissTimer) clearTimeout(dismissTimer);
      if (netSub) netSub.remove();
    };
  }, [user?.id]);

  // If nothing to show (device is online and no sync banner message)
  if (!isOffline && !syncStatus) {
    return null;
  }

  // Determine appearance based on state
  const isError = syncStatus && (syncStatus.includes('Retry') || syncStatus.includes('failed'));
  const isSuccess = syncStatus && syncStatus.includes('successfully');

  const handlePress = () => {
    if (onPressBanner) {
      if (isError || syncStatus) {
        onPressBanner('QUEUE');
      } else {
        onPressBanner('OFFLINE_MODE');
      }
    }
  };

  return (
    <Pressable
      style={[
        styles.banner,
        isError ? styles.bannerError : isSuccess ? styles.bannerSuccess : isSyncing ? styles.bannerSyncing : styles.bannerOffline
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Network Sync Status"
    >
      <View style={styles.contentRow}>
        {isSyncing ? (
          <ActivityIndicator size="small" color="#FFFFFF" style={styles.icon} />
        ) : isError ? (
          <Ionicons name="alert-circle" size={16} color="#FFFFFF" style={styles.icon} />
        ) : isSuccess ? (
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.icon} />
        ) : (
          <Ionicons name="cloud-offline" size={16} color="#FFFFFF" style={styles.icon} />
        )}

        <Text style={styles.bannerText} numberOfLines={1}>
          {syncStatus || 'OFFLINE EMERGENCY MODE'}
        </Text>

        <Ionicons name="chevron-forward" size={14} color="rgba(255, 255, 255, 0.7)" style={styles.chevron} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    paddingVertical: 7,
    paddingHorizontal: 14,
    zIndex: 9999
  },
  bannerOffline: {
    backgroundColor: '#DC2626'
  },
  bannerSyncing: {
    backgroundColor: '#0284C7'
  },
  bannerError: {
    backgroundColor: '#DC2626'
  },
  bannerSuccess: {
    backgroundColor: '#16A34A'
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: {
    marginRight: 6
  },
  bannerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
    flexShrink: 1
  },
  chevron: {
    marginLeft: 6
  }
});
