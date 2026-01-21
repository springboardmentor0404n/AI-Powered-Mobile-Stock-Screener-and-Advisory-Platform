import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';

interface TrendIndicatorProps {
  value: number;
  percentage?: boolean;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function TrendIndicator({
  value,
  percentage = true,
  showIcon = true,
  size = 'medium',
}: TrendIndicatorProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const isPositive = value >= 0;
  const trendColor = isPositive ? colors.success : colors.error;
  const iconName = isPositive ? 'trending-up' : 'trending-down';

  const sizeStyles = {
    small: { fontSize: 12, iconSize: 14 },
    medium: { fontSize: 14, iconSize: 16 },
    large: { fontSize: 16, iconSize: 18 },
  };

  const displayValue = percentage
    ? `${isPositive ? '+' : ''}${value.toFixed(2)}%`
    : `${isPositive ? '+' : ''}${value.toFixed(2)}`;

  return (
    <View style={[styles.container, { backgroundColor: `${trendColor}15` }]}>
      {showIcon && (
        <Ionicons
          name={iconName}
          size={sizeStyles[size].iconSize}
          color={trendColor}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.value,
          {
            color: trendColor,
            fontSize: sizeStyles[size].fontSize,
            fontWeight: size === 'large' ? '700' : '600',
          },
        ]}
      >
        {displayValue}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  value: {
    letterSpacing: 0.3,
  },
});

