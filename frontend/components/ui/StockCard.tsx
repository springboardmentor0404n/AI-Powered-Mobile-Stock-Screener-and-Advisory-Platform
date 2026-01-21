import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { Badge } from './Badge';
import { TrendIndicator } from './TrendIndicator';

interface StockCardProps {
  symbol: string;
  company: string;
  price?: number;
  change?: number;
  changePercent?: number;
  exchange?: string;
  pe_ratio?: number;
  peg_ratio?: number;
  onPress?: () => void;
  onChartPress?: () => void;
  onChatPress?: () => void;
}

export function StockCard({
  symbol,
  company,
  price,
  change,
  changePercent,
  exchange,
  pe_ratio,
  peg_ratio,
  onPress,
  onChartPress,
  onChatPress,
}: StockCardProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const cardContent = (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.symbolContainer}>
          <View style={[styles.symbolBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.symbolText}>{symbol}</Text>
          </View>
          {exchange && <Badge label={exchange} variant="neutral" size="small" />}
        </View>
        {price !== undefined && (
          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: colors.text }]}>₹{price.toFixed(2)}</Text>
            {changePercent !== undefined && (
              <TrendIndicator value={changePercent} size="small" />
            )}
          </View>
        )}
      </View>

      <Text style={[styles.company, { color: colors.textSecondary }]} numberOfLines={2}>
        {company}
      </Text>

      {(pe_ratio !== undefined || peg_ratio !== undefined) && (
        <View style={styles.metricsContainer}>
          {pe_ratio !== undefined && (
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>P/E</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{pe_ratio}</Text>
            </View>
          )}
          {peg_ratio !== undefined && (
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>PEG</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{peg_ratio}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.actionsContainer}>
        {onChartPress && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={onChartPress}
            activeOpacity={0.7}
          >
            <Ionicons name="bar-chart-outline" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Chart</Text>
          </TouchableOpacity>
        )}
        {onChatPress && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfaceHighlight }]}
            onPress={onChatPress}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Discuss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  symbolBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  symbolText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  company: {
    fontSize: 15,
    marginBottom: 12,
    lineHeight: 20,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

