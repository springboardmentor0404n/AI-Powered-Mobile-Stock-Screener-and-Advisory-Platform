import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { Colors } from '../../constants/Colors';

interface Query {
  _id: string;
  user_id: string;
  query: string;
  parsed_dsl?: any;
  success: boolean;
  token_usage?: number;
  execution_time_ms?: number;
  error?: string;
  created_at: string;
}

interface QueryStats {
  total_queries: number;
  success_rate: number;
  avg_tokens: number;
  avg_execution_time: number;
}

export default function QueryManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [queries, setQueries] = useState<Query[]>([]);
  const [stats, setStats] = useState<QueryStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSuccess, setFilterSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    loadData();
  }, [filterSuccess]);

  const loadData = async () => {
    try {
      const token = await storage.getItem('authToken');
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (filterSuccess !== null) {
        params.append('success', filterSuccess.toString());
      }
      
      const [queriesData, statsData] = await Promise.all([
        api.get(`/api/admin/queries?${params}`, token),
        api.get('/api/admin/queries/stats', token)
      ]);
      
      setQueries(queriesData.queries);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load queries:', error);
      Alert.alert('Error', 'Failed to load query data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    Alert.alert(
      'Delete Query',
      'Are you sure you want to flag this query as dangerous?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await storage.getItem('authToken');
              await api.delete(`/api/admin/queries/${queryId}`, token);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete query');
            }
          },
        },
      ]
    );
  };

  const filteredQueries = queries.filter(q =>
    q.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Query Logs</Text>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_queries}</Text>
            <Text style={styles.statLabel}>Total Queries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.successValue]}>
              {stats.success_rate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(stats.avg_tokens)}</Text>
            <Text style={styles.statLabel}>Avg Tokens</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(stats.avg_execution_time)}ms</Text>
            <Text style={styles.statLabel}>Avg Time</Text>
          </View>
        </View>
      )}

      {/* Search and Filter */}
      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={Colors.dark.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search queries or users..."
            placeholderTextColor={Colors.dark.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterSuccess === null && styles.filterChipActive]}
            onPress={() => setFilterSuccess(null)}
          >
            <Text style={[styles.filterText, filterSuccess === null && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterSuccess === true && styles.filterChipActive]}
            onPress={() => setFilterSuccess(true)}
          >
            <Text style={[styles.filterText, filterSuccess === true && styles.filterTextActive]}>
              Success
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterSuccess === false && styles.filterChipActive]}
            onPress={() => setFilterSuccess(false)}
          >
            <Text style={[styles.filterText, filterSuccess === false && styles.filterTextActive]}>
              Failed
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Query List */}
      <ScrollView style={styles.listContainer}>
        {filteredQueries.map(query => (
          <View key={query._id} style={styles.queryCard}>
            <View style={styles.queryHeader}>
              <View style={[
                styles.statusBadge,
                query.success ? styles.statusSuccess : styles.statusFailed
              ]}>
                <Ionicons 
                  name={query.success ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={query.success ? "#22c55e" : Colors.dark.error} 
                />
                <Text style={[
                  styles.statusText,
                  query.success ? styles.statusSuccessText : styles.statusFailedText
                ]}>
                  {query.success ? 'SUCCESS' : 'FAILED'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteQuery(query._id)}>
                <Ionicons name="trash" size={20} color={Colors.dark.error} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.queryText} numberOfLines={2}>{query.query}</Text>
            
            <View style={styles.queryMeta}>
              <Text style={styles.metaText}>
                User: {query.user_id.substring(0, 8)}...
              </Text>
              <Text style={styles.metaText}>
                {new Date(query.created_at).toLocaleString()}
              </Text>
            </View>

            {query.token_usage && (
              <View style={styles.queryStats}>
                <View style={styles.queryStatItem}>
                  <Ionicons name="code" size={14} color={Colors.dark.textSecondary} />
                  <Text style={styles.queryStatText}>{query.token_usage} tokens</Text>
                </View>
                {query.execution_time_ms && (
                  <View style={styles.queryStatItem}>
                    <Ionicons name="time" size={14} color={Colors.dark.textSecondary} />
                    <Text style={styles.queryStatText}>{query.execution_time_ms}ms</Text>
                  </View>
                )}
              </View>
            )}

            {query.error && (
              <Text style={styles.errorText} numberOfLines={2}>
                Error: {query.error}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  statsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: Colors.dark.surface,
    padding: 12,
    borderRadius: 12,
    margin: 4,
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  successValue: {
    color: '#22c55e',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  controls: {
    padding: 20,
    paddingTop: 0,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.dark.text,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterChipActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.dark.background,
  },
  listContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  queryCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusSuccess: {
    backgroundColor: '#22c55e20',
  },
  statusFailed: {
    backgroundColor: '#ef444420',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusSuccessText: {
    color: '#22c55e',
  },
  statusFailedText: {
    color: Colors.dark.error,
  },
  queryText: {
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  queryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  queryStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  queryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  queryStatText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.dark.error,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
