import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';

export const ExchangeSlider: React.FC = () => {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const scrollX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Marquee Animation
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scrollX, {
                    toValue: -2960, // Width of items
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

        return () => animation.stop();
    }, []);

    return (
        <View style={styles.partnersSection}>
            <Text style={[styles.partnersTitle, { color: colors.textSecondary }]}>
                Supported Exchanges
            </Text>
            <View style={styles.marqueeContainer}>
                <Animated.View style={[styles.marqueeContent, { transform: [{ translateX: scrollX }] }]}>
                    {[...Array(50)].map((_, index) => (
                        <View key={index} style={styles.logoGroup}>
                            <View style={[styles.logoCard, {
                                backgroundColor: isDark ? '#1F2937' : '#ffffff',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                            }]}>
                                <Image source={require('../../assets/images/NSE.png')} style={styles.logo} resizeMode="contain" />
                            </View>
                            <View style={[styles.logoCard, {
                                backgroundColor: isDark ? '#1F2937' : '#ffffff',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                            }]}>
                                <Image source={require('../../assets/images/BSE.png')} style={styles.logo} resizeMode="contain" />
                            </View>
                        </View>
                    ))}
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    partnersSection: {
        width: '100%',
        marginBottom: 16,
        marginTop: 8,
    },
    partnersTitle: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 0.3,
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
        borderRadius: 16,
        marginRight: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    logo: {
        width: 100,
        height: 40,
    },
});

