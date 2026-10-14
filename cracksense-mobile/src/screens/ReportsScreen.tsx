import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { fetchInspectionsList } from '../services/insforge';
import { Inspection } from '../types/models';

export const ReportsScreen: React.FC = () => {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const { inspections: list } = await fetchInspectionsList(50);
      setInspections(list || []);
    } catch (err) {
      console.warn('Reports load notice:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const total = inspections.length;
  const criticalCount = inspections.filter((i) => i.severity === 'CRITICAL').length;
  const mediumCount = inspections.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount = inspections.filter((i) => i.severity === 'LOW').length;

  const generateSingleReportPDF = async (item: Inspection) => {
    setIsExporting(true);
    try {
      const hasLoc = item.latitude !== null && item.longitude !== null;
      let embeddedImage = '';

      if (item.original_image_url) {
        try {
          if (item.original_image_url.startsWith('file://')) {
            const b64 = await FileSystem.readAsStringAsync(item.original_image_url, {
              encoding: 'base64'
            });
            embeddedImage = `<div class="image-wrap"><img src="data:image/jpeg;base64,${b64}" alt="Inspection Evidence" /></div>`;
          } else if (
            item.original_image_url.startsWith('http://') ||
            item.original_image_url.startsWith('https://')
          ) {
            embeddedImage = `<div class="image-wrap"><img src="${item.original_image_url}" alt="Inspection Evidence" /></div>`;
          }
        } catch (imgErr) {
          console.warn('Image embedding error in report:', imgErr);
        }
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #0284c7; font-size: 22px; }
            .header-sub { color: #64748b; font-size: 13px; margin-top: 4px; }
            .badge-row { display: flex; gap: 8px; margin-bottom: 16px; }
            .badge { padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
            .badge-online { background: #e0f2fe; color: #0369a1; }
            .badge-offline { background: #fef3c7; color: #b45309; }
            .badge-crit { background: #fee2e2; color: #dc2626; }
            .badge-med { background: #fef3c7; color: #d97706; }
            .badge-low { background: #dcfce7; color: #15803d; }
            .badge-sos { background: #dc2626; color: #ffffff; }
            .image-wrap { margin-bottom: 20px; text-align: center; }
            .image-wrap img { max-width: 100%; max-height: 320px; border-radius: 8px; border: 1px solid #cbd5e1; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .meta-table th, .meta-table td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12px; text-align: left; }
            .meta-table th { background: #f8fafc; font-weight: 600; width: 35%; }
            .disclaimer { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px; font-size: 11px; color: #166534; margin-top: 24px; }
            .footer { margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CrackSense AI — Structural Health Audit Dossier</h1>
            <div class="header-sub">Inspection ID: ${item.id} • Generated: ${new Date().toLocaleString()}</div>
          </div>

          <div class="badge-row">
            <span class="badge ${item.mode === 'OFFLINE' ? 'badge-offline' : 'badge-online'}">
              ${item.mode === 'OFFLINE' ? 'OFFLINE EMERGENCY SYNC' : 'ONLINE CLOUD AUDIT'}
            </span>
            <span class="badge ${item.severity === 'CRITICAL' ? 'badge-crit' : item.severity === 'MEDIUM' ? 'badge-med' : 'badge-low'}">
              SEVERITY: ${item.severity}
            </span>
            ${item.severity === 'CRITICAL' ? '<span class="badge badge-sos">EMERGENCY SOS: TRIGGERED</span>' : '<span class="badge badge-online">EMERGENCY SOS: NONE</span>'}
          </div>

          ${embeddedImage}

          <table class="meta-table">
            <tr><th>Audit Timestamp</th><td>${new Date(item.created_at).toLocaleString()}</td></tr>
            <tr><th>Inspector</th><td>${user?.name || 'Municipal Field Inspector'} (${user?.email || 'Field ID'})</td></tr>
            <tr><th>GPS Telemetry</th><td>${
              hasLoc
                ? `${item.latitude!.toFixed(6)}, ${item.longitude!.toFixed(6)} (${item.location_status})`
                : 'Location unavailable'
            }</td></tr>
            <tr><th>Crack Count</th><td>${item.crack_count}</td></tr>
            <tr><th>Estimated Dimensions</th><td>${item.dimensions || 'N/A'}</td></tr>
            <tr><th>AI Confidence Score</th><td>${Math.round(item.confidence * 100)}%</td></tr>
            <tr><th>Mandated Action</th><td><strong>${item.recommendation || 'Standard monitoring'}</strong></td></tr>
          </table>

          <div class="disclaimer">
            <strong>AI-based preliminary risk assessment</strong><br/>
            This visual machine-learning assessment identifies preliminary crack geometry and structural defect markers. Automated analysis does not certify complete building safety; official on-site civil engineering inspections remain authoritative.
          </div>

          <div class="footer">
            CrackSense AI • Confidential Municipal Engineering Document • Powered by InsForge BaaS
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('PDF Generated', `Report saved to: ${uri}`);
      }
    } catch (err) {
      Alert.alert('Export Error', 'Could not generate inspection PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportComprehensivePDF = async () => {
    setIsExporting(true);
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; }
            h1 { color: #0284c7; margin: 0; font-size: 22px; }
            .header-meta { color: #64748b; font-size: 13px; margin: 4px 0 20px 0; }
            .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .summary-table th, .summary-table td { border: 1px solid #cbd5e1; padding: 10px; font-size: 12px; text-align: left; }
            .summary-table th { background: #f8fafc; font-weight: 600; }
            .badge-crit { color: #dc2626; font-weight: bold; }
            .badge-med { color: #d97706; font-weight: bold; }
            .badge-low { color: #15803d; font-weight: bold; }
            .disclaimer { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px; font-size: 11px; color: #166534; margin: 20px 0; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <h1>CrackSense AI — Master Infrastructure Audit Report</h1>
          <div class="header-meta">Generated: ${new Date().toLocaleString()} • Inspector: ${user?.name || 'Inspector'}</div>

          <h2>Summary Statistics</h2>
          <table class="summary-table">
            <tr><th>Total Audits</th><td>${total}</td></tr>
            <tr><th>Critical Structural Hazards</th><td class="badge-crit">${criticalCount}</td></tr>
            <tr><th>Moderate Surface Damage</th><td class="badge-med">${mediumCount}</td></tr>
            <tr><th>Low / Baseline Fissures</th><td class="badge-low">${lowCount}</td></tr>
          </table>

          <h2>Inspection Log Table</h2>
          <table class="summary-table">
            <tr>
              <th>Date</th>
              <th>Mode</th>
              <th>Severity</th>
              <th>GPS Coordinates</th>
              <th>Dimensions</th>
              <th>Action</th>
            </tr>
            ${inspections
              .slice(0, 25)
              .map(
                (i) => `
                <tr>
                  <td>${new Date(i.created_at).toLocaleDateString()}</td>
                  <td>${i.mode}</td>
                  <td><strong>${i.severity}</strong></td>
                  <td>${
                    i.latitude && i.longitude
                      ? `${i.latitude.toFixed(4)}, ${i.longitude.toFixed(4)}`
                      : 'Location unavailable'
                  }</td>
                  <td>${i.dimensions || 'N/A'}</td>
                  <td>${i.recommendation || 'Standard monitor'}</td>
                </tr>
              `
              )
              .join('')}
          </table>

          <div class="disclaimer">
            <strong>AI-based preliminary risk assessment</strong><br/>
            This comprehensive report compiles visual machine-learning inspection outputs. Automated analysis does not certify complete building safety.
          </div>

          <div class="footer">
            CrackSense AI • Certified Cloud Repository: InsForge BaaS • Confidential
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('PDF Dossier Generated', `Saved: ${uri}`);
      }
    } catch (err) {
      Alert.alert('Notice', 'Could not compile comprehensive PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderReportItem = ({ item }: { item: Inspection }) => {
    const hasLoc = item.latitude !== null && item.longitude !== null;

    return (
      <Card style={styles.reportCard}>
        <View style={styles.cardTop}>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.reportId}>ID: {item.id}</Text>
            <Text style={styles.reportDate}>
              {new Date(item.created_at).toLocaleDateString()} •{' '}
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          <StatusBadge severity={item.severity} size="small" />
        </View>

        <View style={styles.badgesRow}>
          <View
            style={[
              styles.modePill,
              item.mode === 'OFFLINE' ? styles.modePillOffline : styles.modePillOnline
            ]}
          >
            <Text style={styles.modePillText}>
              {item.mode === 'OFFLINE' ? 'OFFLINE EMERGENCY SYNC' : 'ONLINE CLOUD AUDIT'}
            </Text>
          </View>

          {item.severity === 'CRITICAL' && (
            <View style={styles.sosPill}>
              <Text style={styles.sosPillText}>EMERGENCY SOS: TRIGGERED</Text>
            </View>
          )}
        </View>

        <View style={styles.detailsBody}>
          <Text style={styles.bodyText}>
            GPS:{' '}
            {hasLoc
              ? `${item.latitude!.toFixed(4)}, ${item.longitude!.toFixed(4)}`
              : 'Location unavailable'}
          </Text>
          <Text style={styles.bodyText}>
            Fissures: {item.crack_count} • Max Dimensions: {item.dimensions || 'N/A'} • Confidence:{' '}
            {Math.round(item.confidence * 100)}%
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Pressable
            style={styles.pdfDownloadBtn}
            onPress={() => generateSingleReportPDF(item)}
            accessibilityRole="button"
            accessibilityLabel={`Download PDF for inspection ${item.id}`}
          >
            <Ionicons name="document-text-outline" size={16} color="#38BDF8" style={styles.btnIcon} />
            <Text style={styles.pdfBtnText}>DOWNLOAD PDF DOSSIER</Text>
          </Pressable>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Mobile Reports" showBack={false} />

      <FlatList
        data={inspections}
        keyExtractor={(item) => item.id}
        renderItem={renderReportItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#38BDF8"
          />
        }
        ListHeaderComponent={
          <>
            {/* Regulatory Disclaimer Banner */}
            <View style={styles.disclaimerHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#38BDF8" style={styles.discIcon} />
              <View style={styles.discTextWrap}>
                <Text style={styles.disclaimerTitle}>
                  AI-based preliminary risk assessment
                </Text>
                <Text style={styles.disclaimerSubtitle}>
                  Automated reports indicate structural defect indicators. Official certified civil
                  engineering evaluations remain mandatory.
                </Text>
              </View>
            </View>

            {/* Master Export Button */}
            <Pressable
              style={styles.masterExportBtn}
              onPress={handleExportComprehensivePDF}
              disabled={isExporting}
              accessibilityRole="button"
              accessibilityLabel="Download Comprehensive Audit Dossier"
            >
              {isExporting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="download" size={20} color="#FFFFFF" style={styles.btnIcon} />
                  <Text style={styles.masterExportText}>
                    DOWNLOAD MASTER AUDIT DOSSIER ({total} RECORDS)
                  </Text>
                </>
              )}
            </Pressable>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Individual Inspection Dossiers</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.loadingText}>Compiling reports from InsForge...</Text>
            </View>
          ) : (
            <View style={styles.centerBox}>
              <Ionicons name="document-outline" size={54} color="#475569" />
              <Text style={styles.emptyTitle}>No Reports Available</Text>
              <Text style={styles.emptySubtitle}>
                Completed inspections will automatically generate PDF dossiers here.
              </Text>
            </View>
          )
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
    paddingBottom: 100
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
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
  masterExportBtn: {
    minHeight: 52,
    backgroundColor: '#0284C7',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4
  },
  btnIcon: {
    marginRight: 8
  },
  masterExportText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6
  },
  sectionHeader: {
    marginBottom: 8
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800'
  },
  reportCard: {
    marginVertical: 6,
    padding: 14
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  cardHeaderInfo: {
    flex: 1
  },
  reportId: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700'
  },
  reportDate: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10
  },
  modePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  modePillOnline: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#0284C7'
  },
  modePillOffline: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#D97706'
  },
  modePillText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  sosPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  sosPillText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '800'
  },
  detailsBody: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    marginBottom: 10
  },
  bodyText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10
  },
  pdfDownloadBtn: {
    minHeight: 44,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pdfBtnText: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6
  },
  centerBox: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 12
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center'
  }
});
