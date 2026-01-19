import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, FlatList } from 'react-native';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const { logout } = useContext(AuthContext);
    const { colors, toggleTheme, isDark } = useTheme();

    // Insights State
    const [trending, setTrending] = useState({ gainers: [], losers: [] });
    const [marketNews, setMarketNews] = useState([]);
    const [insightsLoading, setInsightsLoading] = useState(true);

    // Investment Tips
    const investmentTips = [
        { icon: "💡", tip: "Diversification is key - don't put all your eggs in one basket!" },
        { icon: "📊", tip: "A low P/E ratio doesn't always mean a good deal. Look at the bigger picture." },
        { icon: "🎯", tip: "Set clear investment goals before making any stock purchase." },
        { icon: "⏰", tip: "Time in the market beats timing the market." },
        { icon: "📈", tip: "Focus on companies with consistent revenue growth over 3-5 years." },
        { icon: "💰", tip: "High dividend yield can indicate a mature, stable company." },
        { icon: "🔍", tip: "Always check a company's debt-to-equity ratio before investing." },
        { icon: "🚀", tip: "ROE above 15% often indicates efficient management." },
        { icon: "📉", tip: "Market corrections are normal - don't panic sell!" },
        { icon: "🎓", tip: "Invest in what you understand. Research before you invest." },
        { icon: "⚖️", tip: "Balance growth stocks with stable dividend-paying stocks." },
        { icon: "🔔", tip: "Set price alerts to catch good buying opportunities." },
        { icon: "📱", tip: "Review your portfolio quarterly, not daily." },
        { icon: "🌟", tip: "Quality over quantity - 10 good stocks beat 50 mediocre ones." },
        { icon: "💎", tip: "Look for companies with strong competitive advantages (moats)." }
    ];

    const [tipIndex, setTipIndex] = useState(Math.floor(Math.random() * investmentTips.length));


    useEffect(() => {
        fetchInsights();
        const interval = setInterval(fetchInsights, 60000); // Poll every 1 min
        return () => clearInterval(interval);
    }, []);

    const fetchInsights = async () => {
        try {
            const [trendRes, newsRes] = await Promise.all([
                client.get('/market/trending'),
                client.get('/market/news')
            ]);
            setTrending(trendRes.data);
            setMarketNews(newsRes.data);
        } catch (e) {
            console.log("Error fetching insights", e);
        } finally {
            setInsightsLoading(false);
        }
    };

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
        <LinearGradient colors={colors.background} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={logout}>
                        <Ionicons name="log-out-outline" size={28} color={colors.danger} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>AI Stock Screener</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 15 }}>
                            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={26} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Portfolio')}>
                            <Ionicons name="pie-chart-outline" size={28} color={colors.text} style={{ marginRight: 15 }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
                            <Ionicons name="notifications-outline" size={28} color={colors.text} style={{ marginRight: 15 }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Watchlist')}>
                            <Ionicons name="star-outline" size={28} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.heroSection}>
                    <Text style={[styles.heroText, { color: colors.text }]}>What are you looking for?</Text>
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>Try "High PE stocks" or "Reliance details"</Text>
                </View>

                <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Ask me anything about stocks..."
                        placeholderTextColor={colors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity onPress={handleSearch} style={[styles.searchIcon, { backgroundColor: colors.accent }]}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={24} color="#fff" />}
                    </TouchableOpacity>
                </View>

                {/* Investment Wisdom */}
                <TouchableOpacity
                    onPress={() => setTipIndex(Math.floor(Math.random() * investmentTips.length))}
                    activeOpacity={0.7}
                    style={styles.tipContainer}
                >
                    <Text style={styles.tipIcon}>{investmentTips[tipIndex].icon}</Text>
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                        "{investmentTips[tipIndex].tip}"
                    </Text>
                    <Ionicons name="refresh-circle-outline" size={20} color={colors.textSecondary} style={{ opacity: 0.5, marginLeft: 8 }} />
                </TouchableOpacity>


                {/* Suggestions Chips */}
                <View style={styles.suggestions}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 }]}>Quick Ask:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        <SuggestionItem text="Stocks with PE < 20 and ROE > 15" onPress={setQuery} colors={colors} />
                        <SuggestionItem text="Show me Debt free companies" onPress={setQuery} colors={colors} />
                        <SuggestionItem text="HDFCBANK technicals" onPress={setQuery} colors={colors} />
                    </ScrollView>
                </View>

                {/* Market Insights Section */}
                {insightsLoading ? (
                    <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
                ) : (
                    <>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Market Movers 🚀</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {trending.gainers?.map(item => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.moverCard, { backgroundColor: colors.card, borderColor: 'rgba(0,255,131,0.3)' }]}
                                        onPress={() => navigation.navigate('StockDetail', { stock: item })}
                                    >
                                        <Text style={[styles.moverSymbol, { color: colors.text }]}>{item.symbol}</Text>
                                        <Text style={[styles.moverPrice, { color: colors.accent }]}>₹{item.current_price?.toFixed(2)}</Text>
                                        <Text style={[styles.moverChange, { color: colors.accent }]}>+{item.change_percent?.toFixed(2)}%</Text>
                                    </TouchableOpacity>
                                ))}
                                {trending.losers?.map(item => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.moverCard, { backgroundColor: colors.card, borderColor: 'rgba(255,77,77,0.3)' }]}
                                        onPress={() => navigation.navigate('StockDetail', { stock: item })}
                                    >
                                        <Text style={[styles.moverSymbol, { color: colors.text }]}>{item.symbol}</Text>
                                        <Text style={[styles.moverPrice, { color: colors.danger }]}>₹{item.current_price?.toFixed(2)}</Text>
                                        <Text style={[styles.moverChange, { color: colors.danger }]}>{item.change_percent?.toFixed(2)}%</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Latest News 📰</Text>
                            {marketNews.map(item => (
                                <View key={item.id} style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={styles.newsHeader}>
                                        <Text style={[styles.newsSymbol, { color: colors.accent }]}>{item.stock?.symbol}</Text>
                                        <Text style={[styles.newsDate, { color: colors.textSecondary }]}>{new Date(item.published_at).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={[styles.newsHeadline, { color: colors.text }]}>{item.headline}</Text>
                                    {/* Sentiment Dot */}
                                    <View style={[styles.sentimentDot, {
                                        backgroundColor: item.sentiment === 'POSITIVE' ? colors.accent :
                                            item.sentiment === 'NEGATIVE' ? colors.danger : colors.textSecondary
                                    }]} />
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </LinearGradient>
    );
}

const SuggestionItem = ({ text, onPress, colors }) => (
    <TouchableOpacity style={[styles.chip, { backgroundColor: colors.card }]} onPress={() => onPress(text)}>
        <Text style={[styles.chipText, { color: colors.textSecondary }]}>{text}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 20, paddingTop: 60, paddingBottom: 100 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    heroSection: { marginBottom: 20 },
    heroText: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
    subText: { fontSize: 14 },
    searchContainer: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 5,
        marginBottom: 20,
        borderWidth: 1,
        elevation: 5
    },
    input: {
        flex: 1,
        height: 50,
        paddingHorizontal: 15,
        fontSize: 16
    },
    searchIcon: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    suggestions: { marginBottom: 30 },
    sectionTitle: { marginBottom: 15, fontSize: 18, fontWeight: 'bold' },
    chipScroll: { flexDirection: 'row' },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 10,
    },
    chipText: { fontSize: 12 },

    // Investment Wisdom
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    tipIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        fontStyle: 'italic',
    },

    // Market Movers
    section: { marginBottom: 30 },
    moverCard: {
        width: 120,
        padding: 15,
        borderRadius: 16,
        marginRight: 10,
        borderWidth: 1,
        alignItems: 'center'
    },
    moverSymbol: { fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
    moverPrice: { fontSize: 16, fontWeight: 'bold' },
    moverChange: { fontSize: 12, marginTop: 2 },

    // Latest News
    newsCard: {
        padding: 15,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        position: 'relative'
    },
    newsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    newsSymbol: { fontWeight: 'bold', fontSize: 12 },
    newsDate: { fontSize: 10 },
    newsHeadline: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    sentimentDot: {
        position: 'absolute',
        top: 15,
        right: 15,
        width: 8,
        height: 8,
        borderRadius: 4
    }
});
