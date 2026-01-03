import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, CandlestickChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

export default function StockChart({ data, type = 'line' }) {
    // Mock data if empty, for visualization in demo
    const mockData = [
        { value: 50, label: 'Mon' },
        { value: 54, label: 'Tue' },
        { value: 52, label: 'Wed' },
        { value: 58, label: 'Thu' },
        { value: 56, label: 'Fri' },
    ];

    const chartData = data && data.length > 0 ? data : mockData;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Price Chart</Text>
            <View style={styles.chartContainer}>
                <LineChart
                    data={chartData}
                    areaChart
                    curved
                    color="#00ff83"
                    startFillColor="rgba(0, 255, 131, 0.3)"
                    endFillColor="rgba(0, 255, 131, 0.01)"
                    startOpacity={0.9}
                    endOpacity={0.2}
                    initialSpacing={10}
                    noOfSections={4}
                    yAxisColor="white"
                    yAxisThickness={0}
                    rulesType="solid"
                    rulesColor="gray"
                    yAxisTextStyle={{ color: 'gray' }}
                    xAxisColor="lightgray"
                    pointerConfig={{
                        pointerStripHeight: 160,
                        pointerStripColor: 'lightgray',
                        pointerStripWidth: 2,
                        pointerColor: 'lightgray',
                        radius: 6,
                        pointerLabelWidth: 100,
                        pointerLabelHeight: 90,
                        activatePointersOnLongPress: true,
                        autoAdjustPointerLabelPosition: false,
                        pointerLabelComponent: items => {
                            return (
                                <View
                                    style={{
                                        height: 90,
                                        width: 100,
                                        justifyContent: 'center',
                                        marginTop: -30,
                                        marginLeft: -40,
                                    }}>
                                    <Text style={{ color: 'white', fontSize: 14, marginBottom: 6, textAlign: 'center' }}>
                                        {items[0].date}
                                    </Text>
                                    <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'white' }}>
                                        <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>
                                            {'$' + items[0].value + '.0'}
                                        </Text>
                                    </View>
                                </View>
                            );
                        },
                    }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 10
    },
    header: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        marginLeft: 10
    },
    chartContainer: {
        alignItems: 'center'
    }
});
