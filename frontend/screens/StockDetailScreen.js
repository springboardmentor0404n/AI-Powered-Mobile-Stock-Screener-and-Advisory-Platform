import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import StockChart from '../components/StockChart';

export default function StockDetailScreen({ route }) {
    const { stock } = route.params;
    const [details, setDetails] = useState(stock);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchDetails();
    }, []);

    const fetchDetails = async () => {
        try {
            // Need to fetch full details including fundamentals/technicals which might not be in the list view
            const response = await client.get(`/stock/${stock.symbol}`);
            setDetails(response.data);
            setLoading(false);
        } catch (e) {
            console.log("Error fetching details", e);
            setLoading(false);
        }
    };

    const addToWatchlist = async () => {
        setAdding(true);
        try {
            await client.post('/watchlist', { symbol: details.symbol });
            Alert.alert("Success", "Added to Watchlist");
        } catch (e) {
            Alert.alert("Error", "Could not add to watchlist");
        }
        setAdding(false);
    };

    if (loading) return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={[styles.container, styles.center]}>
            <ActivityIndicator size="large" color="#fff" />
        </LinearGradient>
    );

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.symbol}>{details.symbol}</Text>
                        <Text style={styles.name}>{details.company_name}</Text>
                    </View>
                    <View>
                        <Text style={styles.price}>₹{details.current_price?.toFixed(2)}</Text>
                        <Text style={styles.sector}>{details.sector}</Text>
                    </View>
                </View>

                <StockChart data={[]} />

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Fundamentals</Text>
                    <View style={styles.grid}>
                        <InfoBox label="Market Cap" value={details.market_cap} isCurrency />
                        <InfoBox label="P/E Ratio" value={details.fundamentals?.pe_ratio?.toFixed(2)} />
                        <InfoBox label="ROE" value={details.fundamentals?.roe?.toFixed(2) + '%'} />
                        <InfoBox label="Div Yield" value={details.fundamentals?.div_yield ? (details.fundamentals.div_yield * 100).toFixed(2) + '%' : 'N/A'} />
                        <InfoBox label="Book Value" value={details.fundamentals?.book_value} />
                        <InfoBox label="Debt/Eq" value={details.fundamentals?.debt_to_equity?.toFixed(2)} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Technicals</Text>
                    <View style={styles.grid}>
                        <InfoBox label="RSI (14)" value={details.technicals?.rsi_14?.toFixed(2)} />
                        <InfoBox label="MACD" value={details.technicals?.macd?.toFixed(2)} />
                    </View>
                </View>

            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={addToWatchlist} disabled={adding}>
                {adding ? <ActivityIndicator color="#fff" /> : <Ionicons name="star" size={24} color="#fff" />}
            </TouchableOpacity>
        </LinearGradient>
    );
}

const InfoBox = ({ label, value, isCurrency }) => (
    <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{isCurrency ? '₹' : ''}{value || 'N/A'}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 20, paddingBottom: 100 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    symbol: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
    name: { color: '#aaa', fontSize: 16 },
    price: { color: '#00ff83', fontSize: 24, fontWeight: 'bold', textAlign: 'right' },
    sector: { color: '#ccc', textAlign: 'right' },
    section: { marginTop: 20 },
    sectionTitle: { color: '#fff', fontSize: 18, marginBottom: 10, fontWeight: 'bold' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    infoBox: {
        width: '32%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10
    },
    infoLabel: { color: '#888', fontSize: 12 },
    infoValue: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 5 },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: '#6c63ff',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8
    }
});
