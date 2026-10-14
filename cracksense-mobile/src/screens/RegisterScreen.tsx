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
import { UserRole } from '../types/models';
import { RootStackParamList } from '../types/navigation';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { register } = useAuth();

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('Inspector');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await register(email.trim(), password, name.trim(), role);
      if (res.success) {
        navigation.replace('MainTabs');
      } else {
        setErrorMessage(res.error || 'Registration failed');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
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
              <Ionicons name="person-add" size={36} color="#38BDF8" />
            </View>
            <Text style={styles.title}>Register Account</Text>
            <Text style={styles.subtitle}>
              Create your CrackSense identity to log structural audits and broadcast emergency alerts
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#F87171" style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Card style={styles.formCard}>
            <Text style={styles.inputLabel}>FULL NAME</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Jane Inspector"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={styles.inputLabel}>OFFICIAL EMAIL</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="jane.inspector@cracksense.ai"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.inputLabel}>PASSWORD (MIN 6 CHARACTERS)</Text>
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

            <Text style={styles.inputLabel}>ACCOUNT ROLE</Text>
            <View style={styles.roleRow}>
              <Pressable
                style={[
                  styles.roleCard,
                  role === 'Inspector' && styles.roleCardActive
                ]}
                onPress={() => setRole('Inspector')}
                accessibilityRole="button"
                accessibilityLabel="Select Inspector Role"
              >
                <Ionicons
                  name="shield"
                  size={20}
                  color={role === 'Inspector' ? '#38BDF8' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.roleCardText,
                    role === 'Inspector' && styles.roleCardTextActive
                  ]}
                >
                  Inspector
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.roleCard,
                  role === 'Authority' && styles.roleCardActive
                ]}
                onPress={() => setRole('Authority')}
                accessibilityRole="button"
                accessibilityLabel="Select Authority / Admin Role"
              >
                <Ionicons
                  name="business"
                  size={20}
                  color={role === 'Authority' ? '#38BDF8' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.roleCardText,
                    role === 'Authority' && styles.roleCardTextActive
                  ]}
                >
                  Authority
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.submitButton, isLoading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Submit Registration"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>CREATE CRACKSENSE ACCOUNT</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </Card>

          <View style={styles.loginPrompt}>
            <Text style={styles.promptText}>Already registered?</Text>
            <Pressable
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel="Go to Login"
            >
              <Text style={styles.linkText}>Sign In Instead</Text>
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
    marginBottom: 20
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.25)'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
    marginBottom: 6
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
    marginTop: 8
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
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 16
  },
  roleCard: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  roleCardActive: {
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.15)'
  },
  roleCardText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8
  },
  roleCardTextActive: {
    color: '#38BDF8',
    fontWeight: '700'
  },
  submitButton: {
    minHeight: 52,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
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
    fontSize: 13,
    letterSpacing: 0.8,
    marginRight: 8
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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
