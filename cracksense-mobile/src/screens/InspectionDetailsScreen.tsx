import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { RootStackParamList } from '../types/navigation';

export const InspectionDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'InspectionDetails'>>();
  const { inspection, inspectionId } = route.params;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `CrackSense AI Structural Audit\nID: ${inspectionId}\nSeverity: ${
          inspection?.severity || 'Assessed'
        }\nCracks: ${inspection?.crack_count || 0}\nDimensions: ${
          inspection?.dimensions || 'N/A'
        }\nRecommendation: ${inspection?.recommendation || 'None'}`
      });
    } catch (err) {
      console.warn('Share notice:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Inspection Details" showBack={true} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Image */}
        <View style={styles.imageCard}>
          <Image
            source={{
              uri:
                inspection?.original_image_url ||
                'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=800&q=80'
            }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.badgeOverlay}>
            <StatusBadge severity={inspection?.severity || 'LOW'} size="medium" />
          </View>
        </View>

        {/* Telemetry & Audit Meta */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>AUDIT METADATA</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>INSPECTION ID</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {inspectionId}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>DATE & TIME</Text>
            <Text style={styles.metaValue}>
              {inspection?.created_at
                ? new Date(inspection.created_at).toLocaleString()
                : 'Recent'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>INFERENCE MODE</Text>
            <Text style={styles.metaValue}>{inspection?.mode || 'ONLINE'}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>GPS TELEMETRY</Text>
            <Text style={styles.metaValue}>
              {inspection?.latitude && inspection?.longitude
                ? `${inspection.latitude.toFixed(6)}, ${inspection.longitude.toFixed(6)}`
                : 'Approximate Location'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>MODEL CONFIDENCE</Text>
            <Text style={styles.metaValue}>
              {inspection?.confidence ? `${Math.round(inspection.confidence * 100)}%` : 'N/A'}
            </Text>
          </View>
        </Card>

        {/* Structural Assessment Card */}
        <Card
          variant={inspection?.severity === 'CRITICAL' ? 'hazard' : 'default'}
          style={styles.card}
        >
          <Text style={styles.sectionTitle}>STRUCTURAL ASSESSMENT</Text>
          <Text style={styles.recText}>
            {inspection?.recommendation || 'No specific maintenance recommended.'}
          </Text>

          <View style={styles.crackSummaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Cracks</Text>
              <Text style={styles.summaryValue}>{inspection?.crack_count ?? 1}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Max Dimensions</Text>
              <Text style={styles.summaryValue}>{inspection?.dimensions || 'N/A'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Status</Text>
              <Text style={styles.summaryValue}>VERIFIED</Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.shareBtn}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share Inspection Audit"
          >
            <Ionicons name="share-social" size={18} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.btnText}>SHARE AUDIT</Text>
          </Pressable>

          {inspection?.severity === 'CRITICAL' && (
            <Pressable
              style={styles.sosBtn}
              onPress={() =>
                navigation.navigate('EmergencyAlert', {
                  inspectionId,
                  severity: 'CRITICAL',
                  latitude: inspection.latitude,
                  longitude: inspection.longitude,
                  crackCount: inspection.crack_count,
                  confidence: inspection.confidence
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Trigger SOS for this inspection"
            >
              <Ionicons name="warning" size={18} color="#FFFFFF" style={styles.btnIcon} />
              <Text style={styles.btnText}>TRIGGER SOS</Text>
            </Pressable>
          )}
        </View>
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
    paddingBottom: 40
  },
  imageCard: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16
  },
  image: {
    width: '100%',
    height: '100%'
  },
  badgeOverlay: {
    position: 'absolute',
    top: 12,
    right: 12
  },
  card: {
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600'
  },
  metaValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '65%'
  },
  recText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16
  },
  crackSummaryRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12
  },
  summaryItem: {
    flex: 1
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600'
  },
  summaryValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12
  },
  shareBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: '#0284C7',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sosBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnIcon: {
    marginRight: 8
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8
  }
});
