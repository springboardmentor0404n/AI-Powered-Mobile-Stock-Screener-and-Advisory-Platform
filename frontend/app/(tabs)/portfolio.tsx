import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { useRouter } from 'expo-router';
import { TrendIndicator } from '../../components/ui/TrendIndicator';
import { PieChart } from 'react-native-gifted-charts';

interface PortfolioOverview {
    total_stocks: number;
    sectors: { [key: string]: number };
    market_caps: { [key: string]: number };
    risk_level: string;
    last_refresh: string;
    concentration: {
        top_3_percentage: number;
        sector_concentration: { [key: string]: number };
    };
    top_sectors: { [key: string]: number };
}

interface Stock {
    symbol: string;
    company: string;
    sector: string;
    price: number;
    change_percent: number;
    trend: 'up' | 'down' | 'sideways';
    screener_status: 'fully_matched' | 'partially_matched' | 'not_matched';
    notes: any;
    added_date: string;
    exchange: string;
    recommendation?: 'buy' | 'sell' | 'hold';
}

interface PortfolioAnalysis {
    sector_allocation: { [key: string]: number };
    factor_bias: {
        value_vs_growth: string;
        debt_profile: string;
        earnings_momentum: string;
    };
    concentration_warnings: string[];
    correlation_analysis: {
        high_correlation_pairs: string[];
        sector_correlation: string[];
    };
}

interface Signal {
    symbol: string;
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    timestamp: string;
}

export default function PortfolioScreen() {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const router = useRouter();
    
    const [overview, setOverview] = useState<PortfolioOverview | null>(null);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedStock, setExpandedStock] = useState<string | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    useEffect(() => {
        fetchPortfolioData();
    }, []);

    const fetchPortfolioData = async () => {
        try {
            if (!refreshing) setLoading(true);
            const token = await storage.getItem('authToken');
            if (!token) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // Fetch all portfolio data in parallel
            const [overviewData, stocksData, analysisData, signalsData, summaryData] = await Promise.all([
                api.get('/api/portfolio/overview', token).catch(err => {
                    console.error('[PORTFOLIO] Overview error:', err);
                    return null;
                }),
                api.get('/api/portfolio/stocks', token).catch(err => {
                    console.error('[PORTFOLIO] Stocks error:', err);
                    return { stocks: [] };
                }),
                api.get('/api/portfolio/analysis', token).catch(err => {
                    console.error('[PORTFOLIO] Analysis error:', err);
                    return null;
                }),
                api.get('/api/portfolio/signals', token).catch(err => {
                    console.error('[PORTFOLIO] Signals error:', err);
                    return { signals: [] };
                }),
                api.get('/api/portfolio/ai-summary', token).catch(err => {
                    console.error('[PORTFOLIO] AI Summary error:', err);
                    return { summary: '' };
                })
            ]);

            setOverview(overviewData);
            setStocks(stocksData.stocks || []);
            setAnalysis(analysisData);
            setSignals(signalsData.signals || []);
            setAiSummary(summaryData.summary || '');
        } catch (error) {
            console.error('[PORTFOLIO] Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPortfolioData();
    };

    // Generate pie chart data
    const pieChartData = useMemo(() => {
        if (!analysis || !analysis.sector_allocation) return [];

        const sectorColors: { [key: string]: string } = {
            'IT': '#3B82F6',
            'Banking': '#10B981',
            'Finance': '#F59E0B',
            'Pharma': '#8B5CF6',
            'Auto': '#EF4444',
            'FMCG': '#06B6D4',
            'Energy': '#F97316',
            'Power': '#14B8A6',
            'Metals': '#6366F1',
            'Cement': '#84CC16',
            'Infrastructure': '#A855F7',
            'Retail': '#EC4899',
            'Telecom': '#3B82F6',
            'Realty': '#F43F5E',
            'Consumer': '#22D3EE',
            'Other': '#94A3B8'
        };

        return Object.entries(analysis.sector_allocation)
            .sort(([, a], [, b]) => b - a)
            .map(([sector, percentage]) => ({
                value: percentage,
                color: sectorColors[sector] || '#64748B',
                text: sector
            }));
    }, [analysis]);

    const getScreenerStatusColor = (status: string) => {
        switch (status) {
            case 'fully_matched': return '#10B981';
            case 'partially_matched': return '#F59E0B';
            case 'not_matched': return '#EF4444';
            default: return colors.textTertiary;
        }
    };

    const getScreenerStatusIcon = (status: string) => {
        switch (status) {
            case 'fully_matched': return 'checkmark-circle';
            case 'partially_matched': return 'warning';
            case 'not_matched': return 'close-circle';
            default: return 'help-circle';
        }
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up': return 'trending-up';
            case 'down': return 'trending-down';
            case 'sideways': return 'remove';
            default: return 'remove';
        }
    };

    const getRiskBadgeColor = (risk: string) => {
        switch (risk) {
            case 'Low': return '#10B981';
            case 'Medium': return '#F59E0B';
            case 'High': return '#EF4444';
            default: return colors.textTertiary;
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
                <StatusBar style="light" backgroundColor="#000000" />
                <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                            Loading portfolio...
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
            <StatusBar style="light" backgroundColor="#000000" />

            <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Portfolio</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/screener')}>
                        <Ionicons name="add-circle-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >
                    {/* 1. Portfolio Overview */}
                    {overview && (
                        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="pie-chart" size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
                            </View>

                            <View style={styles.overviewGrid}>
                                <View style={styles.overviewCard}>
                                    <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                                        Tracked Stocks
                                    </Text>
                                    <Text style={[styles.overviewValue, { color: colors.text }]}>
                                        {overview.total_stocks}
                                    </Text>
                                </View>

                                <View style={styles.overviewCard}>
                                    <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
                                        Risk Level
                                    </Text>
                                    <Text style={[styles.overviewValue, { color: getRiskBadgeColor(overview.risk_level) }]}>
                                        {overview.risk_level}
                                    </Text>
                                </View>
                            </View>

                            <Text style={[styles.overviewText, { color: colors.textSecondary }]}>
                                You are tracking {overview.total_stocks} stocks. 
                                {overview.top_sectors && Object.keys(overview.top_sectors).length > 0 && (
                                    ` Portfolio is ${overview.risk_level === 'High' ? 'highly' : 'moderately'} concentrated in ${Object.keys(overview.top_sectors)[0]} sector.`
                                )}
                            </Text>

                            <Text style={[styles.lastRefresh, { color: colors.textTertiary }]}>
                                Last updated: {new Date(overview.last_refresh).toLocaleTimeString()}
                            </Text>
                        </View>
                    )}

                    {/* 2. AI Summary */}
                    {aiSummary && (
                        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="bulb" size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Portfolio Summary</Text>
                            </View>
                            <Text style={[styles.aiSummaryText, { color: colors.text }]}>
                                {aiSummary}
                            </Text>
                        </View>
                    )}

                    {/* 3. Tracked Stocks Table */}
                    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="list" size={20} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tracked Stocks</Text>
                        </View>

                        {stocks.length > 0 ? (
                            stocks.map((stock, index) => (
                                <View key={stock.symbol}>
                                    <TouchableOpacity
                                        style={[
                                            styles.stockRow,
                                            {
                                                borderBottomWidth: index < stocks.length - 1 ? 1 : 0,
                                                borderBottomColor: colors.border
                                            }
                                        ]}
                                        onPress={() => setExpandedStock(expandedStock === stock.symbol ? null : stock.symbol)}
                                    >
                                        <View style={styles.stockMain}>
                                            <View style={styles.stockInfo}>
                                                <Text style={[styles.stockSymbol, { color: colors.text }]}>
                                                    {stock.symbol}
                                                </Text>
                                                <Text style={[styles.stockSector, { color: colors.textTertiary }]}>
                                                    {stock.sector}
                                                </Text>
                                            </View>

                                            <View style={styles.stockMetrics}>
                                                <Text style={[styles.stockPrice, { color: colors.text }]}>
                                                    ₹{stock.price.toFixed(2)}
                                                </Text>
                                                <TrendIndicator value={stock.change_percent} size="small" />
                                            </View>

                                            <View style={styles.stockStatus}>
                                                <Ionicons
                                                    name={getTrendIcon(stock.trend) as any}
                                                    size={16}
                                                    color={stock.trend === 'up' ? '#10B981' : stock.trend === 'down' ? '#EF4444' : colors.textTertiary}
                                                />
                                                <Ionicons
                                                    name={getScreenerStatusIcon(stock.screener_status) as any}
                                                    size={20}
                                                    color={getScreenerStatusColor(stock.screener_status)}
                                                />
                                            </View>
                                        </View>

                                        {/* Expanded Details */}
                                        {expandedStock === stock.symbol && (
                                            <View style={[styles.expandedContent, { backgroundColor: colors.surfaceHighlight }]}>
                                                <Text style={[styles.expandedTitle, { color: colors.text }]}>
                                                    {stock.company}
                                                </Text>
                                                <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>
                                                    Screener Status: {stock.screener_status.replace('_', ' ')}
                                                </Text>
                                                {stock.recommendation && (
                                                    <View style={[styles.recommendationBadge, { 
                                                        backgroundColor: stock.recommendation === 'buy' ? '#10B98120' : 
                                                                        stock.recommendation === 'sell' ? '#EF444420' : '#F59E0B20',
                                                        borderColor: stock.recommendation === 'buy' ? '#10B981' : 
                                                                    stock.recommendation === 'sell' ? '#EF4444' : '#F59E0B'
                                                    }]}>
                                                        <Ionicons 
                                                            name={stock.recommendation === 'buy' ? 'trending-up' : 
                                                                 stock.recommendation === 'sell' ? 'trending-down' : 'remove'} 
                                                            size={16} 
                                                            color={stock.recommendation === 'buy' ? '#10B981' : 
                                                                   stock.recommendation === 'sell' ? '#EF4444' : '#F59E0B'} 
                                                        />
                                                        <Text style={[styles.recommendationText, { 
                                                            color: stock.recommendation === 'buy' ? '#10B981' : 
                                                                   stock.recommendation === 'sell' ? '#EF4444' : '#F59E0B'
                                                        }]}>
                                                            {stock.recommendation.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                                <TouchableOpacity
                                                    style={[styles.viewDetailsButton, { backgroundColor: colors.primary }]}
                                                    onPress={() => router.push({
                                                        pathname: '/stock-details',
                                                        params: { symbol: stock.symbol, companyName: stock.company }
                                                    })}
                                                >
                                                    <Text style={styles.viewDetailsText}>View Details</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : (
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No stocks tracked yet. Start by adding stocks from the screener.
                            </Text>
                        )}
                    </View>

                    {/* 4. Portfolio Analysis */}
                    {analysis && (
                        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <TouchableOpacity
                                style={styles.sectionHeader}
                                onPress={() => setExpandedSection(expandedSection === 'analysis' ? null : 'analysis')}
                            >
                                <Ionicons name="analytics" size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Portfolio Analysis</Text>
                                <Ionicons
                                    name={expandedSection === 'analysis' ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>

                            {expandedSection === 'analysis' && (
                                <View style={styles.analysisContent}>
                                    {/* Sector Allocation */}
                                    <View style={styles.analysisBlock}>
                                        <Text style={[styles.analysisTitle, { color: colors.text }]}>
                                            Sector Allocation
                                        </Text>
                                        {Object.entries(analysis.sector_allocation).map(([sector, pct]) => (
                                            <View key={sector} style={styles.analysisRow}>
                                                <Text style={[styles.analysisLabel, { color: colors.textSecondary }]}>
                                                    {sector}
                                                </Text>
                                                <Text style={[styles.analysisValue, { color: colors.text }]}>
                                                    {pct}%
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Factor Bias */}
                                    <View style={styles.analysisBlock}>
                                        <Text style={[styles.analysisTitle, { color: colors.text }]}>
                                            Factor Bias
                                        </Text>
                                        <View style={styles.analysisRow}>
                                            <Text style={[styles.analysisLabel, { color: colors.textSecondary }]}>
                                                Value vs Growth
                                            </Text>
                                            <Text style={[styles.analysisValue, { color: colors.text }]}>
                                                {analysis.factor_bias.value_vs_growth}
                                            </Text>
                                        </View>
                                        <View style={styles.analysisRow}>
                                            <Text style={[styles.analysisLabel, { color: colors.textSecondary }]}>
                                                Debt Profile
                                            </Text>
                                            <Text style={[styles.analysisValue, { color: colors.text }]}>
                                                {analysis.factor_bias.debt_profile}
                                            </Text>
                                        </View>
                                        <View style={styles.analysisRow}>
                                            <Text style={[styles.analysisLabel, { color: colors.textSecondary }]}>
                                                Earnings Momentum
                                            </Text>
                                            <Text style={[styles.analysisValue, { color: colors.text }]}>
                                                {analysis.factor_bias.earnings_momentum}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Concentration Warnings */}
                                    {analysis.concentration_warnings.length > 0 && (
                                        <View style={styles.analysisBlock}>
                                            <Text style={[styles.analysisTitle, { color: colors.text }]}>
                                                Concentration Warnings
                                            </Text>
                                            {analysis.concentration_warnings.map((warning, idx) => (
                                                <View key={idx} style={styles.warningRow}>
                                                    <Ionicons name="warning" size={16} color="#F59E0B" />
                                                    <Text style={[styles.warningText, { color: colors.text }]}>
                                                        {warning}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    {/* 5. Advisory Signals */}
                    {signals.length > 0 && (
                        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="notifications" size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Advisory Signals</Text>
                            </View>

                            {signals.map((signal, idx) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.signalRow,
                                        {
                                            borderBottomWidth: idx < signals.length - 1 ? 1 : 0,
                                            borderBottomColor: colors.border
                                        }
                                    ]}
                                >
                                    <Ionicons
                                        name={signal.severity === 'warning' ? 'warning' : 'information-circle'}
                                        size={18}
                                        color={signal.severity === 'warning' ? '#F59E0B' : colors.primary}
                                    />
                                    <View style={styles.signalContent}>
                                        <Text style={[styles.signalSymbol, { color: colors.text }]}>
                                            {signal.symbol}
                                        </Text>
                                        <Text style={[styles.signalMessage, { color: colors.textSecondary }]}>
                                            {signal.message}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* 6. Sector Allocation Pie Chart */}
                    {analysis && Object.keys(analysis.sector_allocation).length > 0 && (
                        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="pie-chart" size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Sector Allocation</Text>
                            </View>

                            <View style={styles.chartContainer}>
                                <PieChart
                                    data={pieChartData}
                                    donut
                                    radius={90}
                                    innerRadius={60}
                                    innerCircleColor={colors.surface}
                                    centerLabelComponent={() => (
                                        <View style={styles.centerLabel}>
                                            <Text style={[styles.centerLabelValue, { color: colors.text }]}>
                                                {overview?.total_stocks || 0}
                                            </Text>
                                            <Text style={[styles.centerLabelText, { color: colors.textSecondary }]}>
                                                Stocks
                                            </Text>
                                        </View>
                                    )}
                                />
                            </View>

                            {/* Legend */}
                            <View style={styles.legendContainer}>
                                {pieChartData.map((item, idx) => (
                                    <View key={idx} style={styles.legendItem}>
                                        <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                        <Text style={[styles.legendText, { color: colors.text }]}>
                                            {item.text}
                                        </Text>
                                        <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                                            {item.value.toFixed(1)}%
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.bottomPadding} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    section: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    overviewGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    overviewCard: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    overviewLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    overviewValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    overviewText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    lastRefresh: {
        fontSize: 11,
        fontStyle: 'italic',
    },
    aiSummaryText: {
        fontSize: 14,
        lineHeight: 22,
    },
    stockRow: {
        paddingVertical: 12,
    },
    stockMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stockInfo: {
        flex: 1,
    },
    stockSymbol: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    stockSector: {
        fontSize: 11,
    },
    stockMetrics: {
        alignItems: 'flex-end',
    },
    stockPrice: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    stockStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    expandedContent: {
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
    },
    expandedTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    expandedLabel: {
        fontSize: 12,
        marginBottom: 12,
    },
    viewDetailsButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    viewDetailsText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 20,
    },
    analysisContent: {
        gap: 16,
    },
    analysisBlock: {
        gap: 8,
    },
    analysisTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    analysisRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    analysisLabel: {
        fontSize: 13,
    },
    analysisValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    warningRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingVertical: 4,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    signalRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 12,
    },
    signalContent: {
        flex: 1,
    },
    signalSymbol: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    signalMessage: {
        fontSize: 13,
        lineHeight: 18,
    },
    chartContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    centerLabel: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerLabelValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    centerLabelText: {
        fontSize: 12,
        marginTop: 2,
    },
    legendContainer: {
        marginTop: 16,
        gap: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        flex: 1,
        fontSize: 13,
    },
    legendValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    recommendationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    recommendationText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    bottomPadding: {
        height: 40,
    },
});
