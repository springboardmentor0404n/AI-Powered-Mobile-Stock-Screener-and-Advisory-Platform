import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, AuthContext } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import ResultsScreen from './screens/ResultsScreen';
import StockDetailScreen from './screens/StockDetailScreen';
import WatchlistScreen from './screens/Watchlist';
import PortfolioScreen from './screens/PortfolioScreen';
import AlertsScreen from './screens/AlertsScreen';

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

import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppNavigator() {
  const { colors, isDark } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.background[0] }, // Use first gradient color or solid
      headerTintColor: colors.text,
      headerTitleStyle: { fontWeight: 'bold' },
      contentStyle: { backgroundColor: colors.background[0] }
    }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="StockDetail" component={StockDetailScreen} options={{ title: 'Stock Details' }} />
      <Stack.Screen name="Watchlist" component={WatchlistScreen} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'My Alerts' }} />
    </Stack.Navigator>
  );
}

function NavigationWrapper() {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0c29' }}>
        <ActivityIndicator size="large" color="#00ff83" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userToken ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

// ... Polling Component ...
// (Keep AlertPolling imports and component same)
import client from './api/client';
import { Alert } from 'react-native';
import { useEffect } from 'react';

function AlertPolling() {
  // ... existing implementation ...
  const { userToken } = useContext(AuthContext);

  useEffect(() => {
    if (!userToken) return;

    const checkAlerts = async () => {
      try {
        const res = await client.get('/alerts/triggered');
        const alerts = res.data;

        if (alerts && alerts.length > 0) {
          alerts.forEach(alert => {
            Alert.alert(
              "Price Alert! 🔔",
              `${alert.stock.symbol} is now ${alert.condition} ${alert.target_price}.\nCurrent Price: ${alert.stock.current_price}`,
              [
                { text: "OK", onPress: () => ackAlert(alert.id) }
              ]
            );
          });
        }
      } catch (e) {
        // Silent fail
      }
    };

    const ackAlert = async (id) => {
      try { await client.post(`/alerts/${id}/ack`); } catch (e) { }
    };

    const interval = setInterval(checkAlerts, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [userToken]);

  return null;
}

const StatusBarWrapper = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <StatusBarWrapper />
        <AlertPolling />
        <NavigationWrapper />
      </ThemeProvider>
    </AuthProvider>
  );
}
