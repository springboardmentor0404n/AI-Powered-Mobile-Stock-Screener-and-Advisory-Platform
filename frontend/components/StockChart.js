
import React, { useRef, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const StockChart = ({ data, chartType = 'candle' }) => {
  const webViewRef = useRef(null);

  // Default to empty array if data provided is null/undefined
  const chartData = data || [];

  // Generate the HTML for the WebView
  const getChartHtml = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
        <style>
          body { margin: 0; padding: 0; background-color: #000000; overflow: hidden; }
          #chart-container { width: 100vw; height: 100vh; }
        </style>
        <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
      </head>
      <body>
        <div id="chart-container"></div>
        <script>
          // Debugging bridge
          function log(msg) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: msg }));
            }
          }
          function error(msg) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: msg }));
            }
          }

          window.onerror = function(message, source, lineno, colno, error) {
            error("JS Error: " + message + " at " + lineno + ":" + colno);
          };

          const container = document.getElementById('chart-container');
          

          window.chart = null;
          window.series = null;

          try {
            if (typeof LightweightCharts === 'undefined') {
                error("LightweightCharts library not loaded. Check internet connection.");
            } else {
                log("LightweightCharts loaded. Creating chart...");
                
                // Create Chart
                window.chart = LightweightCharts.createChart(container, {
                  layout: {
                    background: { type: 'solid', color: '#000000' },
                    textColor: '#d1d4dc',
                  },
                  grid: {
                    vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                    horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
                  },
                  rightPriceScale: {
                    borderColor: 'rgba(197, 203, 206, 0.8)',
                    autoScale: true,
                  },
                  timeScale: {
                    borderColor: 'rgba(197, 203, 206, 0.8)',
                    timeVisible: true,
                    secondsVisible: false,
                    rightOffset: 5, // Allow scrolling into future
                    barSpacing: 10,
                    minBarSpacing: 0.5,
                  },
                  handleScroll: {
                      mouseWheel: true,
                      pressedMouseMove: false,
                      horzTouchDrag: true,
                      vertTouchDrag: false,
                  },
                  handleScale: {
                      axisPressedMouseMove: true, // Scale Drag Y/X Axis
                      mouseWheel: true,
                      pinch: true, // Pinch to zoom
                      axisDoubleClickReset: true,
                  },
                  kineticScroll: { // Momentum Drag
                      touch: true,
                      mouse: true,
                  },
                  crosshair: { // Crosshair Drag support
                      mode: LightweightCharts.CrosshairMode.Normal,
                      vertLine: {
                          width: 1,
                          color: 'rgba(224, 227, 235, 0.1)',
                          style: 0,
                          labelBackgroundColor: '#9B7DFF',
                      },
                      horzLine: {
                          width: 1,
                          color: 'rgba(224, 227, 235, 0.1)',
                          style: 0,
                          labelBackgroundColor: '#9B7DFF',
                      },
                  },
                });

                // Add Series
                // Add Series
                // Add Series
                if ('${chartType}' === 'candle') {
                  window.series = window.chart.addSeries(LightweightCharts.CandlestickSeries, {
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                  });
                } else {
                  window.series = window.chart.addSeries(LightweightCharts.LineSeries, {
                    color: '#2962FF',
                    lineWidth: 2,
                  });
                }
                
                log("Chart created successfully.");

                // Initial resize
                new ResizeObserver(entries => {
                  if (entries.length === 0 || entries[0].target !== container) { return; }
                  const newRect = entries[0].contentRect;
                  window.chart.applyOptions({ height: newRect.height, width: newRect.width });
                }).observe(container);
            }
          } catch (e) {
              error("Setup Error: " + e.message);
          }

          // Expose function to update data
          window.updateChartData = (data) => {
             try {
                 log("Received data update: " + (data ? data.length : 0) + " points");
                 // Basic validation
                 if (!data || !Array.isArray(data)) {
                     error("Invalid data format received");
                     return;
                 }
                 
                 // Lightweight charts expects time in seconds (Unix timestamp) or YYYY-MM-DD string
                 // We ensure our data matches the format: { time, open, high, low, close }
                 const formattedData = data.map(item => ({
                     time: item.time || item.date, // support both
                     open: parseFloat(item.open),
                     high: parseFloat(item.high),
                     low: parseFloat(item.low),
                     close: parseFloat(item.close)
                 }));

                 if (window.series) {
                     window.series.setData(formattedData);
                     window.chart.timeScale().fitContent();
                     log("Data set on series and fitted.");
                 } else {
                     error("Series not initialized, cannot set data.");
                 }
             } catch (e) {
                 error("Update Error: " + e.message);
             }
          };
          window.setChartRange = (rangeType) => {
              try {
                  log("Setting range: " + rangeType);
                  const data = window.series ? window.series.data() : [];
                  if (!data || data.length === 0) return;
                  
                  const lastIndex = data.length - 1;
                  let visibleBars = 0;

                  // Estimates for daily data
                  switch(rangeType) {
                      case '1D': visibleBars = 5; break; 
                      case '1W': visibleBars = 7; break; 
                      case '1M': visibleBars = 22; break;
                      case '3M': visibleBars = 66; break;
                      case '6M': visibleBars = 132; break;
                      case '1Y': visibleBars = 264; break;
                      case 'ALL': 
                          window.chart.timeScale().fitContent();
                          return;
                  }
                  
                  if (visibleBars > 0) {
                      window.chart.timeScale().setVisibleLogicalRange({
                          from: lastIndex - visibleBars,
                          to: lastIndex + 2 
                      });
                  }
              } catch (e) {
                  error("Range Error: " + e.message);
              }
          };
        </script>
      </body>
      </html>
    `;
  };

  // Update chart when data prop changes
  useEffect(() => {
    if (webViewRef.current && chartData.length > 0) {
      // Send data to WebView
      const script = `
        if (window.updateChartData) {
          window.updateChartData(${JSON.stringify(chartData)});
        }
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [chartData]); // Re-run when chartData changes


  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'log') {
        console.log("[WebView Log]", data.message);
      } else if (data.type === 'error') {
        console.error("[WebView Error]", data.message);
      }
    } catch (e) {
      // ignore non-json messages
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: getChartHtml() }}
        style={styles.webview}
        scrollEnabled={false}
        onMessage={onMessage}
        onLoadEnd={() => {
          // Initial data load on first mount/load
          if (chartData.length > 0) {
            const script = `
                    if (window.updateChartData) {
                      window.updateChartData(${JSON.stringify(chartData)});
                    }
                  `;
            webViewRef.current?.injectJavaScript(script);
          }
        }}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
        startInLoadingState={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    minHeight: 300,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000'
  }
});

export default StockChart;
