import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { api } from '../../utils/api';
import { StockCard } from '../../components/ui/StockCard';
import { useMarketData } from '../../hooks/useMarketData';
import { useMarketStore } from '../../store/marketStore';
import { MarketIndices } from '../../components';
import { storage } from '../../utils/storage';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Stock {
    symbol: string;
    company: string;
    price: number;
    change: number;
    changePercent: number;
    exchange: string;
}

export default function WatchlistScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const [watchlist, setWatchlist] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Get watchlist symbols for WebSocket subscription
    const watchlistSymbols = useMemo(() =>
        Array.isArray(watchlist) ? watchlist.map(stock => stock.symbol) : [],
        [watchlist]
    );

    // Connect to WebSocket for real-time updates
    useMarketData(watchlistSymbols);
    const { prices } = useMarketStore();

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchWatchlist();
        setRefreshing(false);
    };

    const fetchWatchlist = async () => {
        try {
            if (!refreshing) {
                setLoading(true);
            }
            const token = await storage.getItem('authToken');
            if (token) {
                const response = await api.get('/api/watchlist', token);
                // Handle response if it comes as { stocks: [...] } or just [...]
                if (response?.stocks && Array.isArray(response.stocks)) {
                    const normalizedStocks = response.stocks.map((s: Stock) => ({
                        ...s,
                        price: s.price
                    }));
                    setWatchlist(normalizedStocks);
                } else if (Array.isArray(response)) {
                    const normalizedStocks = response.map((s: Stock) => ({
                        ...s,
                        price: s.price
                    }));
                    setWatchlist(normalizedStocks);
                } else {
                    setWatchlist([]);
                }
            } else {
                setWatchlist([]);
            }
        } catch (error) {
            console.error('Error fetching watchlist:', error);
            setWatchlist([]);
        } finally {
            if (!refreshing) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchWatchlist();
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
            <StatusBar style="light" backgroundColor="#000000" />

            {/* Main Content Container (can have theme background, but top is black) */}
            <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>

                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Watchlist</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/screener')}>
                        <Ionicons name="search" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >
                    {/* Market Indices Header */}
                    <MarketIndices />

                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : watchlist.length > 0 ? (
                        <View style={styles.listContainer}>
                            {watchlist.map((stock) => {
                                // Get real-time price from WebSocket or fallback to API price
                                const wsPrice = prices.get(stock.symbol);
                                const currentPrice = wsPrice?.ltp || stock.price;

                                // Calculate change percent if we have WebSocket data
                                let changePercent = stock.changePercent;
                                if (wsPrice && wsPrice.prevLtp > 0) {
                                    changePercent = ((wsPrice.ltp - wsPrice.prevLtp) / wsPrice.prevLtp) * 100;
                                }

                                return (
                                    <StockCard
                                        key={stock.symbol}
                                        symbol={stock.symbol}
                                        company={stock.company}
                                        price={currentPrice}
                                        changePercent={changePercent}
                                        exchange={stock.exchange}
                                        onPress={() => router.push({
                                            pathname: "/stock-details",
                                            params: {
                                                symbol: stock.symbol,
                                                companyName: stock.company
                                            }
                                        })}
                                    />
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.centerContainer}>
                            <Ionicons name="star-outline" size={64} color={colors.textTertiary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No stocks in your watchlist yet.
                            </Text>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: colors.primary }]}
                                onPress={() => router.push('/(tabs)/screener')}
                            >
                                <Text style={styles.buttonText}>Search Stocks</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}


// ... (other imports)

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    scrollContent: {
        flexGrow: 1,
    },
    listContainer: {
        padding: 16,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        minHeight: 300,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    }
});
