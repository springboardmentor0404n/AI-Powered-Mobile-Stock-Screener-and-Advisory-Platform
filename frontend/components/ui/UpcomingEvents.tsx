import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';

import { api } from '../../utils/api';
import { useEffect, useState } from 'react';

export function UpcomingEvents() {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await api.get('/api/market/events');
                if (Array.isArray(data)) setEvents(data);
            } catch (e) {
                console.error("Failed to fetch events", e);
            }
        };
        fetchEvents();
    }, []);

    if (events.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Upcoming Events</Text>
            </View>

            <View style={styles.listContainer}>
                {events.map((item, index) => (
                    <View
                        key={item.id}
                        style={[
                            styles.row,
                            {
                                borderBottomColor: colors.border,
                                borderBottomWidth: index < events.length - 1 ? 1 : 0
                            }
                        ]}
                    >
                        <View style={styles.symbolContainer}>
                            <View style={[
                                styles.iconBadge,
                                { backgroundColor: item.type === 'earnings' ? '#E0E7FF' : '#DCFCE7' }
                            ]}>
                                <Text style={{ fontSize: 10 }}>{item.type === 'earnings' ? 'E' : 'B'}</Text>
                            </View>
                            <View>
                                <Text style={[styles.symbol, { color: colors.text }]}>{item.symbol}</Text>
                                <Text style={[styles.event, { color: colors.textSecondary }]}>{item.event}</Text>
                            </View>
                        </View>
                        <Text style={[styles.date, { color: colors.text }]}>{item.date}</Text>
                    </View>
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
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    listContainer: {
        gap: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    symbolContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    symbol: {
        fontWeight: '600',
        fontSize: 14,
    },
    event: {
        fontSize: 12,
    },
    date: {
        fontWeight: '600',
        fontSize: 14,
    }
});
