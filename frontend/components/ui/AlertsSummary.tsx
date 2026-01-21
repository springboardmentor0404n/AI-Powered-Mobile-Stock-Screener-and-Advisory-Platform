import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';

export function AlertsSummary() {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;

    return (
        <View style={styles.container}>
            <TouchableOpacity style={[styles.alertCard, { backgroundColor: colors.surfaceHighlight }]}>
                <View style={styles.iconBadge}>
                    <Ionicons name="notifications" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.text, { color: colors.text }]}>2 AI alerts triggered today</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 32, // More bottom margin as it's the last item usually
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    iconBadge: {
        marginRight: 10,
    },
    text: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    }
});
