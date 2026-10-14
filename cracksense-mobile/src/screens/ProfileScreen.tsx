import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/insforge';
import { RootStackParamList } from '../types/navigation';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, setUserProfile } = useAuth();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(user?.name || '');
  const [department, setDepartment] = useState<string>(user?.department || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { profile, error } = await updateUserProfile(user.id, {
        name: name.trim(),
        department: department.trim(),
        phone: phone.trim()
      });

      if (profile) {
        setUserProfile(profile);
        setIsEditing(false);
        Alert.alert('Profile Updated', 'Your profile details were synced with InsForge Cloud.');
      } else {
        Alert.alert('Update Notice', error || 'Failed to update profile.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of CrackSense AI?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }]
          });
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Inspector Profile" showBack={false} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {(user?.name || 'Inspector')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Jane Inspector'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'inspector@cracksense.ai'}</Text>

          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#38BDF8" />
            <Text style={styles.roleText}>{user?.role || 'Inspector'}</Text>
          </View>
        </Card>

        {/* Profile Info / Form */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>OFFICIAL DETAILS</Text>
            <Pressable
              onPress={() => setIsEditing(!isEditing)}
              style={styles.editToggleBtn}
              accessibilityRole="button"
              accessibilityLabel="Toggle Edit Details"
            >
              <Ionicons
                name={isEditing ? 'close' : 'create-outline'}
                size={18}
                color="#38BDF8"
              />
              <Text style={styles.editToggleText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
            </Pressable>
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>DEPARTMENT / JURISDICTION</Text>
              <TextInput
                style={styles.input}
                value={department}
                onChangeText={setDepartment}
                placeholder="e.g. Municipal Public Works"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>EMERGENCY PHONE</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 019-2831"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
              />

              <Pressable
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Save Profile Changes"
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>SAVE PROFILE</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>
                  {user?.department || 'Civil Infrastructure & Highways'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Emergency Contact</Text>
                <Text style={styles.infoValue}>{user?.phone || 'Not Configured'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Status</Text>
                <Text style={[styles.infoValue, { color: '#10B981' }]}>Verified Active</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Backend Connectivity Status */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>CLOUD & STORAGE STATUS</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>InsForge Backend</Text>
            <Text style={styles.infoValue}>Online (US-East)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Database Engine</Text>
            <Text style={styles.infoValue}>PostgreSQL (PostgREST API)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Storage Buckets</Text>
            <Text style={styles.infoValue}>crack-images, inspection-reports</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Token Security</Text>
            <Text style={styles.infoValue}>Hardware SecureStore</Text>
          </View>
        </Card>

        {/* Sign Out Button */}
        <Pressable
          style={styles.logoutBtn}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out of CrackSense AI"
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>SIGN OUT OF CRACKSENSE</Text>
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
    paddingBottom: 110
  },
  userCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#38BDF8'
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900'
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800'
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 10
  },
  roleText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6
  },
  card: {
    padding: 16,
    marginBottom: 16
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: 8
  },
  editToggleText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4
  },
  infoList: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600'
  },
  infoValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right'
  },
  editForm: {
    marginTop: 4
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 46
  },
  saveBtn: {
    minHeight: 48,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8
  },
  logoutBtn: {
    minHeight: 52,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  logoutIcon: {
    marginRight: 8
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8
  }
});
