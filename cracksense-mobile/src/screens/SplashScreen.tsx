import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated, isLoading } = useAuth();
  const hasNavigated = React.useRef(false);

  const navigateForward = React.useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    if (isAuthenticated) {
      navigation.replace('MainTabs');
    } else {
      navigation.replace('Login');
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    // Hard fallback: never stay on the splash screen for more than 2 seconds
    const fallbackTimer = setTimeout(() => {
      navigateForward();
    }, 2000);

    if (!isLoading) {
      const normalTimer = setTimeout(() => {
        navigateForward();
      }, 500);

      return () => {
        clearTimeout(normalTimer);
        clearTimeout(fallbackTimer);
      };
    }

    return () => clearTimeout(fallbackTimer);
  }, [isLoading, navigateForward]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerBox}>
        <View style={styles.iconCircle}>
          <Ionicons name="scan-circle" size={80} color="#38BDF8" />
        </View>
        <Text style={styles.title}>CrackSense AI</Text>
        <Text style={styles.subtitle}>
          Structural Health Monitoring & Emergency Crack Intelligence
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Initializing secure engine...</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>v1.0.0 • Connected to InsForge Cloud</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: 40
  },
  loadingContainer: {
    alignItems: 'center'
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 12,
    fontWeight: '500'
  },
  footer: {
    paddingBottom: 16
  },
  footerText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500'
  }
});
