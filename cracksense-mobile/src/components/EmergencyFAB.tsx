import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

export const EmergencyFAB: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.fabContainer} pointerEvents="box-none">
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('OfflineEmergencyMode')}
        accessibilityRole="button"
        accessibilityLabel="Emergency SOS Mode Quick Action"
      >
        <Ionicons name="flame" size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>SOS</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 999
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FECACA'
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: -2
  }
});
