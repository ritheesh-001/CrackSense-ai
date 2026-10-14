import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  LayoutChangeEvent,
  Pressable,
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
import { DetectionItem } from '../types/models';
import { RootStackParamList } from '../types/navigation';

export const DetectionResultScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'DetectionResult'>>();
  const {
    imageUri,
    uploadedImageUrl,
    yoloResult,
    latitude,
    longitude,
    timestamp,
    mode = 'ONLINE'
  } = route.params;

  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0
  });
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0
  });

  useEffect(() => {
    if (imageUri) {
      Image.getSize(
        imageUri,
        (width, height) => {
          setImageSize({ width, height });
        },
        (err) => {
          console.warn('Could not read image intrinsic dimensions:', err);
        }
      );
    }
  }, [imageUri]);

  const onFrameLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const getSeverityActionAdvice = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL':
        return 'Immediate professional structural inspection recommended.';
      case 'MEDIUM':
        return 'Professional structural inspection recommended.';
      case 'LOW':
      default:
        return 'Monitor periodically.';
    }
  };

  const handleProceed = () => {
    navigation.navigate('SeverityResult', {
      imageUri,
      uploadedImageUrl,
      yoloResult,
      latitude,
      longitude,
      timestamp,
      mode
    });
  };

  // Render bounding box overlays on top of the image
  const renderBoundingBoxes = () => {
    if (
      containerSize.width === 0 ||
      containerSize.height === 0 ||
      imageSize.width === 0 ||
      imageSize.height === 0
    ) {
      return null;
    }

    const scaleX = containerSize.width / imageSize.width;
    const scaleY = containerSize.height / imageSize.height;

    return yoloResult.detections.map((item, idx) => {
      const [x1, y1, x2, y2] = item.bbox;
      const left = Math.max(0, x1 * scaleX);
      const top = Math.max(0, y1 * scaleY);
      const width = Math.min(containerSize.width - left, Math.max(8, (x2 - x1) * scaleX));
      const height = Math.min(containerSize.height - top, Math.max(8, (y2 - y1) * scaleY));

      return (
        <View
          key={`box_${idx}`}
          style={[
            styles.bboxOverlay,
            {
              left,
              top,
              width,
              height
            }
          ]}
        >
          <View style={styles.bboxTag}>
            <Text style={styles.bboxTagText}>{item.dimensions}</Text>
          </View>
        </View>
      );
    });
  };

  const renderDetectionItem = ({ item, index }: { item: DetectionItem; index: number }) => (
    <Card style={styles.detectionCard}>
      <View style={styles.detectionHeader}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexBadgeText}>FISSURE #{index + 1}</Text>
        </View>
        <Text style={styles.dimText}>{item.dimensions}</Text>
        <Text style={styles.confText}>{Math.round(item.confidence * 100)}% Conf</Text>
      </View>
      <Text style={styles.bboxCoords}>
        Coordinates [x1, y1, x2, y2]: [{item.bbox.map((b) => Math.round(b)).join(', ')}]
      </Text>
    </Card>
  );

  const adviceText = getSeverityActionAdvice(yoloResult.severity);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Detection Result" showBack={true} />

      <FlatList
        data={yoloResult.detections}
        keyExtractor={(_, i) => `det_${i}`}
        renderItem={renderDetectionItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Mandatory Regulatory & Risk Disclaimer */}
            <View style={styles.disclaimerBanner}>
              <Ionicons name="information-circle" size={18} color="#38BDF8" style={styles.discIcon} />
              <View style={styles.discTextWrap}>
                <Text style={styles.disclaimerTitle}>
                  AI-based preliminary risk assessment
                </Text>
                <Text style={styles.disclaimerSubtitle}>
                  This automated assessment does not guarantee structural stability. Routine and
                  formal engineering verification is always advised.
                </Text>
              </View>
            </View>

            {/* Visual Image with Real Bounding Box Overlays */}
            <View style={styles.imageContainer} onLayout={onFrameLayout}>
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
              {renderBoundingBoxes()}

              <View style={styles.statusPillOverlay}>
                <StatusBadge severity={yoloResult.severity} size="small" />
              </View>
            </View>

            {/* Metrics Header */}
            <View style={styles.metricsRow}>
              <Card style={styles.metricCard}>
                <Text style={styles.metricVal}>{yoloResult.crackCount}</Text>
                <Text style={styles.metricLbl}>Crack Count</Text>
              </Card>

              <Card style={styles.metricCard}>
                <Text style={styles.metricVal}>
                  {Math.round(yoloResult.confidence * 100)}%
                </Text>
                <Text style={styles.metricLbl}>Confidence Score</Text>
              </Card>

              <Card style={styles.metricCard}>
                <Text style={styles.metricValSmall} numberOfLines={1}>
                  {yoloResult.detections[0]?.dimensions || 'None'}
                </Text>
                <Text style={styles.metricLbl}>Dimensions</Text>
              </Card>
            </View>

            {/* Assessment & Advice Card */}
            <Card
              variant={yoloResult.severity === 'CRITICAL' ? 'hazard' : 'default'}
              style={styles.adviceCard}
            >
              <Text style={styles.adviceHeader}>MANDATED ACTION</Text>
              <Text style={styles.adviceBody}>{adviceText}</Text>
            </Card>

            <View style={styles.listSectionHeader}>
              <Text style={styles.listSectionTitle}>Detected Fissures</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={44} color="#10B981" />
            <Text style={styles.emptyTitle}>No Fissures Detected</Text>
            <Text style={styles.emptyDesc}>
              No surface cracks were detected by the YOLOv8 model at the calibrated confidence
              threshold. {adviceText}
            </Text>
          </Card>
        }
        ListFooterComponent={
          <Pressable
            style={styles.proceedBtn}
            onPress={handleProceed}
            accessibilityRole="button"
            accessibilityLabel="Proceed to Severity Assessment"
          >
            <Text style={styles.proceedBtnText}>VIEW FULL SEVERITY ASSESSMENT</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
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
  listContent: {
    padding: 16,
    paddingBottom: 40
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  discIcon: {
    marginRight: 8,
    marginTop: 2
  },
  discTextWrap: {
    flex: 1
  },
  disclaimerTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  disclaimerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2
  },
  imageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: '#334155',
    marginBottom: 16
  },
  image: {
    width: '100%',
    height: '100%'
  },
  bboxOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 4
  },
  bboxTag: {
    position: 'absolute',
    top: -20,
    left: 0,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  bboxTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800'
  },
  statusPillOverlay: {
    position: 'absolute',
    top: 10,
    right: 10
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginVertical: 0
  },
  metricVal: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900'
  },
  metricValSmall: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800'
  },
  metricLbl: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center'
  },
  adviceCard: {
    padding: 16,
    marginBottom: 16
  },
  adviceHeader: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6
  },
  adviceBody: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20
  },
  listSectionHeader: {
    marginTop: 8,
    marginBottom: 6
  },
  listSectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700'
  },
  detectionCard: {
    padding: 12,
    marginVertical: 4
  },
  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  indexBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155'
  },
  indexBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800'
  },
  dimText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700'
  },
  confText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700'
  },
  bboxCoords: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: 'monospace'
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    marginVertical: 12
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8
  },
  emptyDesc: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  proceedBtn: {
    minHeight: 56,
    backgroundColor: '#0284C7',
    borderRadius: 14,
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
  proceedBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
    marginRight: 8
  }
});
