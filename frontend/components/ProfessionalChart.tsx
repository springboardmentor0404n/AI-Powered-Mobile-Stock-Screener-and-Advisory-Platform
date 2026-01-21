import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { api } from '../utils/api';

interface ProfessionalChartProps {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w' | '1mo';
  height?: number;
  theme?: 'light' | 'dark';
}

export default function ProfessionalChart({ symbol, interval, height = 400, theme = 'dark' }: ProfessionalChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // PHASE 3: Infinite scroll state
  const currentCandlesRef = useRef<any[]>([]);
  const earliestTimeRef = useRef<number>(0);
  const isLoadingMoreRef = useRef(false);
  const hasMoreHistoryRef = useRef(true);
  const webViewRef = useRef<WebView>(null);

  const screenWidth = Dimensions.get('window').width;

  // PHASE 5: Reset on symbol/interval change
  useEffect(() => {
    resetAndLoadInitial();
  }, [symbol, interval]);

  const resetAndLoadInitial = () => {
    // Reset all state
    setChartData([]);
    currentCandlesRef.current = [];
    earliestTimeRef.current = 0;
    isLoadingMoreRef.current = false;
    hasMoreHistoryRef.current = true;
    
    // Load initial candles
    loadInitialCandles();
  };

  // PHASE 2: Initial candle load
  const loadInitialCandles = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[CHART] Loading all candles for ${symbol} ${interval}`);
      
      const response = await api.get(`/api/candles?symbol=${symbol}&interval=${interval}`);

      if (!response || response.length === 0) {
        setError('No data available');
        setLoading(false);
        return;
      }

      console.log(`[CHART] Loaded ${response.length} initial candles`);

      // Store in ref for infinite scroll
      currentCandlesRef.current = response;
      earliestTimeRef.current = response[0].time;

      // FIRST AND ONLY INITIAL setData
      setChartData(response);
      setLoading(false);
    } catch (err: any) {
      console.error('[CHART] Failed to load initial candles:', err);
      setError(err.message || 'Failed to load chart data');
      setLoading(false);
    }
  };

  // PHASE 3: Load more history (infinite scroll)
  const loadMoreHistory = async () => {
    if (isLoadingMoreRef.current || !hasMoreHistoryRef.current) return;

    try {
      isLoadingMoreRef.current = true;
      console.log(`[CHART] Loading more history before ${earliestTimeRef.current}`);

      const response = await api.get(
        `/api/candles?symbol=${symbol}&interval=${interval}&to=${earliestTimeRef.current}`
      );

      if (!response || response.length === 0) {
        console.log('[CHART] No more historical data');
        hasMoreHistoryRef.current = false;
        isLoadingMoreRef.current = false;
        return;
      }

      console.log(`[CHART] Loaded ${response.length} more candles`);

      // Prepend older candles
      const updatedCandles = [...response, ...currentCandlesRef.current];
      currentCandlesRef.current = updatedCandles;
      earliestTimeRef.current = response[0].time;

      // SECOND VALID USE OF setData (for history expansion)
      setChartData(updatedCandles);

      isLoadingMoreRef.current = false;
    } catch (err: any) {
      console.error('[CHART] Failed to load more history:', err);
      isLoadingMoreRef.current = false;
    }
  };

  // PHASE 4: Live candle update (future WebSocket implementation)
  const updateLiveCandle = (candle: any) => {
    const lastCandle = currentCandlesRef.current[currentCandlesRef.current.length - 1];
    
    if (lastCandle && lastCandle.time === candle.time) {
      // Update existing candle via WebView
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'UPDATE',
        candle: candle
      }));
    } else {
      // New candle
      const updated = [...currentCandlesRef.current, candle];
      currentCandlesRef.current = updated;
      setChartData(updated);
    }
  };

  // Send updated data to WebView when chartData changes
  useEffect(() => {
    if (webViewRef.current && chartData.length > 0) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'SET_DATA',
        candles: chartData
      }));
    }
  }, [chartData]);

  if (loading) {
    return (
      <View style={[styles.container, { height }]}>
        <ActivityIndicator size="large" color="#26a69a" />
        <Text style={styles.loadingText}>Loading chart...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Generate HTML with Lightweight Charts
  const chartHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://unpkg.com/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { overflow: hidden; background: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'}; }
        #chart { width: 100vw; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="chart"></div>
      <script>
        const chartData = ${JSON.stringify(chartData)};
        let chart = null;
        let series = null;
        let currentCandles = chartData;
        let earliestTime = chartData.length > 0 ? chartData[0].time : 0;
        let isLoadingMore = false;

        function initChart() {
          chart = LightweightCharts.createChart(document.getElementById('chart'), {
            width: window.innerWidth,
            height: window.innerHeight,
            layout: {
              background: { color: '${theme === 'dark' ? '#1a1a1a' : '#ffffff'}' },
              textColor: '${theme === 'dark' ? '#d1d4dc' : '#191919'}',
            },
            grid: {
              vertLines: { color: '${theme === 'dark' ? '#2B2B43' : '#e1e1e1'}' },
              horzLines: { color: '${theme === 'dark' ? '#2B2B43' : '#e1e1e1'}' },
            },
            crosshair: { mode: 1 },
            rightPriceScale: { borderColor: '${theme === 'dark' ? '#2B2B43' : '#e1e1e1'}' },
            timeScale: {
              borderColor: '${theme === 'dark' ? '#2B2B43' : '#e1e1e1'}',
              timeVisible: true,
              secondsVisible: false,
              tickMarkFormatter: (time) => {
                const date = new Date(time * 1000);
                const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                const hours = String(istTime.getUTCHours()).padStart(2, '0');
                const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
                const day = String(istTime.getUTCDate()).padStart(2, '0');
                const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
                const year = String(istTime.getUTCFullYear()).slice(-2);
                
                // Format based on interval
                const interval = '${interval}';
                if (interval === '1d' || interval === '1w' || interval === '1mo') {
                  // For daily/weekly/monthly: show date
                  return day + '/' + month + '/' + year;
                } else {
                  // For intraday: show time
                  return hours + ':' + minutes;
                }
              },
            },
            localization: {
              timeFormatter: (time) => {
                const date = new Date(time * 1000);
                const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                const hours = String(istTime.getUTCHours()).padStart(2, '0');
                const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
                const day = String(istTime.getUTCDate()).padStart(2, '0');
                const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
                const year = istTime.getUTCFullYear();
                return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes;
              },
            },
          });

          series = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
          });

          // PHASE 2: Initial setData
          series.setData(chartData);
          chart.timeScale().fitContent();

          // PHASE 3: Infinite scroll listener
          chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
            if (!range || isLoadingMore) return;
            const barsRemaining = range.from - earliestTime;
            
            if (barsRemaining < 50) {
              loadMoreHistory();
            }
          });

          // Handle window resize
          window.addEventListener('resize', () => {
            chart.applyOptions({ width: window.innerWidth, height: window.innerHeight });
          });
        }

        function loadMoreHistory() {
          isLoadingMore = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOAD_MORE',
            earliestTime: earliestTime
          }));
        }

        // Listen for messages from React Native
        window.addEventListener('message', (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'SET_DATA') {
            // PHASE 3: History expansion
            currentCandles = data.candles;
            earliestTime = currentCandles[0].time;
            series.setData(currentCandles);
            isLoadingMore = false;
          } else if (data.type === 'UPDATE') {
            // PHASE 4: Live update
            series.update(data.candle);
          }
        });

        initChart();
      </script>
    </body>
    </html>
  `;

  // Handle messages from WebView
  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'LOAD_MORE') {
        loadMoreHistory();
      }
    } catch (error) {
      console.error('[CHART] Failed to parse message:', error);
    }
  };

  return (
    <View style={[styles.chartWrapper, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: chartHTML }}
        style={{ flex: 1, backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff' }}
        onMessage={onMessage}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  chartWrapper: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#d1d4dc',
    marginTop: 10,
    fontSize: 14,
  },
  errorText: {
    color: '#ef5350',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
