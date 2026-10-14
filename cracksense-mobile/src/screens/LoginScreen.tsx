import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        navigation.replace('MainTabs');
      } else {
        setErrorMessage(res.error || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const prefill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={40} color="#38BDF8" />
            </View>
            <Text style={styles.title}>Inspector Sign In</Text>
            <Text style={styles.subtitle}>
              Authenticate with InsForge Cloud to sync offline inspections & emergency alerts
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#F87171" style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Card style={styles.formCard}>
            <Text style={styles.inputLabel}>OFFICIAL EMAIL</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="inspector@cracksense.ai"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.inputLabel}>PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <Pressable
              style={[styles.submitButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Sign in button"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>SIGN IN TO CRACKSENSE</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            {/* Quick prefill helpers */}
            <View style={styles.prefillSection}>
              <Text style={styles.prefillTitle}>Demo Credentials:</Text>
              <View style={styles.prefillRow}>
                <Pressable
                  style={styles.prefillBadge}
                  onPress={() => prefill('inspector@cracksense.ai', 'Password123!')}
                >
                  <Text style={styles.prefillBadgeText}>Inspector Demo</Text>
                </Pressable>
                <Pressable
                  style={styles.prefillBadge}
                  onPress={() => prefill('authority@cracksense.ai', 'Password123!')}
                >
                  <Text style={styles.prefillBadgeText}>Authority Demo</Text>
                </Pressable>
              </View>
            </View>
          </Card>

          <View style={styles.registerPrompt}>
            <Text style={styles.promptText}>New Inspector or Municipal Authority?</Text>
            <Pressable
              style={styles.linkButton}
              onPress={() => navigation.navigate('Register')}
              accessibilityRole="button"
              accessibilityLabel="Register new account"
            >
              <Text style={styles.linkText}>Create Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1
  },
  header: {
    alignItems: 'center',
    marginBottom: 24
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.25)'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  errorIcon: {
    marginRight: 8
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    flex: 1,
    fontWeight: '600'
  },
  formCard: {
    padding: 20
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    marginBottom: 8
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    height: 48
  },
  submitButton: {
    minHeight: 52,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4
  },
  disabledButton: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.8,
    marginRight: 8
  },
  prefillSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16
  },
  prefillTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8
  },
  prefillRow: {
    flexDirection: 'row',
    gap: 8
  },
  prefillBadge: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center'
  },
  prefillBadgeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600'
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8
  },
  promptText: {
    color: '#94A3B8',
    fontSize: 13,
    marginRight: 6
  },
  linkButton: {
    minHeight: 48,
    justifyContent: 'center'
  },
  linkText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700'
  }
});
