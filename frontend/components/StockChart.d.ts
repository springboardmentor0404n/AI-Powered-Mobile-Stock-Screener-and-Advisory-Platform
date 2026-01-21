
import React from 'react';
import { ViewStyle } from 'react-native';

export interface StockChartProps {
    data: Array<{
        time: string;
        open: number;
        high: number;
        low: number;
        close: number;
    }>;
    chartType?: 'candle' | 'line';
}

declare const StockChart: React.FC<StockChartProps>;
export default StockChart;
