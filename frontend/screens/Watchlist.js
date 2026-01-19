import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import client from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function WatchlistScreen({ navigation }) {
    const { colors } = useTheme();
    const [watchlist, setWatchlist] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchWatchlist();
        }, [])
    );

    const fetchWatchlist = async () => {
        try {
            const response = await client.get('/watchlist');
            setWatchlist(response.data);
            setLoading(false);
        } catch (e) {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('StockDetail', { stock: item })}>
            <View style={styles.cardHeader}>
                <Text style={[styles.symbol, { color: colors.text }]}>{item.symbol}</Text>
                <Text style={[styles.price, { color: colors.accent }]}>₹{item.current_price?.toFixed(2)}</Text>
            </View>
            <Text style={[styles.name, { color: colors.textSecondary }]}>{item.company_name}</Text>
        </TouchableOpacity>
    );

    return (
        <LinearGradient colors={colors.background} style={styles.container}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Your Watchlist</Text>
            {loading ? (
                <ActivityIndicator color={colors.accent} />
            ) : (
                <FlatList
                    data={watchlist}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>Watchlist is empty</Text>}
                />
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 60 },
    pageTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    list: { paddingBottom: 20 },
    card: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    symbol: { fontSize: 18, fontWeight: 'bold' },
    price: { fontSize: 18, fontWeight: 'bold' },
    name: { fontSize: 14 },
    empty: { textAlign: 'center', marginTop: 50 }
});
