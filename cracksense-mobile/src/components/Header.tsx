import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

interface Props {
  title?: string;
  showBack?: boolean;
  showEmergencyButton?: boolean;
}

export const Header: React.FC<Props> = ({
  title = 'CrackSense AI',
  showBack = false,
  showEmergencyButton = true
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack && (
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go Back"
          >
            <Ionicons name="chevron-back" size={24} color="#F8FAFC" />
          </Pressable>
        )}
        <View style={styles.brandRow}>
          <Ionicons name="scan-circle" size={26} color="#38BDF8" style={styles.logoIcon} />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {showEmergencyButton && (
        <Pressable
          style={styles.sosButton}
          onPress={() => navigation.navigate('OfflineEmergencyMode')}
          accessibilityRole="button"
          accessibilityLabel="Open Offline Emergency Mode"
        >
          <Ionicons name="warning" size={18} color="#FFFFFF" style={styles.sosIcon} />
          <Text style={styles.sosText}>SOS MODE</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  backBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoIcon: {
    marginRight: 8
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  sosButton: {
    minHeight: 48,
    minWidth: 48,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F87171',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 5
  },
  sosIcon: {
    marginRight: 6
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8
  }
});
