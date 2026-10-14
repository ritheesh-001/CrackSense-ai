import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addSyncListener, isDeviceOnline } from '../services/offlineSync';

interface Props {
  onPressOfflineAction?: () => void;
  forceShow?: boolean;
}

export const OfflineBanner: React.FC<Props> = ({ onPressOfflineAction, forceShow }) => {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('OFFLINE EMERGENCY MODE');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    async function checkConn() {
      const online = await isDeviceOnline();
      setIsOffline(!online);
      if (!online) {
        setSyncStatusText('OFFLINE EMERGENCY MODE');
      }
    }
    checkConn();

    const unsubscribe = addSyncListener((status, syncing) => {
      setSyncStatusText(status);
      setIsSyncing(syncing);
      if (syncing) {
        setIsOffline(true); // Keep banner visible while syncing
      } else {
        isDeviceOnline().then((on) => setIsOffline(!on));
      }
    });

    const interval = setInterval(checkConn, 7000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (!isOffline && !forceShow && !isSyncing) {
    return null;
  }

  return (
    <Pressable
      style={[styles.container, isSyncing && styles.syncingContainer]}
      onPress={onPressOfflineAction}
      accessibilityRole="button"
      accessibilityLabel={syncStatusText}
    >
      <View style={styles.leftRow}>
        {isSyncing ? (
          <ActivityIndicator size="small" color="#FFFFFF" style={styles.icon} />
        ) : (
          <Ionicons name="cloud-offline" size={20} color="#F59E0B" style={styles.icon} />
        )}
        <Text style={styles.text} numberOfLines={1}>
          {syncStatusText}
        </Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{isSyncing ? 'Syncing...' : 'View Queue'}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#78350F',
    borderBottomWidth: 1,
    borderBottomColor: '#B45309',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  syncingContainer: {
    backgroundColor: '#0369A1',
    borderBottomColor: '#0284C7'
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  icon: {
    marginRight: 8
  },
  text: {
    color: '#FEF3C7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    flex: 1
  },
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  }
});
