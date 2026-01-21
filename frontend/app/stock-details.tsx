
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Platform,
    Share,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import StockChart from '../components/StockChart';
import ProfessionalChart from '../components/ProfessionalChart';
import { Colors } from '../constants/Colors';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';
import { storage } from '../utils/storage';

const { width } = Dimensions.get('window');

const TimeframeButton = ({ label, active, onPress, colors }: { label: string, active: boolean, onPress: () => void, colors: any }) => (
    <TouchableOpacity
        style={[
            styles.timeframeButton,
            active && { backgroundColor: colors.surfaceHighlight }
        ]}
        onPress={onPress}
    >
        <Text style={[
            styles.timeframeText,
            { color: colors.textSecondary },
            active && { color: colors.primary, fontWeight: 'bold' }
        ]}>
            {label}
        </Text>
    </TouchableOpacity>
);

const StatItem = ({ label, value, color, colors }: { label: string, value: string, color?: string, colors: any }) => (
    <View style={styles.statItem}>
        <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.statValue, { color: color || colors.text }]}>{value}</Text>
    </View>
);

export default function StockDetailsScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;

    const { symbol, company, price, changePercent, exchange, pe_ratio } = params;

    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedInterval, setSelectedInterval] = useState<'1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w'>('1d');
    const [isScrollEnabled, setScrollEnabled] = useState(true);
    const [isInWishlist, setIsInWishlist] = useState(false);

    const [stockDetails, setStockDetails] = useState<any>(null);
    const [aiInsight, setAiInsight] = useState<any>(null);

    useEffect(() => {
        fetchHistory();
        fetchStockDetails();
        fetchInsight();
    }, [symbol, selectedInterval]);

    // Re-check wishlist status when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            checkWishlistStatus();
        }, [symbol])
    );

    const checkWishlistStatus = async () => {
        try {
            const token = await storage.getItem('authToken');
            if (!token || !symbol) return;

            const response = await api.get(`/api/watchlist/check/${symbol}`, token);
            setIsInWishlist(response.in_wishlist || false);
        } catch (error) {
            console.error('Error checking wishlist status:', error);
        }
    };

    const fetchStockDetails = async () => {
        try {
            const response = await api.get(`/api/stocks/details/${symbol}`);
            setStockDetails(response);
        } catch (error) {
            console.error("Failed to load stock details:", error);
        }
    };

    const fetchInsight = async () => {
        try {
            const data = await api.get(`/api/stocks/insight/${symbol}`);
            if (data && data.insight) {
                setAiInsight(data);
            }
        } catch (error) {
            console.error("Failed to fetch insight", error);
        }
    };

    const fetchHistory = async () => {
        if (!symbol) return;

        setLoading(true);
        try {
            const token = await storage.getItem('authToken');

            // Call API with explicit interval
            const data = await api.get(`/api/stocks/history?symbol=${encodeURIComponent(symbol as string)}&interval=${selectedInterval}`, token || undefined);

            if (data.history) {
                const formatted = data.history.map((item: any) => ({
                    time: item.date.split('T')[0],
                    originalDate: item.date,
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close
                }));

                if (['1m', '5m', '15m', '30m', '1H'].includes(selectedInterval)) {
                    const intradayFormatted = formatted.map((item: any) => ({
                        ...item,
                        time: new Date(item.originalDate).getTime() / 1000 // Seconds
                    })).sort((a: any, b: any) => a.time - b.time);
                    setChartData(intradayFormatted);
                } else {
                    const dailyFormatted = formatted.map((item: any) => ({
                        ...item,
                        time: item.originalDate.split('T')[0] // YYYY-MM-DD
                    })).sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
                    setChartData(dailyFormatted);
                }
            } else {
                setChartData([]);
            }
        } catch (error) {
            console.error("Failed to load history:", error);
            setChartData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            const message = `Check out ${company} (${symbol}) on ${exchange}\nCurrent Price: ₹${price}\nChange: ${changePercent}%`;
            await Share.share({
                message,
                title: `${company} Stock Info`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleWishlistToggle = async () => {
        try {
            const token = await storage.getItem('authToken');
            if (!token) {
                Alert.alert('Login Required', 'Please login to add stocks to your wishlist');
                return;
            }

            if (isInWishlist) {
                // Remove from wishlist
                await api.delete(`/api/watchlist/${symbol}`, token);
                setIsInWishlist(false);
                Alert.alert('Removed', `${symbol} removed from wishlist`);
            } else {
                // Add to wishlist
                await api.post('/api/watchlist', {
                    symbol,
                    company,
                    exchange: exchange || 'NSE'
                }, token);
                setIsInWishlist(true);
                Alert.alert('Added', `${symbol} added to wishlist`);
            }
        } catch (error: any) {
            console.error('Wishlist error:', error);
            Alert.alert('Error', error.message || 'Failed to update wishlist');
        }
    };

    const priceFromParams = parseFloat(price as string || '0');
    const changeFromParams = parseFloat((params.change as string) || '0');
    const changePctFromParams = parseFloat(changePercent as string || '0');

    // Prefer fetched details if params are missing/zero
    const currentPrice = (priceFromParams > 0) ? priceFromParams : (stockDetails?.current_price || 0);
    const priceChange = (Math.abs(changeFromParams) > 0) ? changeFromParams : (stockDetails?.change || 0);
    const changePct = (Math.abs(changePctFromParams) > 0) ? changePctFromParams : (stockDetails?.change_percent || 0);

    const isPositive = changePct >= 0;
    const priceColor = isPositive ? '#26a69a' : '#ef5350';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerSymbol, { color: colors.text }]}>{symbol}</Text>
                    <Text style={[styles.headerExchange, { color: colors.textSecondary }]}>{exchange || 'NSE'}</Text>
                </View>
                <TouchableOpacity style={styles.iconButton} onPress={handleWishlistToggle}>
                    <Ionicons
                        name={isInWishlist ? "star" : "star-outline"}
                        size={24}
                        color={isInWishlist ? "#FFD700" : colors.text}
                    />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                scrollEnabled={isScrollEnabled}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Price Info */}
                <View style={styles.priceSection}>
                    <Text style={[styles.companyName, { color: colors.textSecondary }]}>{company}</Text>
                    <View style={styles.priceRow}>
                        <Text style={[styles.currentPrice, { color: colors.text }]}>
                            ₹{currentPrice.toFixed(2)}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: isPositive ? 'rgba(38, 166, 154, 0.1)' : 'rgba(239, 83, 80, 0.1)' }]}>
                            <Ionicons name={isPositive ? "caret-up" : "caret-down"} size={12} color={priceColor} />
                            <Text style={[styles.changeText, { color: priceColor }]}>
                                {Math.abs(changePct).toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Chart Container */}
                <View
                    style={styles.chartContainer}
                    onTouchStart={() => setScrollEnabled(false)}
                    onTouchEnd={() => setScrollEnabled(true)}
                    onTouchCancel={() => setScrollEnabled(true)}
                >
                    <ProfessionalChart
                        symbol={symbol as string}
                        interval={selectedInterval}
                        height={320}
                        theme={isDark ? 'dark' : 'light'}
                    />
                </View>

                {/* Interval Selector (Candle Size) */}
                <View style={[styles.timeframeContainer, { borderBottomWidth: 1, borderTopWidth: 1, borderBottomColor: colors.border, borderTopColor: colors.border, paddingTop: 8, paddingBottom: 12 }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {['1m', '5m', '15m', '30m', '1h', '1d', '1w'].map((int) => (
                            <View key={int} style={{ marginRight: 8 }}>
                                <TimeframeButton
                                    label={int}
                                    active={selectedInterval === int}
                                    onPress={() => setSelectedInterval(int as any)}
                                    colors={colors}
                                />
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Fundamental Stats */}
                <View style={styles.statsContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Fundamentals</Text>
                    <View style={[styles.statsGrid, { backgroundColor: colors.surface }]}>
                        <StatItem
                            label="P/E Ratio"
                            value={stockDetails?.pe_ratio ? stockDetails.pe_ratio.toFixed(2) : (pe_ratio ? parseFloat(pe_ratio as string).toFixed(2) : '-')}
                            colors={colors}
                        />
                        <StatItem
                            label="Market Cap"
                            value={stockDetails?.market_cap ? `₹${(stockDetails.market_cap / 10000000).toFixed(2)}Cr` : '-'}
                            colors={colors}
                        />
                        <StatItem
                            label="52W High"
                            value={stockDetails ? `₹${stockDetails['52_week_high']}` : '-'}
                            color="#26a69a"
                            colors={colors}
                        />
                        <StatItem
                            label="52W Low"
                            value={stockDetails ? `₹${stockDetails['52_week_low']}` : '-'}
                            color="#ef5350"
                            colors={colors}
                        />
                        <StatItem
                            label="Beta"
                            value={stockDetails?.beta ? stockDetails.beta.toFixed(2) : '-'}
                            colors={colors}
                        />
                        <StatItem
                            label="Div Yield"
                            value={stockDetails?.dividend_yield ? `${stockDetails.dividend_yield.toFixed(2)}%` : '-'}
                            colors={colors}
                        />
                    </View>
                </View>

                {/* About / AI Insight */}
                <View style={styles.statsContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Insight</Text>
                    <View style={[styles.statsGrid, { backgroundColor: colors.surface, padding: 16 }]}>
                        {aiInsight ? (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Ionicons name="sparkles" size={16} color={aiInsight.color || colors.primary} style={{ marginRight: 6 }} />
                                    <Text style={{ color: aiInsight.color || colors.primary, fontWeight: '700' }}>
                                        {aiInsight.sentiment} Trend
                                    </Text>
                                </View>
                                <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                                    {aiInsight.insight}
                                </Text>
                            </>
                        ) : (
                            <View style={{ padding: 10, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 8 }}>Analyzing Market Data...</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
        marginRight: 16,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerSymbol: {
        fontSize: 16,
        fontWeight: '700',
    },
    headerExchange: {
        fontSize: 12,
    },
    iconButton: {
        padding: 8,
        marginLeft: 4
    },
    content: {
        flex: 1,
    },
    priceSection: {
        padding: 20,
    },
    companyName: {
        fontSize: 14,
        marginBottom: 4,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currentPrice: {
        fontSize: 32,
        fontWeight: '700',
        marginRight: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    changeText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    chartContainer: {
        height: Dimensions.get('window').height * 0.55,
        width: '100%',
        backgroundColor: '#000',
    },
    chartLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeframeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    timeframeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    timeframeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    statsContainer: {
        padding: 20,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderRadius: 16,
        padding: 16,
    },
    statItem: {
        width: '50%',
        marginBottom: 16,
    },
    statLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
    },
});
