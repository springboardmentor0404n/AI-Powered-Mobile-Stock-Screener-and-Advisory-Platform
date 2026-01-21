import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image, RefreshControl, Modal, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationBell } from '../../components/NotificationBell';

// Components
import {
    MarketIndices,
    AIQueryEntry,
    SmartWatchlist,
    TopMovers,
    MarketNews
} from '../../components/ui';

export default function HomeScreen() {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const router = useRouter();
    const { user } = useAuth();
    const scrollX = useRef(new Animated.Value(0)).current;
    const [refreshing, setRefreshing] = useState(false);
    const [newsUpdateTrigger, setNewsUpdateTrigger] = useState(0);

    // Notifications State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    const onRefresh = async () => {
        setRefreshing(true);
        // Trigger a re-render of news
        setNewsUpdateTrigger(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    // Load Notifications & connection
    useEffect(() => {
        const loadNotifications = async () => {
            try {
                // 1. Load stored notifications
                const stored = await AsyncStorage.getItem('notifications');
                let relevantNotifications = stored ? JSON.parse(stored) : [];

                // Filter stored notifications for last 48 hours cleanup
                const timeWindow = 48 * 3600; // Increased to 48h because news feed is stale
                const timeLimit = Math.floor(Date.now() / 1000) - timeWindow;
                relevantNotifications = relevantNotifications.filter((n: any) => n.datetime > timeLimit);

                // 2. Fetch fresh market news for notifications
                try {
                    const response = await api.get('/api/market/news');
                    if (response && response.news) {
                        // Relaxed filter: Get news from last 48 hours
                        const recentNews = response.news.filter((n: any) => n.datetime > timeLimit);

                        // Merge avoiding duplicates (by headline)
                        const existingHeadlines = new Set(relevantNotifications.map((n: any) => n.headline));
                        const newNotifications = recentNews.filter((n: any) => !existingHeadlines.has(n.headline));

                        relevantNotifications = [...newNotifications, ...relevantNotifications];
                    }
                } catch (err) {
                    console.log("Failed to fetch news for notifications", err);
                }

                // 3. Handle First Launch Welcome
                const hasLaunched = await AsyncStorage.getItem('hasLaunched');
                if (!hasLaunched) {
                    const welcomeMsg = {
                        id: 'welcome-' + Date.now(),
                        headline: 'Welcome to AI Stock Screener! 🚀',
                        summary: 'Thanks for downloading the app. We will notify you of important market news and AI insights right here.',
                        datetime: Math.floor(Date.now() / 1000),
                        category: 'App Update'
                    };
                    relevantNotifications = [welcomeMsg, ...relevantNotifications];
                    await AsyncStorage.setItem('hasLaunched', 'true');
                }

                // Sort by newest first
                relevantNotifications.sort((a: any, b: any) => b.datetime - a.datetime);

                setNotifications(relevantNotifications);
                setUnreadCount(relevantNotifications.length);
                await AsyncStorage.setItem('notifications', JSON.stringify(relevantNotifications));

            } catch (e) {
                console.log("Failed to load notifications", e);
            }
        };
        loadNotifications();

        // WebSocket Connection for Notifications
        const connectWS = () => {
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const wsUrl = backendUrl.replace('http', 'ws') + '/ws';

            console.log("Connecting to WS:", wsUrl);
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log("WS Connected for Notifications");
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'news_alert') {
                        const newsItem = message.data;
                        setNotifications(prev => {
                            const updated = [newsItem, ...prev];
                            AsyncStorage.setItem('notifications', JSON.stringify(updated));
                            return updated;
                        });
                        setUnreadCount(prev => prev + 1);
                        // Refresh the news list on the homepage
                        setNewsUpdateTrigger(prev => prev + 1);
                    }
                } catch (e) {
                    console.log("WS Message Error:", e);
                }
            };

            ws.onerror = (e) => {
                console.log("WS Error:", e);
            };

            ws.onclose = () => {
                console.log("WS Closed, reconnecting in 5s...");
                setTimeout(connectWS, 5000);
            };

            wsRef.current = ws;
        };

        connectWS();

        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    useEffect(() => {
        // Marquee Animation
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scrollX, {
                    toValue: -2960,
                    duration: 40000,
                    useNativeDriver: true,
                }),
                Animated.timing(scrollX, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const handleQuerySubmit = (query: string) => {
        // Navigate to Chat/Advisory with the query as initial message
        router.push({
            pathname: '/chat',
            params: { initialMessage: query }
        });
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getDisplayName = () => {
        if (!user?.name) return 'Trader';
        // If name looks like email, take part before @
        if (user.name.includes('@')) {
            return user.name.split('@')[0];
        }
        return user.name.split(' ')[0];
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
            <StatusBar style="light" backgroundColor="#000000" />

            <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >

                    {/* 1. Header Section */}
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()},</Text>
                            <Text style={[styles.userName, { color: colors.text }]}>
                                {getDisplayName()}
                            </Text>
                        </View>
                        <View style={styles.headerRight}>
                            <NotificationBell />
                            <TouchableOpacity
                                style={[styles.profileButton, { backgroundColor: colors.primary }]}
                                onPress={() => router.push('/(tabs)/account')}
                            >
                                <Text style={styles.profileInitials}>
                                    {getDisplayName().charAt(0).toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Notifications Modal */}
                    <Modal
                        visible={showNotifications}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowNotifications(false)}
                    >
                        <TouchableOpacity
                            style={styles.modalOverlay}
                            activeOpacity={1}
                            onPress={() => setShowNotifications(false)}
                        >
                            <View style={[styles.notificationDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.dropdownTitle, { color: colors.text }]}>Notifications</Text>
                                {notifications.length === 0 ? (
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No new notifications</Text>
                                ) : (
                                    <ScrollView style={{ maxHeight: 300 }}>
                                        {notifications.map((item, index) => (
                                            <TouchableOpacity key={index} style={[styles.notificationItem, { borderBottomColor: colors.border }]}>
                                                <View style={styles.notificationDot} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.notifTitle, { color: colors.text }]}>{item.headline}</Text>
                                                    <Text style={[styles.notifTime, { color: colors.textSecondary }]}>{item.source} • Now</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        </TouchableOpacity>
                    </Modal>

                    {/* 2. Top Indices */}
                    <View style={styles.sectionTop}>
                        <MarketIndices />
                    </View>

                    {/* 2. Smart Watchlist */}
                    <SmartWatchlist />

                    {/* 3. AI Query Bar (Hero) */}
                    <AIQueryEntry onQuerySubmit={handleQuerySubmit} />

                    {/* 4. Market News */}
                    <MarketNews lastUpdate={newsUpdateTrigger} />

                    {/* 5. Top Movers (Gainers & Losers) */}
                    <TopMovers />

                    {/* 6. Supported Exchanges Marquee */}
                    <View style={styles.partnersSection}>
                        <Text style={[styles.partnersTitle, { color: colors.text }]}>Supported Exchanges</Text>
                        <View style={styles.marqueeContainer}>
                            <Animated.View style={[styles.marqueeContent, { transform: [{ translateX: scrollX }] }]}>
                                {[...Array(50)].map((_, index) => (
                                    <View key={index} style={styles.logoGroup}>
                                        <View style={[styles.logoCard, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: colors.border }]}>
                                            <Image source={require('../../assets/images/NSE.png')} style={styles.logo} resizeMode="contain" />
                                        </View>
                                        <View style={[styles.logoCard, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderColor: colors.border }]}>
                                            <Image source={require('../../assets/images/BSE.png')} style={styles.logo} resizeMode="contain" />
                                        </View>
                                    </View>
                                ))}
                            </Animated.View>
                        </View>
                    </View>

                    {/* 7. Regulatory Disclaimer (Footer) */}
                    <View style={styles.disclaimerSection}>
                        <Text style={[styles.disclaimerTitle, { color: colors.textSecondary }]}>Regulatory Information</Text>
                        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                            This application is for informational and educational purposes only.
                            It is not a SEBI registered investment advisor.
                            Stock market investments are subject to market risks.
                            Please consult a certified financial advisor before making any investment decisions.
                            {"\n\n"}
                            No content herein constitutes a buy or sell recommendation.
                        </Text>
                    </View>

                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    sectionTop: {
        marginTop: 10,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    greeting: {
        fontSize: 14,
        fontWeight: '500',
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInitials: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    partnersSection: {
        width: '100%',
        marginTop: 20,
        marginBottom: 20,
    },
    partnersTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    marqueeContainer: {
        height: 80,
        overflow: 'hidden',
    },
    marqueeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
    },
    logoGroup: {
        flexDirection: 'row',
        marginRight: 24,
    },
    logoCard: {
        width: 130,
        height: 65,
        borderRadius: 16,
        marginRight: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    logo: {
        width: 100,
        height: 40,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#ffffff',
        zIndex: 10,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
        paddingTop: 110,
        paddingRight: 16,
        alignItems: 'flex-end',
    },
    notificationDropdown: {
        width: 320,
        borderRadius: 16,
        padding: 16,
        maxHeight: '60%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    notificationList: {
        maxHeight: 400,
    },
    notificationItem: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: 'rgba(150,150,150,0.05)',
    },
    notificationTime: {
        fontSize: 11,
        marginBottom: 4,
        opacity: 0.6,
    },
    notificationHeadline: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    notificationSummary: {
        fontSize: 12,
        opacity: 0.8,
        lineHeight: 16,
    },
    emptyState: {
        textAlign: 'center',
        padding: 20,
        opacity: 0.6,
    },
    disclaimerSection: {
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: 'rgba(150,150,150,0.1)',
        marginTop: 20,
    },
    disclaimerTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        opacity: 0.7,
    },
    disclaimerText: {
        fontSize: 11,
        lineHeight: 16,
        opacity: 0.5,
        textAlign: 'justify',
    },
    dropdownTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 12,
    },
    notificationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        marginRight: 8,
        marginTop: 6,
    },
    notifTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
    },
    notifTime: {
        fontSize: 11,
        opacity: 0.6,
    },
});
