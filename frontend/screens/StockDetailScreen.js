import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import StockChart from '../components/StockChart';
import { useTheme } from '../context/ThemeContext';
import { BarChart } from "react-native-gifted-charts"; // Correct Import Location

export default function StockDetailScreen({ route }) {
    const { stock } = route.params;
    const { colors, isDark } = useTheme(); // Use Theme
    const [details, setDetails] = useState(stock);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Chart State
    const [chartData, setChartData] = useState([]);
    const [timeframe, setTimeframe] = useState('1y');
    const [chartType, setChartType] = useState('line');

    const [buyModalVisible, setBuyModalVisible] = useState(false);
    const [buyQty, setBuyQty] = useState('1');
    const [buyPrice, setBuyPrice] = useState('');

    const [alertModalVisible, setAlertModalVisible] = useState(false);
    const [targetPrice, setTargetPrice] = useState('');
    const [alertCondition, setAlertCondition] = useState('ABOVE'); // or BELOW

    // New State for Visual Feedback
    const [hasAlert, setHasAlert] = useState(false);
    const [creatingAlert, setCreatingAlert] = useState(false);

    useEffect(() => {
        fetchDetails();
        fetchAnalysis();
    }, []);

    useEffect(() => {
        fetchHistory();

        // Auto-refresh every 60 seconds
        const intervalId = setInterval(() => {
            fetchHistory();
            fetchDetails();
        }, 60000);

        return () => clearInterval(intervalId);
    }, [timeframe]);

    const [activeTab, setActiveTab] = useState('Overview');
    const [financials, setFinancials] = useState(null);
    const [news, setNews] = useState([]);

    useEffect(() => {
        if (activeTab === 'Financials' && !financials) fetchFinancials();
        if (activeTab === 'News' && news.length === 0) fetchNews();
    }, [activeTab]);

    const fetchFinancials = async () => {
        try {
            const res = await client.get(`/stock/${stock.symbol}/financials`);
            if (res.data) setFinancials(res.data);
        } catch (e) {
            console.log("Error fetching financials", e);
        }
    };

    const fetchNews = async () => {
        try {
            const res = await client.get(`/stock/${stock.symbol}/news`);
            if (res.data) setNews(res.data);
        } catch (e) {
            console.log("Error fetching news", e);
        }
    };

    const fetchHistory = async () => {
        try {
            let period = '1y';
            let interval = '1d';

            if (timeframe === '1d') { period = '1d'; interval = '5m'; }
            if (timeframe === '1w') { period = '5d'; interval = '15m'; }
            if (timeframe === '1m') { period = '1mo'; interval = '1d'; }
            if (timeframe === '1y') { period = '1y'; interval = '1d'; }

            const res = await client.get(`/stock/${stock.symbol}/history?period=${period}&interval=${interval}`);
            setChartData(res.data);
        } catch (e) {
            console.log("Error fetching history", e);
        }
    };

    const fetchDetails = async () => {
        try {
            const response = await client.get(`/stock/${stock.symbol}`);
            setDetails(response.data);
            setLoading(false);
        } catch (e) {
            console.log("Error fetching details", e);
            setLoading(false);
        }
    };

    const fetchAnalysis = async () => {
        setAnalyzing(true);
        try {
            const res = await client.get(`/stock/${stock.symbol}/pros-cons`);
            setAnalysis(res.data);
        } catch (e) {
            console.log("Error fetching analysis", e);
        } finally {
            setAnalyzing(false);
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

    const handleBuy = () => {
        setBuyPrice(details.current_price?.toString());
        setBuyModalVisible(true);
    };

    const confirmBuy = async () => {
        const qty = parseInt(buyQty);
        const price = parseFloat(buyPrice);

        if (!qty || qty <= 0 || !price || price <= 0) {
            Alert.alert("Invalid Input", "Please enter valid quantity and price");
            return;
        }

        try {
            await client.post('/portfolio/add', {
                stock_id: details.id,
                quantity: qty,
                price: price
            });
            setBuyModalVisible(false);
            Alert.alert("Success", `Bought ${qty} shares of ${details.symbol} at ₹${price}`);
        } catch (e) {
            Alert.alert("Error", "Buy failed");
        }
    };

    const handleCreateAlert = async () => {
        if (!targetPrice) {
            Alert.alert("Missing Input", "Please enter a target price");
            return;
        }

        const price = parseFloat(targetPrice);
        if (isNaN(price)) {
            Alert.alert("Invalid Input", "Please enter a valid number for price");
            return;
        }

        // Ensure we have a valid stock_id
        if (!details || !details.id) {
            Alert.alert("Data Error", "Stock details are not fully loaded yet. Please wait a moment.");
            return;
        }

        setCreatingAlert(true);

        try {
            console.log(`Setting alert for ${details.symbol} (ID: ${details.id}) ${alertCondition} ${price}`);

            await client.post('/alerts', {
                stock_id: details.id,
                target_price: price,
                condition: alertCondition
            });


            // Expert Fix: Close immediately, No blocking Alert.
            setAlertModalVisible(false);
            setTargetPrice('');
            setHasAlert(true); // Visually update the bell

        } catch (err) {
            console.error("Alert creation failed:", err);
            const msg = err.response?.data?.detail || "Could not connect to server";
            Alert.alert('Error', `Failed to set alert: ${msg}`);
        } finally {
            setCreatingAlert(false);
        }
    };

    if (loading) return (
        <LinearGradient colors={colors.background} style={[styles.container, styles.center]}>
            <ActivityIndicator size="large" color={colors.accent} />
        </LinearGradient>
    );

    return (
        <LinearGradient colors={colors.background} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.symbol, { color: colors.text }]}>{details.symbol}</Text>
                        <Text style={[styles.name, { color: colors.textSecondary }]}>{details.company_name}</Text>
                    </View>
                    <View>
                        <Text style={[styles.price, { color: colors.accent }]}>₹{details.current_price?.toFixed(2)}</Text>
                        <Text style={[styles.sector, { color: colors.textSecondary }]}>{details.sector}</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={[styles.tabContainer, { backgroundColor: colors.tabBar }]}>
                    {['Overview', 'Technicals', 'Financials', 'News'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && { backgroundColor: colors.tabActive }]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && { color: colors.text }, { color: activeTab === tab ? colors.text : colors.textSecondary }]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTab === 'Overview' && (
                    <>
                        {/* Chart Controls */}
                        <View style={styles.controls}>
                            <View style={[styles.toggles, { backgroundColor: colors.inputBg }]}>
                                {['1d', '1w', '1m', '1y'].map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.toggleBtn, timeframe === t && { backgroundColor: colors.accent }]}
                                        onPress={() => setTimeframe(t)}
                                    >
                                        <Text style={[styles.toggleText, timeframe === t ? { color: '#fff' } : { color: colors.textSecondary }]}>{t.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={[styles.toggles, { backgroundColor: colors.inputBg }]}>
                                <TouchableOpacity onPress={() => setChartType(chartType === 'line' ? 'candle' : 'line')}>
                                    <Ionicons
                                        name={chartType === 'line' ? "cellular-outline" : "trending-up-outline"}
                                        size={20}
                                        color={colors.text}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <StockChart data={chartData} type={chartType} timeframe={timeframe} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Fundamentals</Text>
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
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Technicals</Text>
                            <View style={styles.grid}>
                                <InfoBox label="RSI (14)" value={details.technicals?.rsi_14?.toFixed(2)} />
                                <InfoBox label="MACD" value={details.technicals?.macd?.toFixed(2)} />
                            </View>

                        </View>

                        {/* Pros & Cons Section */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Analysis (Beta)</Text>
                            {analyzing ? (
                                <ActivityIndicator color={colors.accent} style={{ marginTop: 10 }} />
                            ) : analysis ? (
                                <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={styles.analysisGroup}>
                                        <Text style={[styles.groupTitle, { color: colors.accent }]}>Pros 🟢</Text>
                                        {analysis.pros?.map((point, i) => (
                                            <View key={i} style={styles.pointRow}>
                                                <Ionicons name="checkmark-circle" size={16} color={colors.accent} style={{ marginTop: 2, marginRight: 5 }} />
                                                <Text style={[styles.pointText, { color: colors.text }]}>{point}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                                    <View style={styles.analysisGroup}>
                                        <Text style={[styles.groupTitle, { color: colors.danger }]}>Cons 🔴</Text>
                                        {analysis.cons?.map((point, i) => (
                                            <View key={i} style={styles.pointRow}>
                                                <Ionicons name="close-circle" size={16} color={colors.danger} style={{ marginTop: 2, marginRight: 5 }} />
                                                <Text style={[styles.pointText, { color: colors.text }]}>{point}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
                                        Disclaimer: Generated by AI for informational purposes only. Not investment advice.
                                    </Text>
                                </View>
                            ) : (
                                <Text style={{ color: colors.textSecondary }}>Analysis unavailable.</Text>
                            )}
                        </View>
                    </>
                )}

                {activeTab === 'Technicals' && <TechnicalsTab stock={details} />}
                {activeTab === 'Financials' && <FinancialsTab data={financials} />}
                {activeTab === 'News' && <NewsTab data={news} />}

                {/* Alert Modal */}
                <Modal visible={alertModalVisible} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.modalBg, borderColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Set Price Alert for {stock?.symbol}</Text>

                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="Target Price"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={targetPrice}
                                onChangeText={setTargetPrice}
                            />

                            <View style={styles.conditionRow}>
                                <TouchableOpacity
                                    style={[styles.condBtn, { backgroundColor: colors.card }, alertCondition === 'ABOVE' && { backgroundColor: colors.accent }]}
                                    onPress={() => setAlertCondition('ABOVE')}>
                                    <Text style={[styles.condText, { color: alertCondition === 'ABOVE' ? '#000' : colors.text }]}>Above</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.condBtn, { backgroundColor: colors.card }, alertCondition === 'BELOW' && { backgroundColor: colors.accent }]}
                                    onPress={() => setAlertCondition('BELOW')}>
                                    <Text style={[styles.condText, { color: alertCondition === 'BELOW' ? '#000' : colors.text }]}>Below</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.setAlertBtn, { backgroundColor: colors.accent }, creatingAlert && { opacity: 0.7 }]}
                                onPress={handleCreateAlert}
                                disabled={creatingAlert}
                            >
                                {creatingAlert ? (
                                    <ActivityIndicator color={colors.modalBg} />
                                ) : (
                                    <Text style={[styles.setAlertText, { color: '#000' }]}>Set Alert 🔔</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setAlertModalVisible(false)}>
                                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Buy Modal */}
                <Modal visible={buyModalVisible} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.modalBg, borderColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Buy {stock?.symbol}</Text>

                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quantity</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                    placeholder="Qty"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={buyQty}
                                    onChangeText={setBuyQty}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Price</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                    placeholder="Price"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={buyPrice}
                                    onChangeText={setBuyPrice}
                                />
                            </View>

                            <Text style={[styles.totalText, { color: colors.text }]}>
                                Approx Amount: <Text style={[styles.highlight, { color: colors.accent }]}>₹{((parseFloat(buyQty) || 0) * (parseFloat(buyPrice) || 0)).toFixed(2)}</Text>
                            </Text>

                            <TouchableOpacity
                                style={[styles.setAlertBtn, { backgroundColor: colors.accent, marginTop: 10 }]}
                                onPress={confirmBuy}
                            >
                                <Text style={[styles.setAlertText, { color: '#000' }]}>Buy Shares 🚀</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setBuyModalVisible(false)}>
                                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>



            <View style={[styles.actions, { backgroundColor: colors.tabBar }]}>
                <TouchableOpacity style={[styles.actionBtn, styles.watchBtn, { backgroundColor: colors.tabActive, borderColor: colors.border }]} onPress={addToWatchlist} disabled={adding}>
                    {adding ? <ActivityIndicator color={colors.text} /> : <Ionicons name="star-outline" size={24} color={colors.text} />}
                </TouchableOpacity>
                <View style={{ width: 15 }} />

                {/* Bell Icon: Changes to filled if hasAlert is true */}
                <TouchableOpacity style={[styles.actionBtn, styles.watchBtn, { backgroundColor: colors.tabActive, borderColor: colors.border }]} onPress={() => setAlertModalVisible(true)}>
                    <Ionicons
                        name={hasAlert ? "notifications" : "notifications-outline"}
                        size={24}
                        color={hasAlert ? colors.accent : colors.text}
                    />
                </TouchableOpacity>
                <View style={{ width: 15 }} />

                <TouchableOpacity style={[styles.actionBtn, styles.buyBtn, { backgroundColor: colors.accent }]} onPress={handleBuy}>
                    <Text style={styles.actionText}>BUY</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient >
    );
}

const InfoBox = ({ label, value, isCurrency }) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{isCurrency ? '₹' : ''}{value || 'N/A'}</Text>
        </View>
    );
};

const TechnicalsTab = ({ stock }) => {
    const { colors } = useTheme();
    const techs = stock.technicals || {};
    if (!stock.technicals) return <View style={{ padding: 20 }}><Text style={{ color: colors.textSecondary }}>No technical data available.</Text></View>;

    const rsiColor = techs.rsi_14 > 70 ? colors.danger : techs.rsi_14 < 30 ? colors.accent : colors.warning;
    const rsiStatus = techs.rsi_14 > 70 ? 'Overbought' : techs.rsi_14 < 30 ? 'Oversold' : 'Neutral';

    return (
        <ScrollView style={styles.tabContent}>
            {/* Trend Summary */}
            <View style={[styles.techCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Trend Analysis</Text>
                <View style={styles.gaugeContainer}>
                    <Text style={[styles.gaugeVal, { color: rsiColor }]}>{techs.rsi_14?.toFixed(2) || '50.00'}</Text>
                    <Text style={[styles.gaugeLabel, { color: colors.textSecondary }]}>RSI (14)</Text>
                    <Text style={[styles.badge, { backgroundColor: rsiColor + '30', color: rsiColor }]}>{rsiStatus}</Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.row}>
                    <View>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>MACD</Text>
                        <Text style={[styles.val, { color: colors.text }]}>{techs.macd?.toFixed(2) || '0.00'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Signal</Text>
                        <Text style={[styles.val, { color: techs.macd > 0 ? colors.accent : colors.danger }]}>
                            {techs.macd > 0 ? 'BULLISH' : 'BEARISH'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.row, { marginTop: 15 }]}>
                    <View>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>SMA 50</Text>
                        <Text style={[styles.val, { color: colors.text }]}>{techs.sma_50?.toFixed(2) || '0.00'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>SMA 200</Text>
                        <Text style={[styles.val, { color: colors.text }]}>{techs.sma_200?.toFixed(2) || '0.00'}</Text>
                    </View>
                </View>
            </View>

            {/* Price Levels (Pivots) */}
            <View style={[styles.techCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Key Levels (Pivot)</Text>
                <View style={[styles.levelRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>Resistance 1 (R1)</Text>
                    <Text style={[styles.levelVal, { color: colors.text }]}>₹{techs.r1?.toFixed(2) || '-'}</Text>
                </View>
                <View style={[styles.levelRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>Pivot Point (PP)</Text>
                    <Text style={[styles.levelVal, { color: colors.warning }]}>₹{techs.pivot_point?.toFixed(2) || '-'}</Text>
                </View>
                <View style={[styles.levelRow, { borderBottomColor: 'transparent' }]}>
                    <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>Support 1 (S1)</Text>
                    <Text style={[styles.levelVal, { color: colors.text }]}>₹{techs.s1?.toFixed(2) || '-'}</Text>
                </View>
            </View>
        </ScrollView>
    );
};

const FinancialsTab = ({ data }) => {
    const { colors } = useTheme();
    if (!data) return <ActivityIndicator color={colors.accent} />;

    // Parse JSON strings
    let revHist = [], profHist = [], shareholding = {};
    try {
        revHist = data.revenue_history ? JSON.parse(data.revenue_history) : [];
        profHist = data.profit_history ? JSON.parse(data.profit_history) : [];
        shareholding = data.shareholding ? JSON.parse(data.shareholding) : {};
    } catch (e) {
        console.log("JSON Parse error", e);
    }

    // Prepare Bar Chart Data
    const revenueData = revHist.map(item => ({
        value: item.value,
        label: item.year.toString().slice(2), // '2023' -> '23'
        frontColor: colors.accent,
        topLabelComponent: () => <Text style={{ color: colors.text, fontSize: 10, marginBottom: 2 }}>{(item.value / 1000).toFixed(1)}k</Text>
    }));

    const profitData = profHist.map(item => ({
        value: item.value,
        label: item.year.toString().slice(2),
        frontColor: '#4dabf7', // Blueish
        topLabelComponent: () => <Text style={{ color: colors.text, fontSize: 10, marginBottom: 2 }}>{(item.value / 1000).toFixed(1)}k</Text>
    }));

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue Trend (Cr)</Text>
            {revenueData.length > 0 ? (
                <View style={{ marginVertical: 10 }}>
                    <BarChart
                        data={revenueData}
                        barWidth={30}
                        noOfSections={4}
                        barBorderRadius={4}
                        frontColor={colors.accent}
                        yAxisThickness={0}
                        xAxisThickness={1}
                        xAxisColor={colors.border}
                        yAxisTextStyle={{ color: colors.textSecondary }}
                        xAxisLabelTextStyle={{ color: colors.textSecondary }}
                        isAnimated
                        hideRules
                        width={300}
                        height={180}
                    />
                </View>
            ) : <Text style={{ color: colors.textSecondary }}>No data</Text>}

            <Text style={[styles.sectionTitle, { marginTop: 20, color: colors.text }]}>Net Profit Trend (Cr)</Text>
            {profitData.length > 0 ? (
                <View style={{ marginVertical: 10 }}>
                    <BarChart
                        data={profitData}
                        barWidth={30}
                        noOfSections={4}
                        barBorderRadius={4}
                        frontColor={colors.activeTab}
                        yAxisThickness={0}
                        xAxisThickness={1}
                        xAxisColor={colors.border}
                        yAxisTextStyle={{ color: colors.textSecondary }}
                        xAxisLabelTextStyle={{ color: colors.textSecondary }}
                        isAnimated
                        hideRules
                        width={300}
                        height={180}
                    />
                </View>
            ) : <Text style={{ color: colors.textSecondary }}>No data</Text>}

            <Text style={[styles.sectionTitle, { marginTop: 20, color: colors.text }]}>Shareholding Pattern</Text>
            <View style={styles.grid}>
                {Object.keys(shareholding).map(key => (
                    <InfoBox key={key} label={key} value={shareholding[key] + '%'} />
                ))}
            </View>
        </View>
    );
};

const NewsTab = ({ data }) => {
    const { colors } = useTheme();
    return (
        <View style={styles.section}>
            {data.length === 0 ? <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent news.</Text> :
                data.map(item => (
                    <View key={item.id} style={[styles.newsItem, { backgroundColor: colors.card }]}>
                        <View style={styles.newsHeader}>
                            <Text style={[styles.sentimentBadge,
                            {
                                backgroundColor: item.sentiment === 'POSITIVE' ? 'rgba(0,255,131,0.2)' :
                                    item.sentiment === 'NEGATIVE' ? 'rgba(255,77,77,0.2)' : 'rgba(255,255,255,0.1)',
                                color: item.sentiment === 'POSITIVE' ? colors.accent : item.sentiment === 'NEGATIVE' ? colors.danger : colors.text
                            }]}>
                                {item.sentiment}
                            </Text>
                            <Text style={[styles.newsDate, { color: colors.textSecondary }]}>{new Date(item.published_at).toLocaleDateString()}</Text>
                        </View>
                        <Text style={[styles.newsTitle, { color: colors.text }]}>{item.headline}</Text>
                        <Text style={[styles.newsSummary, { color: colors.textSecondary }]}>{item.summary}</Text>
                    </View>
                ))
            }
        </View>
    );
};

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
    actions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 10,
        backgroundColor: '#24243e',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end', // Align to right
        paddingRight: 20
    },
    actionBtn: {
        borderRadius: 20, // More rounded 
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyBtn: {
        width: 100, // Fixed width, not stretching
        height: 40, // Smaller height
        backgroundColor: '#00ff83',
        marginRight: 0 // Remove margin since we have spacing View
    },
    watchBtn: {
        width: 40, // Square-ish
        height: 40,
        backgroundColor: '#302b63',
        borderWidth: 1,
        borderColor: '#6c63ff'
    },
    actionText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    toggles: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 4
    },
    toggleBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16
    },
    activeToggle: {
        backgroundColor: '#6c63ff'
    },
    toggleText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
    activeText: { color: '#fff' },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#24243e',
        borderRadius: 20,
        padding: 25,
        borderWidth: 1,
        borderColor: 'rgba(108, 99, 255, 0.5)',
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10
    },
    modalTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 25,
        textAlign: 'center'
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: '#fff',
        padding: 15,
        borderRadius: 12,
        fontSize: 20,
        textAlign: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    conditionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30
    },
    condBtn: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 5
    },
    condBtnActive: {
        backgroundColor: '#6c63ff'
    },
    condText: {
        color: '#fff',
        fontWeight: '600'
    },
    setAlertBtn: {
        backgroundColor: '#00ff83',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 15
    },
    setAlertText: {
        color: '#0f0c29',
        fontWeight: 'bold',
        fontSize: 16
    },
    cancelText: {
        color: '#aaa',
        textAlign: 'center',
        fontSize: 14,
        marginTop: 15
    },
    inputContainer: { width: '100%', marginBottom: 15 },
    inputLabel: { color: '#ccc', marginBottom: 5, marginLeft: 5 },
    totalText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20 },
    highlight: { color: '#00ff83', fontWeight: 'bold' },

    // Tab Styles
    tabContainer: { flexDirection: 'row', backgroundColor: '#24243e', borderRadius: 12, padding: 4, marginBottom: 15 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: '#302b63' },
    tabText: { color: '#888', fontWeight: 'bold' },
    activeTabText: { color: '#fff' },

    // New Features Styles
    trendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    yearText: { color: '#ccc', width: 50, fontSize: 12 },
    bar: { height: 10, backgroundColor: '#00ff83', borderRadius: 5, marginRight: 10 },
    valText: { color: '#fff', fontSize: 12, marginLeft: 5 },

    newsItem: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 10 },
    newsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    sentimentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 10, fontWeight: 'bold', overflow: 'hidden', color: '#fff' },
    newsDate: { color: '#888', fontSize: 12 },
    newsTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
    newsSummary: { color: '#ccc', fontSize: 12, lineHeight: 18 },

    // Technicals Styles
    techCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    gaugeContainer: { alignItems: 'center', marginBottom: 15 },
    gaugeVal: { fontSize: 36, fontWeight: 'bold' },
    gaugeLabel: { color: '#888', fontSize: 14, marginBottom: 5 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { color: '#888', fontSize: 14 },
    val: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
    levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    levelLabel: { color: '#aaa', fontSize: 14 },
    levelVal: { color: '#fff', fontSize: 14, fontWeight: 'bold' },


    // Analysis Styles
    analysisCard: {
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20
    },
    analysisGroup: { marginBottom: 10 },
    groupTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    pointRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
    pointText: { fontSize: 14, flex: 1, lineHeight: 20 },
    disclaimer: { fontSize: 10, fontStyle: 'italic', marginTop: 10, textAlign: 'center' }
});
