import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StockChart from '../../components/StockChart';
import { StockCard, StockCardSkeleton, QuickActionGrid, ExchangeSlider } from '../../components';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import { storage } from '../../utils/storage';
import { api } from '../../utils/api';

interface StockResult {
  symbol: string;
  company: string;
  exchange?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  pe_ratio?: number;
  peg_ratio?: number;
  debt_to_fcf?: number;
  growth?: string;
  market_cap?: number;
  sector?: string;
}

export default function Screener() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [interpretation, setInterpretation] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockResult | null>(null);
  const router = useRouter();
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Auto-search with debounce (user typing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch();
      } else if (query.trim().length === 0) {
        setResults([]);
        setInterpretation('');
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle initial query from navigation (Home Page Search)
  const { initialQuery } = useLocalSearchParams<{ initialQuery: string }>();

  useEffect(() => {
    if (initialQuery) {
      console.log("Initial Query received:", initialQuery);
      setQuery(initialQuery);
      // handleSearch will be triggered by the debounce effect above since query changes
    }
  }, [initialQuery]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);
    setInterpretation('');

    try {
      const token = await storage.getItem('authToken');
      // Use MarketStack Search API
      const data = await api.get(`/api/stocks/search?q=${encodeURIComponent(query)}`, token || undefined);

      // Map backend results to frontend interface
      const mappedResults = data.results.map((item: any) => ({
        symbol: item.symbol,
        company: item.name,
        exchange: item.exchange,
      }));

      setResults(mappedResults);
      setResults(mappedResults);
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.includes('Invalid')) {
        console.warn("Screener auth invalid");
        setInterpretation("Please log in to search stocks.");
      } else {
        console.error('Screening failed:', error);
      }
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [results]);

  const renderStockItem = ({ item, index }: { item: StockResult; index: number }) => {
    // Use the real changePercent from the backend data
    const changePercent = item.changePercent !== undefined ? item.changePercent : 0;

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <StockCard
          symbol={item.symbol}
          company={item.company}
          price={item.price}
          change={item.change}
          changePercent={changePercent}
          exchange={item.exchange}
          pe_ratio={item.pe_ratio}
          peg_ratio={item.peg_ratio}
          onChartPress={() => {
            router.push({
              pathname: "/stock-details",
              params: {
                symbol: item.symbol,
                company: item.company,
                price: item.price,
                change: item.change,
                changePercent: changePercent,
                exchange: item.exchange,
                pe_ratio: item.pe_ratio
              }
            });
          }}
          onChatPress={() => router.push({
            pathname: "/chat",
            params: { initialMessage: `Tell me about ${item.company} (${item.symbol})` }
          })}
        />
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
      <StatusBar style="light" backgroundColor="#000000" />

      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colors.primaryGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  router.replace('/(tabs)/home');
                }
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Search Stock</Text>
              <Text style={styles.headerSubtitle}>Find stocks instantly</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Search stocks (e.g. Reliance, IT stocks, low PE)..."
              placeholderTextColor={colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              multiline={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.searchButton, loading && styles.disabledButton]}
            onPress={handleSearch}
            disabled={loading || !query.trim()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={colors.primaryGradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.searchButtonText}>Search</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {
          interpretation ? (
            <View style={[styles.interpretationContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.primary }]}>
              <View style={styles.interpretationHeader}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={[styles.interpretationLabel, { color: colors.primary }]}>AI Interpretation</Text>
              </View>
              <Text style={[styles.interpretationText, { color: colors.text }]}>{interpretation}</Text>
            </View>
          ) : null
        }

        {
          loading && results.length === 0 ? (
            <View style={styles.listContent}>
              {[...Array(3)].map((_, i) => (
                <StockCardSkeleton key={i} />
              ))}
            </View>
          ) : (
            <FlatList
              data={results}
              renderItem={renderStockItem}
              keyExtractor={(item) => item.symbol}
              contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
              ListEmptyComponent={
                !loading && query && results.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={64} color={colors.textTertiary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      No stocks found matching your criteria.
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                      Try different keywords or search terms
                    </Text>
                  </View>
                ) : !loading && !query ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="trending-up-outline" size={64} color={colors.textTertiary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Start searching for stocks
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                      Enter a company name, sector, or criteria above
                    </Text>
                  </View>
                ) : null
              }
            />
          )
        }
      </View >
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  inputContainer: {
    padding: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  searchButtonGradient: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  interpretationContainer: {
    padding: 16,
    margin: 20,
    marginBottom: 0,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  interpretationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  interpretationLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  interpretationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    width: '95%',
    maxWidth: 500,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
