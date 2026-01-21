import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
                tabBarStyle: {
                    backgroundColor: isDark ? '#111827' : '#FFFFFF',
                    borderTopColor: isDark ? '#1F2937' : '#E5E7EB',
                    height: Platform.OS === 'ios' ? 85 : 60,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="watchlist"
                options={{
                    title: 'Watchlist',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'list' : 'list-outline'} size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="screener"
                options={{
                    title: 'Search Stock',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="portfolio"
                options={{
                    title: 'Portfolio',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="advisory"
                options={{
                    title: 'Advisory',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'bulb' : 'bulb-outline'} size={size} color={color} />
                    ),
                }}
            />



            <Tabs.Screen
                name="account"
                options={{
                    title: 'Account',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
