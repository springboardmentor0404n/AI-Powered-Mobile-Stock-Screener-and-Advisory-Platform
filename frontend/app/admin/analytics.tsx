import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { Colors } from '../../constants/Colors';

interface AnalyticsData {
  dau: number;
  mau: number;
  retention_rate: number;
  date: string;
}

interface TopStock {
  stock_symbol: string;
  query_count: number;
  last_queried: string;
}

export default function Analytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topStocks, setTopStocks] = useState<TopStock[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const token = await storage.getItem('authToken');
      
      const [analyticsData, stocksData] = await Promise.all([
        api.get('/api/admin/analytics/dau-mau', token),
        api.get('/api/admin/analytics/top-stocks?limit=10', token)
      ]);
      
      setAnalytics(analyticsData);
      setTopStocks(stocksData.stocks);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.title}>Analytics</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Engagement */}
        {analytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Engagement</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{analytics.dau}</Text>
                <Text style={styles.metricLabel}>Daily Active Users</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{analytics.mau}</Text>
                <Text style={styles.metricLabel}>Monthly Active Users</Text>
              </View>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.retention_rate.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Retention Rate</Text>
            </View>
          </View>
        )}

        {/* Top Stocks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Searched Stocks</Text>
          {topStocks.map((stock, index) => (
            <View key={index} style={styles.stockCard}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.stockInfo}>
                <Text style={styles.stockSymbol}>{stock.stock_symbol}</Text>
                <Text style={styles.stockMeta}>
                  {stock.query_count} queries • Last: {new Date(stock.last_queried).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
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
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  metricCard: {
    backgroundColor: Colors.dark.surface,
    padding: 20,
    borderRadius: 12,
    margin: 6,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  stockCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark.primary,
  },
  stockInfo: {
    flex: 1,
  },
  stockSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  stockMeta: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
});
