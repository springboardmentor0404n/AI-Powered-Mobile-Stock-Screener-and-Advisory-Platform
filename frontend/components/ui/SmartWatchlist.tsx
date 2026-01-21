import React, { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { useMarketStore } from '../../store/marketStore';

// Mini Stock Row Component
const MiniStockRow = ({ stock, colors, wsPrice, onPress }: { stock: any, colors: any, wsPrice: any, onPress: () => void }) => {
    const price = wsPrice?.ltp || stock.price || 0;

    let change = stock.change || 0;
    let changePercent = stock.changePercent || 0;

    if (wsPrice && wsPrice.prevLtp > 0) {
        change = price - wsPrice.prevLtp;
        changePercent = (change / wsPrice.prevLtp) * 100;
    }

    const isPositive = change >= 0;

    return (
        <TouchableOpacity
            style={[styles.stockRow, { borderBottomColor: colors.border }]}
            onPress={onPress}
        >
            <View style={styles.stockInfo}>
                <Text style={[styles.symbol, { color: colors.text }]}>{stock.symbol}</Text>
                <Text style={[styles.company, { color: colors.textSecondary }]} numberOfLines={1}>{stock.company || stock.name}</Text>
            </View>

            <View style={styles.priceInfo}>
                <Text style={[styles.price, { color: colors.text }]}>₹{price.toFixed(2)}</Text>
                <Text style={[styles.change, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                    {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export function SmartWatchlist() {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const [watchlist, setWatchlist] = useState<any[]>([]);
    const { prices } = useMarketStore();
    const router = useRouter();


    useFocusEffect(
        useCallback(() => {
            fetchWatchlist();
        }, [])
    );

    const fetchWatchlist = async () => {
        try {
            const token = await storage.getItem('authToken');
            if (token) {
                const response = await api.get('/api/watchlist', token);
                const data = response?.stocks || (Array.isArray(response) ? response : []);
                const normalizedData = data.map((s: any) => ({
                    ...s,
                    price: s.price
                })).slice(0, 5); // Limit to 5 for home page
                setWatchlist(normalizedData);
            }
        } catch (e: any) {
            if (e.message?.includes('401') || e.message?.includes('Invalid')) {
                // Silent fail for auth errors
                console.warn("Watchlist auth invalid");
            } else {
                console.error("Watchlist fetch failed", e);
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Watchlist</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/screener')}>
                    <Ionicons name="arrow-forward-circle" size={24} color={colors.textTertiary} />
                </TouchableOpacity>
            </View>

            <View style={[styles.listContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {watchlist.length > 0 ? (
                    watchlist.map(stock => (
                        <MiniStockRow
                            key={stock.symbol}
                            stock={stock}
                            colors={colors}
                            wsPrice={prices.get(stock.symbol)}
                            onPress={() => router.push({
                                pathname: "/stock-details",
                                params: {
                                    symbol: stock.symbol,
                                    company: stock.company || stock.name,
                                    price: stock.price,
                                    changePercent: stock.changePercent,
                                    exchange: stock.exchange
                                }
                            })}
                        />
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={{ color: colors.textSecondary }}>No stocks in watchlist</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    listContainer: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    stockRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    stockInfo: {
        flex: 1,
    },
    symbol: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    company: {
        fontSize: 12,
    },
    priceInfo: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    change: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    }
});
