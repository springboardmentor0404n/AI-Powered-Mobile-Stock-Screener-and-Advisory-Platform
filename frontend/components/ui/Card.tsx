import React from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Pressable,
} from '@gluestack-ui/themed';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'outline' | 'filled';
}

export function Card({
  title,
  subtitle,
  children,
  onPress,
  variant = 'elevated',
}: CardProps) {
  const cardStyles = {
    elevated: {
      bg: '$white',
      borderRadius: '$xl',
      shadowColor: '$black',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    outline: {
      bg: '$white',
      borderRadius: '$xl',
      borderWidth: '$1',
      borderColor: '$borderLight200',
    },
    filled: {
      bg: '$backgroundLight50',
      borderRadius: '$xl',
    },
  };

  const Component = onPress ? Pressable : Box;

  return (
    <Component
      onPress={onPress}
      {...cardStyles[variant]}
      p="$4"
    >
      {(title || subtitle) && (
        <VStack space="xs" mb="$3">
          {title && (
            <Text size="lg" fontWeight="$bold" color="$textLight900">
              {title}
            </Text>
          )}
          {subtitle && (
            <Text size="sm" color="$textLight600">
              {subtitle}
            </Text>
          )}
        </VStack>
      )}
      {children}
    </Component>
  );
}
