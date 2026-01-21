import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

interface AIQueryEntryProps {
    onQuerySubmit: (query: string) => void;
}

const SUGGESTIONS = [
    "Should I buy Reliance?",
    "Best IT stocks today",
    "Which stocks to avoid?"
];

export function AIQueryEntry({ onQuerySubmit }: AIQueryEntryProps) {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const [inputValue, setInputValue] = React.useState('');

    const handleSubmit = () => {
        if (inputValue.trim()) {
            onQuerySubmit(inputValue.trim());
            setInputValue('');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.primary }]}>AI ADVISORY</Text>
            <Text style={[styles.heading, { color: colors.text }]}>Get AI-powered stock advice...</Text>

            <View style={[styles.inputContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
                <Ionicons name="sparkles" size={20} color={colors.primary} style={styles.icon} />
                <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Ask about stocks (e.g. Should I buy Reliance?)..."
                    placeholderTextColor={colors.textTertiary}
                    value={inputValue}
                    onChangeText={setInputValue}
                    onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSubmit}>
                    <LinearGradient
                        colors={colors.primaryGradient as any}
                        style={styles.sendGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <View style={styles.chipsContainer}>
                {SUGGESTIONS.map((suggestion, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => onQuerySubmit(suggestion)}
                    >
                        <Text style={[styles.chipText, { color: colors.textSecondary }]}>{suggestion}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 1,
    },
    heading: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        height: 56,
    },
    icon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    sendButton: {
        marginLeft: 8,
    },
    sendGradient: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 16,
        gap: 10,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
