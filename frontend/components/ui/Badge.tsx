import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'small' | 'medium' | 'large';
}

export function Badge({ label, variant = 'primary', size = 'medium' }: BadgeProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const variantStyles = {
    primary: { bg: colors.primary, text: '#FFFFFF' },
    success: { bg: colors.success, text: '#FFFFFF' },
    warning: { bg: colors.warning, text: '#FFFFFF' },
    error: { bg: colors.error, text: '#FFFFFF' },
    info: { bg: colors.info, text: '#FFFFFF' },
    neutral: { bg: colors.surfaceHighlight, text: colors.text },
  };

  const sizeStyles = {
    small: { padding: 4, fontSize: 10, borderRadius: 8 },
    medium: { padding: 6, fontSize: 12, borderRadius: 10 },
    large: { padding: 8, fontSize: 14, borderRadius: 12 },
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyles[variant].bg,
          paddingHorizontal: sizeStyles[size].padding,
          paddingVertical: sizeStyles[size].padding / 2,
          borderRadius: sizeStyles[size].borderRadius,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: variantStyles[variant].text,
            fontSize: sizeStyles[size].fontSize,
            fontWeight: size === 'large' ? '700' : '600',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  label: {
    letterSpacing: 0.3,
  },
});

