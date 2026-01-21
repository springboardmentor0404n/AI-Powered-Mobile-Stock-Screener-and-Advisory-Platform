import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';

import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { useEffect, useState } from 'react';

export function AIHighlights() {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const [highlights, setHighlights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHighlights = async () => {
            try {
                // Should work without auth too, but passing token if available is good
                const token = await storage.getItem('authToken');
                const data = await api.get('/api/market/highlights', token || undefined);
                if (Array.isArray(data)) {
                    setHighlights(data);
                }
            } catch (e: any) {
                if (e.message?.includes('401') || e.message?.includes('Invalid')) {
                    console.warn("Highlights auth invalid");
                } else {
                    console.error("Failed to fetch highlights", e);
                }
            } finally {
                setLoading(false);
            }
        };
        
        // Initial fetch
        fetchHighlights();
        
        // Poll every 30 seconds for real-time updates
        const interval = setInterval(fetchHighlights, 30000);
        
        // Cleanup on unmount
        return () => clearInterval(interval);
    }, []);

    if (loading) return null; // Or a skeleton

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="bulb" size={18} color={colors.primary} />
                <Text style={[styles.title, { color: colors.text }]}>Today's Insights</Text>
            </View>

            <View style={styles.cardsContainer}>
                {highlights.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                            <Ionicons name={item.icon as any} size={18} color={item.color} />
                        </View>
                        <Text style={[styles.cardText, { color: colors.text }]}>{item.text}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    cardsContainer: {
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
});
