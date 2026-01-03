import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import client from '../api/client';

export default function WatchlistScreen({ navigation }) {
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
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('StockDetail', { stock: item })}>
            <View style={styles.cardHeader}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.price}>₹{item.current_price?.toFixed(2)}</Text>
            </View>
            <Text style={styles.name}>{item.company_name}</Text>
        </TouchableOpacity>
    );

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
            <Text style={styles.pageTitle}>Your Watchlist</Text>
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <FlatList
                    data={watchlist}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>Watchlist is empty</Text>}
                />
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    pageTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    list: { paddingBottom: 20 },
    card: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    symbol: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    price: { color: '#00ff83', fontSize: 18, fontWeight: 'bold' },
    name: { color: '#aaa', fontSize: 14 },
    empty: { color: '#888', textAlign: 'center', marginTop: 50 }
});
