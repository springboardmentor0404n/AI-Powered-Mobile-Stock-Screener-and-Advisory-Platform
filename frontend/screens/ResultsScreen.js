import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function ResultsScreen({ route, navigation }) {
    const { results, title } = route.params;
    const { colors } = useTheme();

    const renderItem = ({ item }) => (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('StockDetail', { stock: item })}>
            <View style={styles.cardHeader}>
                <Text style={[styles.symbol, { color: colors.text }]}>{item.symbol}</Text>
                <Text style={[styles.price, { color: colors.accent }]}>₹{item.current_price?.toFixed(2)}</Text>
            </View>
            <Text style={[styles.name, { color: colors.textSecondary }]}>{item.company_name}</Text>
            <Text style={[styles.sector, { color: colors.textSecondary }]}>{item.sector}</Text>
        </TouchableOpacity>
    );

    return (
        <LinearGradient colors={colors.background} style={styles.container}>
            <Text style={[styles.pageTitle, { color: colors.textSecondary }]}>Results for: "{title}"</Text>
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
    container: { flex: 1, padding: 20, paddingTop: 60 },
    pageTitle: { marginBottom: 20, fontSize: 16, fontStyle: 'italic' },
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
    sector: { fontSize: 12, marginTop: 5 }
});
