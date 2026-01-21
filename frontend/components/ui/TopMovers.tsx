import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';
import { TrendIndicator } from './TrendIndicator';

interface Stock {
    symbol: string;
    company: string;
    price: number;
    change: number;
    changePercent: number;
    exchange: string;
}

export function TopMovers() {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const [gainers, setGainers] = useState<Stock[]>([]);
    const [losers, setLosers] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMovers = async () => {
            try {
                const data = await api.get('/api/market/movers');
                if (data) {
                    setGainers(data.gainers || []);
                    setLosers(data.losers || []);
                }
            } catch (e) {
                console.error("Failed to fetch movers", e);
            } finally {
                setLoading(false);
            }
        };

        fetchMovers();

        // Refresh every 60 seconds
        const interval = setInterval(fetchMovers, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Ionicons name="stats-chart" size={18} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.text }]}>Market Movers</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            </View>
        );
    }

    const renderStock = (stock: Stock, index: number) => (
        <TouchableOpacity
            key={stock.symbol}
            style={[
                styles.stockItem,
                {
                    backgroundColor: colors.surface,
                    borderBottomWidth: index < 4 ? 1 : 0,
                    borderBottomColor: colors.border
                }
            ]}
        >
            <View style={styles.stockInfo}>
                <Text
                    style={[styles.symbol, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                >
                    {stock.symbol}
                </Text>
                <Text style={[styles.price, { color: colors.textSecondary }]}>₹{stock.price.toFixed(2)}</Text>
            </View>
            <TrendIndicator value={stock.changePercent} size="small" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="stats-chart" size={18} color={colors.primary} />
                <Text style={[styles.title, { color: colors.text }]}>Market Movers</Text>
            </View>

            <View style={styles.moversContainer}>
                {/* Top Gainers */}
                <View style={[styles.column, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.columnHeader}>
                        <Ionicons name="trending-up" size={16} color="#10B981" />
                        <Text style={[styles.columnTitle, { color: colors.text }]}>Top Gainers</Text>
                    </View>
                    <View style={styles.stockList}>
                        {gainers.length > 0 ? (
                            gainers.map((stock, index) => renderStock(stock, index))
                        ) : (
                            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No gainers</Text>
                        )}
                    </View>
                </View>

                {/* Top Losers */}
                <View style={[styles.column, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.columnHeader}>
                        <Ionicons name="trending-down" size={16} color="#EF4444" />
                        <Text style={[styles.columnTitle, { color: colors.text }]}>Top Losers</Text>
                    </View>
                    <View style={styles.stockList}>
                        {losers.length > 0 ? (
                            losers.map((stock, index) => renderStock(stock, index))
                        ) : (
                            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No losers</Text>
                        )}
                    </View>
                </View>
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
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    moversContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    column: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    columnHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 12,
        paddingBottom: 8,
    },
    columnTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    stockList: {
        gap: 0,
    },
    stockItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    stockInfo: {
        flex: 1,
        marginRight: 8,
    },
    symbol: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
    },
    price: {
        fontSize: 11,
    },
    emptyText: {
        fontSize: 12,
        textAlign: 'center',
        paddingVertical: 20,
    },
});
