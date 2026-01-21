import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Animated, Image } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../constants/Colors";
import { LinearGradient } from 'expo-linear-gradient';
import { Carousel, CarouselItem } from '@/components/ui/carousel';
import { BORDER_RADIUS } from '@/theme/globals';
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Marquee Animation
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollX, {
          toValue: -2960, // Width of 10 items
          duration: 40000,
          useNativeDriver: true,
        }),
        Animated.timing(scrollX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    // Entry Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    return () => animation.stop();
  }, []);

  return (
    <LinearGradient
      colors={['#0f172a', '#312e81', '#1e40af']} // Darker: Slate-900 -> Indigo-900 -> Blue-800
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.title}>AI Stock Search</Text>
          <Text style={styles.subtitle}>Smart investing powered by AI</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {isAuthenticated ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(tabs)/home')}>
              <Text style={styles.primaryButtonText}>Continue to Home</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')}>
                <Text style={styles.primaryButtonText}>Log In</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/signup')}>
                <Text style={styles.secondaryButtonText}>Create Account</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Features Carousel */}
        <View style={styles.carouselSection}>
          <Carousel
            autoPlay={true}
            autoPlayInterval={4000}
            showIndicators={true}
            loop={true}

          >
            {/* 1. Natural Language Stock Screener */}
            <CarouselItem>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.featureIcon}
                  >
                    <Text style={styles.featureEmoji}>🔍</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.featureTitle}>Natural Language Screener</Text>
                <Text style={styles.featureDescription}>
                  Type in plain English, convert to filters, see a clean stock list.
                </Text>
              </View>
            </CarouselItem>

            {/* 2. Pre-Built Screeners */}
            <CarouselItem>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.featureIcon}
                  >
                    <Text style={styles.featureEmoji}>📑</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.featureTitle}>Pre-Built Screeners</Text>
                <Text style={styles.featureDescription}>
                  Templates for Value stocks, Low PE/PEG, and Earnings growth.
                </Text>
              </View>
            </CarouselItem>

            {/* 3. Stock Details */}
            <CarouselItem>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.featureIcon}
                  >
                    <Text style={styles.featureEmoji}>📄</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.featureTitle}>Stock Details</Text>
                <Text style={styles.featureDescription}>
                  Key ratios (PE, PEG, ROE) and simple growth indicators. No clutter.
                </Text>
              </View>
            </CarouselItem>

            {/* 4. Watchlist */}
            <CarouselItem>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.featureIcon}
                  >
                    <Text style={styles.featureEmoji}>👁️</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.featureTitle}>Watchlist</Text>
                <Text style={styles.featureDescription}>
                  Track your favorite stocks with simple % change views.
                </Text>
              </View>
            </CarouselItem>

            {/* 5. Smart Alerts */}
            <CarouselItem>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.featureIcon}
                  >
                    <Text style={styles.featureEmoji}>🔔</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.featureTitle}>Smart Alerts</Text>
                <Text style={styles.featureDescription}>
                  Get notified when price or ratios cross your set limits.
                </Text>
              </View>
            </CarouselItem>

            {/* 6. Disclaimer & Compliance */}
            <CarouselItem>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.featureIcon}
                  >
                    <Text style={styles.featureEmoji}>⚖️</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.featureTitle}>Compliance Layer</Text>
                <Text style={styles.featureDescription}>
                  Informational only. No buy/sell recommendations. Safe & legal.
                </Text>
              </View>
            </CarouselItem>

            {/* 7. Query History */}
            <CarouselItem>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.featureIcon}
                  >
                    <Text style={styles.featureEmoji}>🕒</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.featureTitle}>Query History</Text>
                <Text style={styles.featureDescription}>
                  See your past screeners and re-run them with 1 tap.
                </Text>
              </View>
            </CarouselItem>

            {/* 8. Market Sentiment */}
            <CarouselItem>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.featureIcon}
                  >
                    <Text style={styles.featureEmoji}>📊</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.featureTitle}>Market Sentiment</Text>
                <Text style={styles.featureDescription}>
                  Simple Bullish / Neutral / Bearish indicators based on data.
                </Text>
              </View>
            </CarouselItem>

          </Carousel>
        </View>

        {/* Our Partners Marquee */}
        <View style={styles.partnersSection}>
          <Text style={styles.partnersTitle}>Supported Exchanges</Text>
          <View style={styles.marqueeContainer}>
            <Animated.View style={[styles.marqueeContent, { transform: [{ translateX: scrollX }] }]}>
              {[...Array(50)].map((_, index) => (
                <View key={index} style={styles.logoGroup}>
                  <View style={styles.logoCard}>
                    <Image source={require('../assets/images/NSE.png')} style={styles.logo} resizeMode="contain" />
                  </View>
                  <View style={styles.logoCard}>
                    <Image source={require('../assets/images/BSE.png')} style={styles.logo} resizeMode="contain" />
                  </View>
                </View>
              ))}
            </Animated.View>
          </View>
        </View>


        {/* SEBI Compliance Disclaimer */}
        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimerText}>
            Disclaimer: This application creates automated analysis for informational purposes only.
            It is not a SEBI-registered investment advisor.
            Investments in securities market are subject to market risks. Read all scheme related documents carefully.
          </Text>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: "center",
  },
  carouselSection: {
    width: '100%',
    marginBottom: 24,
  },
  partnersSection: {
    width: '100%',
    marginBottom: 32,
  },
  partnersTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
  marqueeContainer: {
    height: 80,
    overflow: 'hidden',
  },
  marqueeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoGroup: {
    flexDirection: 'row',
    marginRight: 24,
  },
  logoCard: {
    width: 130,
    height: 65,
    backgroundColor: '#ffffff', // White background
    borderRadius: 16,
    marginRight: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    width: 100,
    height: 40,
    // Removed tintColor to show original logo colors
  },
  title: {
    fontSize: 48,
    fontWeight: "900",
    color: '#ffffff',
    marginBottom: 12,
    textAlign: "center",
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.95)',
    textAlign: "center",
    letterSpacing: 0.5,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 30,
  },
  featureCard: {
    backgroundColor: '#1e293b', // distinct Dark Slate Blue
    opacity: 0.95, // High opacity for visibility
    borderRadius: 28,
    padding: 32,
    height: 280, // Fixed height for uniformity
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  featureIconContainer: {
    marginBottom: 20,
  },
  featureIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  featureEmoji: {
    fontSize: 40,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: '#ffffff',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  featureDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 400,
    gap: 16,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  primaryButtonText: {
    color: "#4338ca", // Brand color
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 20,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: "center",
  },
  disclaimerSection: {
    padding: 20,
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  disclaimerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
