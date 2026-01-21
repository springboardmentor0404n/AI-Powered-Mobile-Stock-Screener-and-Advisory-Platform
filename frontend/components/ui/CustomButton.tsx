import React from 'react';
import {
  Button,
  ButtonText,
  ButtonIcon,
} from '@gluestack-ui/themed';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isDisabled?: boolean;
  isLoading?: boolean;
  leftIcon?: any;
  rightIcon?: any;
}

export function CustomButton({
  title,
  onPress,
  variant = 'solid',
  size = 'md',
  isDisabled = false,
  isLoading = false,
  leftIcon,
  rightIcon,
}: CustomButtonProps) {
  return (
    <Button
      onPress={onPress}
      variant={variant}
      size={size}
      isDisabled={isDisabled || isLoading}
      bg="$primary600"
    >
      {leftIcon && <ButtonIcon as={leftIcon} />}
      <ButtonText>{title}</ButtonText>
      {rightIcon && <ButtonIcon as={rightIcon} />}
    </Button>
  );
}
