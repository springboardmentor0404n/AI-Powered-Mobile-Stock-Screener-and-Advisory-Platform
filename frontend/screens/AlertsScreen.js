import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function AlertsScreen({ navigation }) {
    const { colors } = useTheme();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            const res = await client.get('/alerts');
            setAlerts(res.data);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
            Alert.alert("Error", "Could not fetch alerts");
        }
    };

    const handleDelete = async (id) => {
        if (Platform.OS === 'web') {
            const confirm = window.confirm("Are you sure you want to delete this alert?");
            if (confirm) {
                await deleteAlertApi(id);
            }
        } else {
            Alert.alert(
                "Delete Alert",
                "Are you sure you want to delete this alert?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => deleteAlertApi(id)
                    }
                ]
            );
        }
    };

    const deleteAlertApi = async (id) => {
        try {
            await client.delete(`/alerts/${id}`);
            setAlerts(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            Alert.alert("Error", "Could not delete alert");
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <Text style={[styles.symbol, { color: colors.text }]}>{item.stock.symbol}</Text>
                <View style={[styles.badge, item.status === 'TRIGGERED' ? { backgroundColor: colors.danger + '30' } : { backgroundColor: colors.accent + '30' }]}>
                    <Text style={[styles.badgeText, { color: item.status === 'TRIGGERED' ? colors.danger : colors.accent }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    Condition: <Text style={[styles.highlight, { color: colors.text }]}>{item.condition}</Text>
                </Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    Target: <Text style={[styles.price, { color: colors.accent }]}>₹{item.target_price}</Text>
                </Text>
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    Current: <Text style={[styles.price, { color: colors.accent }]}>₹{item.stock.current_price?.toFixed(2)}</Text>
                </Text>
            </View>

            <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.danger + '20' }]} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
        </View>
    );

    if (loading) return (
        <LinearGradient colors={colors.background} style={[styles.container, styles.center]}>
            <ActivityIndicator size="large" color={colors.accent} />
        </LinearGradient>
    );

    return (
        <LinearGradient colors={colors.background} style={styles.container}>
            {alerts.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="notifications-off-outline" size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No Active Alerts</Text>
                </View>
            ) : (
                <FlatList
                    data={alerts}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 20, paddingTop: 60 },
    card: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        position: 'relative'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    symbol: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    badge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8
    },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    cardBody: {
        flexDirection: 'column'
    },
    detailText: {
        fontSize: 14,
        marginBottom: 4
    },
    highlight: { fontWeight: 'bold' },
    price: { fontWeight: 'bold' },
    deleteBtn: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        padding: 8,
        borderRadius: 20
    },
    emptyText: {
        fontSize: 18,
        marginTop: 20
    }
});
