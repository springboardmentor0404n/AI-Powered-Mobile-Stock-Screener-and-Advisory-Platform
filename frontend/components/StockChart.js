import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function StockChart({ data = [], type = 'candle', timeframe = '1Y' }) {
    const { colors } = useTheme();

    // Transform API data for Gifted Charts
    const processedData = data.map(item => ({
        value: item.close, // For Line Chart

        // For Candle Chart
        open: item.open,
        close: item.close,
        high: item.high,
        low: item.low,

        // Styling
        frontColor: item.close >= item.open ? colors.accent : colors.danger, // Green/Red

        // Meta
        label: new Date(item.date).getDate() + ' ' + new Date(item.date).toLocaleString('default', { month: 'short' }),
        date: item.date,

        // For Volume (if we use a separate array, usually better)
        volume: item.volume
    }));

    const volumeData = data.map(item => ({
        value: item.volume,
        frontColor: item.close >= item.open ? colors.accent + '80' : colors.danger + '80', // Add transparency
    }));

    // Calculate dynamic Y-axis range to prevent flat lines
    const maxPrice = Math.max(...data.map(d => d.high || d.close)) || 100;
    const minPrice = Math.min(...data.map(d => d.low || d.close)) || 0;
    const yAxisOffset = minPrice * 0.95; // Start axis slightly below lowest price
    const dataSize = processedData.length;

    // Adjust spacing based on data density
    let spacing = 10;
    if (dataSize > 50) spacing = 2;
    else if (dataSize > 20) spacing = 6;

    // Handle Loading/Empty
    if (data.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: colors.card }]}>
                <Text style={[styles.noData, { color: colors.textSecondary }]}>Loading Chart Data...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <View style={styles.chartContainer}>
                {type === 'line' ? (
                    <LineChart
                        data={processedData}
                        areaChart
                        curved
                        color={colors.accent}
                        startFillColor={colors.accent}
                        endFillColor={colors.accent}
                        startOpacity={0.2}
                        endOpacity={0.01}
                        spacing={spacing}
                        initialSpacing={10}
                        noOfSections={4}
                        yAxisThickness={0}
                        rulesType="solid"
                        rulesColor={colors.border}
                        yAxisTextStyle={{ color: colors.textSecondary }}
                        xAxisColor="transparent"
                        yAxisOffset={yAxisOffset} // Dynamic scaling
                        hideDataPoints
                        pointerConfig={{
                            pointerStripHeight: 160,
                            pointerStripColor: colors.border,
                            pointerStripWidth: 2,
                            pointerColor: colors.textSecondary,
                            radius: 4,
                            pointerLabelWidth: 100,
                            pointerLabelHeight: 90,
                            activatePointersOnLongPress: true,
                            autoAdjustPointerLabelPosition: false,
                            pointerLabelComponent: items => (
                                <View style={[styles.tooltip, { backgroundColor: colors.modalBg, borderColor: colors.border }]}>
                                    <Text style={[styles.tooltipDate, { color: colors.textSecondary }]}>{items[0].date}</Text>
                                    <Text style={[styles.tooltipPrice, { color: colors.text }]}>₹{items[0].value.toFixed(2)}</Text>
                                </View>
                            ),
                        }}
                    />
                ) : (
                    <BarChart
                        data={processedData}
                        isAnimated
                        barWidth={Math.max(2, (width - 60) / dataSize * 0.6)}
                        spacing={Math.max(1, (width - 60) / dataSize * 0.2)}
                        roundedTop={false}
                        roundedBottom={false}
                        hideRules
                        yAxisThickness={0}
                        xAxisThickness={0}
                        yAxisTextStyle={{ color: colors.textSecondary }}
                        yAxisOffset={yAxisOffset}
                        noOfSections={4}
                        maxValue={maxPrice * 1.05} // Upper buffer
                        rulesColor={colors.border}
                    />
                )}
            </View>

            {/* Volume Chart (Mini) */}
            <View style={[styles.volumeContainer, { borderTopColor: colors.border }]}>
                <Text style={[styles.volLabel, { color: colors.textSecondary }]}>Vol</Text>
                <BarChart
                    data={volumeData}
                    barWidth={Math.max(1, (width - 60) / dataSize * 0.6)}
                    spacing={Math.max(1, (width - 60) / dataSize * 0.2)}
                    roundedTop={false}
                    roundedBottom={false}
                    hideRules
                    hideYAxisText
                    yAxisThickness={0}
                    xAxisThickness={0}
                    height={60}
                    width={width - 60}
                    initialSpacing={10}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
        borderRadius: 16,
        padding: 10,
        elevation: 5
    },
    noData: {
        textAlign: 'center',
        padding: 40
    },
    chartContainer: {
        marginTop: 10,
        height: 250,
        justifyContent: 'center'
    },
    volumeContainer: {
        marginTop: 10,
        height: 60,
        borderTopWidth: 1,
        paddingTop: 5
    },
    volLabel: {
        fontSize: 10,
        position: 'absolute',
        top: 5,
        left: 5
    },
    tooltip: {
        padding: 8,
        borderRadius: 4,
        borderWidth: 1
    },
    tooltipDate: { fontSize: 10, textAlign: 'center' },
    tooltipPrice: { fontSize: 14, fontWeight: 'bold' }
});
