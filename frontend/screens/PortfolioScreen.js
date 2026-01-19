import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function PortfolioScreen({ navigation }) {
    const { colors } = useTheme();
    const [portfolio, setPortfolio] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Summary State
    const [totalValue, setTotalValue] = useState(0);
    const [totalInvested, setTotalInvested] = useState(0);
    const [totalPnL, setTotalPnL] = useState(0);
    const [dayGain, setDayGain] = useState(0);

    // Chart Data
    const [sectorData, setSectorData] = useState([]);

    // Sell Modal State
    const [sellModalVisible, setSellModalVisible] = useState(false);
    const [sellItem, setSellItem] = useState(null);
    const [sellQty, setSellQty] = useState('');
    const [sellPrice, setSellPrice] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchPortfolio();
        }, [])
    );

    const fetchPortfolio = async () => {
        try {
            const res = await client.get('/portfolio');
            const data = Array.isArray(res.data) ? res.data : [];
            setPortfolio(data);

            // Calculate Totals & Analytics
            let tVal = 0;
            let tInv = 0;
            let dGain = 0;
            const sectorMap = {};

            data.forEach(item => {
                const currVal = item.current_value || 0;
                const invVal = item.invested_value || 0;

                tVal += currVal;
                tInv += invVal;

                // Daily Gain Calculation: (Current - PrevClose) * Qty
                const prevClose = item.stock?.previous_close || item.stock?.current_price || 0;
                const currPrice = item.stock?.current_price || 0;
                dGain += (currPrice - prevClose) * item.quantity;

                // Sector Aggregation
                const sector = item.stock?.sector || 'Other';
                sectorMap[sector] = (sectorMap[sector] || 0) + currVal;
            });

            setTotalValue(tVal);
            setTotalInvested(tInv);
            setTotalPnL(tVal - tInv);
            setDayGain(dGain);

            // Prepare Pie Chart Data
            const chartColors = ['#00ff83', '#6c63ff', '#ff00d4', '#00d4ff', '#ffbe0b', '#ff4d4d'];
            const pData = Object.keys(sectorMap).map((sec, i) => ({
                value: sectorMap[sec],
                color: chartColors[i % chartColors.length],
                text: sec,
                legendFontColor: colors.text,
                legendFontSize: 12
            })).sort((a, b) => b.value - a.value);

            setSectorData(pData);
            setLoading(false);
        } catch (e) {
            console.log("Error fetching portfolio", e);
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchPortfolio();
        setRefreshing(false);
    };

    if (loading) return (
        <LinearGradient colors={colors.background} style={[styles.container, styles.center]}>
            <ActivityIndicator size="large" color={colors.accent} />
        </LinearGradient>
    );

    const handleSell = (item) => {
        setSellItem(item);
        setSellQty(item.quantity.toString());
        setSellPrice(item.stock.current_price?.toString());
        setSellModalVisible(true);
    };

    const confirmSell = async () => {
        const qty = parseInt(sellQty);
        const price = parseFloat(sellPrice);

        if (!qty || qty <= 0 || !price || price <= 0) {
            Alert.alert("Invalid Input", "Please enter valid quantity and price");
            return;
        }

        if (qty > sellItem.quantity) {
            Alert.alert("Invalid Quantity", `You only own ${sellItem.quantity} shares`);
            return;
        }

        try {
            await client.post('/portfolio/sell', {
                stock_id: sellItem.stock.id,
                quantity: qty,
                price: price
            });
            setSellModalVisible(false);
            Alert.alert("Success", `Sold ${qty} shares of ${sellItem.stock.symbol}`);
            fetchPortfolio(); // Refresh list
        } catch (e) {
            Alert.alert("Error", "Sell failed");
        }
    };

    return (
        <LinearGradient colors={colors.background} style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Portfolio</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />}
            >
                {/* Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.summaryRow}>
                        <View>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Current Value</Text>
                            <Text style={[styles.summaryValue, { color: colors.text }]}>₹{totalValue.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Returns</Text>
                            <Text style={[styles.summaryValue, { color: totalPnL >= 0 ? colors.accent : colors.danger }]}>
                                {totalPnL >= 0 ? '+' : ''}₹{Math.abs(totalPnL).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.checkline, { backgroundColor: colors.border }]} />
                    <View style={[styles.summaryRow, { marginTop: 5 }]}>
                        <Text style={[styles.summarySubText, { color: colors.textSecondary }]}>Invested: <Text style={{ color: colors.text }}>₹{totalInvested.toLocaleString('en-IN')}</Text></Text>
                        <Text style={[styles.summarySubText, { color: totalPnL >= 0 ? colors.accent : colors.danger }]}>
                            {totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(2) : '0.00'}%
                        </Text>
                    </View>
                    <View style={[styles.summaryRow, { marginTop: 10 }]}>
                        <Text style={[styles.summarySubText, { color: colors.textSecondary }]}>Day's Gain:</Text>
                        <Text style={[styles.summarySubText, { color: dayGain >= 0 ? colors.accent : colors.danger, fontWeight: 'bold' }]}>
                            {dayGain >= 0 ? '+' : ''}₹{Math.abs(dayGain).toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Sector Allocation */}
                {sectorData.length > 0 && (
                    <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sector Allocation</Text>
                        <View style={styles.pieContainer}>
                            <PieChart
                                data={sectorData}
                                donut
                                radius={70}
                                innerRadius={45}
                                textSize={10}
                                showText
                                textColor={colors.text}
                                fontWeight="bold"
                            />
                            {/* Simple Legend */}
                            <View style={styles.legendContainer}>
                                {sectorData.map((item, index) => (
                                    <View key={index} style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>{item.text} ({((item.value / totalValue) * 100).toFixed(1)}%)</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* Holdings List */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Holdings ({portfolio.length})</Text>
                {!Array.isArray(portfolio) || portfolio.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: colors.text }]}>No holdings yet.</Text>
                        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Buy stocks to see them here.</Text>
                    </View>
                ) : (
                    portfolio.map((item, index) => (
                        <TouchableOpacity
                            key={item.id || index}
                            style={[styles.item, { backgroundColor: colors.card }]}
                            onPress={() => item.stock ? navigation.navigate('StockDetail', { stock: item.stock }) : null}
                        >
                            <View style={styles.row}>
                                <View>
                                    <Text style={[styles.symbol, { color: colors.text }]}>{item.stock?.symbol || 'Unknown'}</Text>
                                    <Text style={[styles.qty, { color: colors.textSecondary }]}>{item.quantity} shares • Avg ₹{item.avg_price?.toFixed(2)}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.ltp, { color: colors.text }]}>₹{item.stock?.current_price?.toFixed(2)}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.pnl, { color: (item.pnl || 0) >= 0 ? colors.accent : colors.danger }]}>
                                            {(item.pnl || 0) >= 0 ? '+' : ''}₹{Math.abs(item.pnl || 0).toFixed(2)}
                                        </Text>
                                        <Text style={[styles.pnlPct, { color: (item.pnl || 0) >= 0 ? colors.accent : colors.danger }]}>
                                            ({Math.abs(item.pnl_percent || 0).toFixed(2)}%)
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Sell Button */}
                            <TouchableOpacity
                                style={[styles.sellBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger + '50' }]}
                                onPress={() => handleSell(item)}
                            >
                                <Text style={[styles.sellBtnText, { color: colors.danger }]}>SELL</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sell Modal */}
            <Modal visible={sellModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modalBg, borderColor: colors.danger + '80' }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Sell {sellItem?.stock?.symbol}</Text>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quantity (Max: {sellItem?.quantity})</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="Qty"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={sellQty}
                                onChangeText={setSellQty}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Price</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="Price"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={sellPrice}
                                onChangeText={setSellPrice}
                            />
                        </View>

                        <Text style={[styles.totalText, { color: colors.text }]}>
                            Total Amount: <Text style={[styles.highlight, { color: colors.accent }]}>₹{((parseFloat(sellQty) || 0) * (parseFloat(sellPrice) || 0)).toFixed(2)}</Text>
                        </Text>

                        <TouchableOpacity
                            style={[styles.confirmSellBtn, { backgroundColor: colors.danger }]}
                            onPress={confirmSell}
                        >
                            <Text style={styles.confirmSellText}>Confirm Sell 📉</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setSellModalVisible(false)}>
                            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 10 },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    scrollContent: { paddingHorizontal: 20 },
    summaryCard: {
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 13, marginBottom: 5 },
    summaryValue: { fontSize: 22, fontWeight: 'bold' },
    checkline: { height: 1, marginVertical: 10 },
    summarySubText: { fontSize: 14 },

    // Chart Section
    chartSection: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 25
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    pieContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    legendContainer: { width: '45%' },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    legendText: { fontSize: 12 },

    list: {},
    item: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 10
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    symbol: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    qty: { fontSize: 13 },
    ltp: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    pnl: { fontSize: 13, marginRight: 5 },
    pnlPct: { fontSize: 13 },
    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 18, marginBottom: 10 },
    emptySub: {},

    // Sell Button Style
    sellBtn: {
        marginTop: 10,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
    },
    sellBtnText: { fontWeight: 'bold', fontSize: 13 },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        width: '85%',
        borderRadius: 20,
        padding: 25,
        borderWidth: 1,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 25,
        textAlign: 'center'
    },
    input: {
        padding: 15,
        borderRadius: 12,
        fontSize: 20,
        textAlign: 'center',
        marginBottom: 20,
        borderWidth: 1,
    },
    inputContainer: { width: '100%', marginBottom: 15 },
    inputLabel: { marginBottom: 5, marginLeft: 5 },
    totalText: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
    highlight: { fontWeight: 'bold' },

    confirmSellBtn: {
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 15
    },
    confirmSellText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    cancelText: {
        textAlign: 'center',
        fontSize: 14,
        marginTop: 10
    }
});
