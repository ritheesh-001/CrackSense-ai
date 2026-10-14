import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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
import { OfflineBanner } from '../components/OfflineBanner';
import { StatusBadge } from '../components/StatusBadge';
import { fetchInspectionsList } from '../services/insforge';
import { Inspection, SeverityLevel } from '../types/models';
import { RootStackParamList } from '../types/navigation';

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<Inspection[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setErrorMsg(null);
      const { inspections: list, error } = await fetchInspectionsList(100);
      if (error) {
        setErrorMsg(error);
      } else {
        setInspections(list);
        applyFilters(list, selectedFilter, searchQuery);
      }
    } catch (err) {
      setErrorMsg('Failed to load inspection history.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const applyFilters = (list: Inspection[], filter: string, query: string) => {
    let result = list;

    if (filter !== 'ALL') {
      result = result.filter((item) => item.severity === filter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (item) =>
          item.id.toLowerCase().includes(q) ||
          (item.recommendation && item.recommendation.toLowerCase().includes(q)) ||
          item.severity.toLowerCase().includes(q)
      );
    }

    setFilteredInspections(result);
  };

  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter);
    applyFilters(inspections, filter, searchQuery);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    applyFilters(inspections, selectedFilter, query);
  };

  const renderInspectionCard = ({ item }: { item: Inspection }) => (
    <Pressable
      onPress={() =>
        navigation.navigate('InspectionDetails', {
          inspectionId: item.id,
          inspection: item
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`View inspection ${item.id}`}
    >
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          <StatusBadge severity={item.severity} size="small" />
        </View>

        <Text style={styles.recText} numberOfLines={2}>
          {item.recommendation || 'Standard structural inspection completed.'}
        </Text>

        <View style={styles.cardBottom}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Fissures</Text>
            <Text style={styles.metricVal}>{item.crack_count}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Max Width</Text>
            <Text style={styles.metricVal} numberOfLines={1}>
              {item.dimensions || 'N/A'}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Confidence</Text>
            <Text style={styles.metricVal}>{Math.round(item.confidence * 100)}%</Text>
          </View>
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Inspection History" showBack={false} />
      <OfflineBanner
        onPressOfflineAction={() => navigation.navigate('OfflineIncidentQueue')}
      />

      <View style={styles.filterSection}>
        {/* Search Input */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inspections by ID or condition..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearchChange('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.pillsRow}>
          {['ALL', 'CRITICAL', 'MEDIUM', 'LOW'].map((pill) => (
            <Pressable
              key={pill}
              style={[
                styles.pill,
                selectedFilter === pill && styles.pillActive,
                pill === 'CRITICAL' && selectedFilter === pill && styles.pillCritical
              ]}
              onPress={() => handleFilterSelect(pill)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${pill}`}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedFilter === pill && styles.pillTextActive
                ]}
              >
                {pill}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#F87171" style={styles.errorIcon} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <FlatList
        data={filteredInspections}
        keyExtractor={(item) => item.id}
        renderItem={renderInspectionCard}
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
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.loadingText}>Loading inspection records...</Text>
            </View>
          ) : (
            <View style={styles.centerBox}>
              <Ionicons name="folder-open-outline" size={48} color="#475569" />
              <Text style={styles.emptyTitle}>No matching inspections</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your filter or search query.
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
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    height: 46
  },
  clearSearchBtn: {
    padding: 4
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155'
  },
  pillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8'
  },
  pillCritical: {
    backgroundColor: '#DC2626',
    borderColor: '#F87171'
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700'
  },
  pillTextActive: {
    color: '#FFFFFF'
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10
  },
  errorIcon: {
    marginRight: 6
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600'
  },
  listContent: {
    padding: 16,
    paddingBottom: 100
  },
  card: {
    marginVertical: 6,
    padding: 14
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dateText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700'
  },
  timeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500'
  },
  recText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8
  },
  metric: {
    flex: 1
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600'
  },
  metricVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2
  },
  chevronWrap: {
    paddingLeft: 8
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
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
