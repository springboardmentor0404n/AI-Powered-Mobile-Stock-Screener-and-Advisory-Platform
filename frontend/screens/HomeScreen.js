import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import client from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons'; // Assuming expo usage

export default function HomeScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const response = await client.post('/query', { query: query });
            const { type, data } = response.data;

            setLoading(false);

            if (type === 'stock_detail') {
                navigation.navigate('StockDetail', { stock: data });
            } else if (type === 'screener_results') {
                navigation.navigate('Results', { results: data, title: query });
            } else {
                Alert.alert("No results", "Could not understand query or no data found.");
            }
        } catch (e) {
            setLoading(false);
            Alert.alert("Error", "Something went wrong. check backend connection.");
            console.log(e);
        }
    };

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>AI Stock Screener</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Watchlist')}>
                        <Ionicons name="star-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.heroSection}>
                    <Text style={styles.heroText}>What are you looking for?</Text>
                    <Text style={styles.subText}>Try "High PE stocks" or "Reliance details"</Text>
                </View>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask me anything about stocks..."
                        placeholderTextColor="#ccc"
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity onPress={handleSearch} style={styles.searchIcon}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={24} color="#fff" />}
                    </TouchableOpacity>
                </View>

                <View style={styles.suggestions}>
                    <Text style={styles.suggestionTitle}>Try asking:</Text>
                    <SuggestionItem text="Stocks with PE < 20 and ROE > 15" onPress={(t) => { setQuery(t); }} />
                    <SuggestionItem text="Show me Debt free companies" onPress={(t) => { setQuery(t); }} />
                    <SuggestionItem text="HDFCBANK technicals" onPress={(t) => { setQuery(t); }} />
                </View>
            </ScrollView>
        </LinearGradient>
    );
}

const SuggestionItem = ({ text, onPress }) => (
    <TouchableOpacity style={styles.chip} onPress={() => onPress(text)}>
        <Text style={styles.chipText}>{text}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 20, paddingTop: 60 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    heroSection: { marginBottom: 30 },
    heroText: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    subText: { fontSize: 16, color: '#aaa' },
    searchContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 5,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    input: {
        flex: 1,
        height: 50,
        color: '#fff',
        paddingHorizontal: 15,
        fontSize: 16
    },
    searchIcon: {
        width: 50,
        height: 50,
        backgroundColor: '#6c63ff',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    suggestions: { marginTop: 10 },
    suggestionTitle: { color: '#fff', marginBottom: 15, fontSize: 18, fontWeight: '600' },
    chip: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        marginBottom: 10,
        alignSelf: 'flex-start'
    },
    chipText: { color: '#ccc' }
});
