import React from 'react';
import {
  Input,
  InputField,
  VStack,
  Text,
} from '@gluestack-ui/themed';

interface CustomInputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
}

export function CustomInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  error,
}: CustomInputProps) {
  return (
    <VStack space="xs">
      {label && (
        <Text size="sm" fontWeight="$medium" color="$textLight900">
          {label}
        </Text>
      )}
      <Input
        variant="outline"
        size="md"
        isInvalid={!!error}
        borderColor={error ? '$error600' : '$borderLight300'}
      >
        <InputField
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </Input>
      {error && (
        <Text size="xs" color="$error600">
          {error}
        </Text>
      )}
    </VStack>
  );
}
