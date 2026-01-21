import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Box,
  Button,
  ButtonText,
  Heading,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { LoginDialog } from '../components/ui/LoginDialog';
import { Card } from '../components/ui/Card';

export default function GluestackDemo() {
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();

  const handleLogin = (email: string, password: string) => {
    console.log('Login:', email, password);
  };

  return (
    <Box flex={1} bg="$backgroundLight50" p="$4">
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
      
      <VStack space="lg" mt="$10">
        <Heading size="2xl" textAlign="center">
          Gluestack UI Demo
        </Heading>
        
        <Text textAlign="center" color="$textLight600">
          Beautiful, accessible components for React Native
        </Text>

        <Card title="Login Dialog Example" subtitle="Tap the button below to open">
          <Button onPress={() => setShowDialog(true)} bg="$primary600">
            <ButtonText>Open Login Dialog</ButtonText>
          </Button>
        </Card>

        <Card title="Stock Info" subtitle="Sample card with data" variant="outline">
          <VStack space="sm">
            <Text fontWeight="$bold">AAPL - Apple Inc.</Text>
            <Text color="$success600" fontSize="$xl">$175.43</Text>
            <Text color="$success600" fontSize="$sm">+2.34 (1.35%)</Text>
          </VStack>
        </Card>

        <LoginDialog
          isOpen={showDialog}
          onClose={() => setShowDialog(false)}
          onLogin={handleLogin}
        />
      </VStack>
    </Box>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
});
