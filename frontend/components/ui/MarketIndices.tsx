import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

interface MarketIndicesProps {
  indices?: MarketIndex[];
}

const defaultIndices: MarketIndex[] = [];

export function MarketIndices({ indices: propIndices }: MarketIndicesProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [indices, setIndices] = useState<MarketIndex[]>(defaultIndices);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIndices();
    // Refresh every 30 seconds
    const interval = setInterval(fetchIndices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchIndices = async () => {
    try {
      const data = await api.get('/api/market/indices');
      if (data?.indices) {
        setIndices(data.indices);
      }
    } catch (error) {
      console.error('Failed to fetch market indices:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayIndices = propIndices || indices;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Market</Text>
      </View>

      {loading && indices.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.indicesContainer}>
          {displayIndices.map((index, idx) => {
            const isPositive = index.change >= 0;
            const changeColor = isPositive ? '#10B981' : '#EF4444';

            return (
              <View
                key={index.name}
                style={[
                  styles.indexCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    marginRight: idx < indices.length - 1 ? 12 : 0,
                  }
                ]}
              >
                <Text style={[styles.indexName, { color: colors.textSecondary }]}>{index.name}</Text>
                <Text style={[styles.indexValue, { color: colors.text }]}>
                  {index.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </Text>
                <View style={styles.changeContainer}>
                  <Ionicons
                    name={isPositive ? 'arrow-up' : 'arrow-down'}
                    size={14}
                    color={changeColor}
                  />
                  <Text style={[styles.changeText, { color: changeColor }]}>
                    {Math.abs(index.change).toFixed(2)} ({isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%)
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  indicesContainer: {
    flexDirection: 'row',
  },
  indexCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  indexName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  indexValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

