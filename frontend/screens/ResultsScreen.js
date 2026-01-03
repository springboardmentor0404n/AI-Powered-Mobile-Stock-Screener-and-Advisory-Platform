import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ResultsScreen({ route, navigation }) {
    const { results, title } = route.params;

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('StockDetail', { stock: item })}>
            <View style={styles.cardHeader}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.price}>₹{item.current_price?.toFixed(2)}</Text>
            </View>
            <Text style={styles.name}>{item.company_name}</Text>
            <Text style={styles.sector}>{item.sector}</Text>
        </TouchableOpacity>
    );

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
            <Text style={styles.pageTitle}>Results for: "{title}"</Text>
            <FlatList
                data={results}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    pageTitle: { color: '#ccc', marginBottom: 20, fontSize: 16, fontStyle: 'italic' },
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
    sector: { color: '#888', fontSize: 12, marginTop: 5 }
});
