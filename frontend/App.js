import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, AuthContext } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import ResultsScreen from './screens/ResultsScreen';
import StockDetailScreen from './screens/StockDetailScreen';
import WatchlistScreen from './screens/Watchlist'; // naming consistency

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: '#0f0c29' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
      contentStyle: { backgroundColor: '#0f0c29' }
    }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="StockDetail" component={StockDetailScreen} options={{ title: 'Stock Details' }} />
      <Stack.Screen name="Watchlist" component={WatchlistScreen} />
    </Stack.Navigator>
  );
}

function NavigationWrapper() {
  const { userToken } = useContext(AuthContext);
  return (
    <NavigationContainer>
      {userToken ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <NavigationWrapper />
    </AuthProvider>
  );
}
