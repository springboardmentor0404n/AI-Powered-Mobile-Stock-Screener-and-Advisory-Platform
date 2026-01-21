import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';
import { storage } from '../utils/storage';

interface Conversation {
    id: string;
    title: string;
    message_count: number;
    created_at: string;
    updated_at: string;
}

export default function ChatHistoryScreen() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const token = await storage.getItem('authToken');
            if (!token) {
                router.replace('/login');
                return;
            }

            const data = await api.get('/api/chat/history', token);
            setConversations(data.conversations || []);
        } catch (error) {
            console.error('[HISTORY] Failed to load:', error);
            Alert.alert('Error', 'Failed to load chat history');
        } finally {
            setLoading(false);
        }
    };

    const deleteConversation = async (id: string) => {
        try {
            const token = await storage.getItem('authToken');
            if (!token) return;

            await api.delete(`/api/chat/history/${id}`, token);
            setConversations(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('[HISTORY] Delete failed:', error);
            Alert.alert('Error', 'Failed to delete conversation');
        }
    };

    const confirmDelete = (id: string, title: string) => {
        Alert.alert(
            'Delete Conversation',
            `Are you sure you want to delete "${title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteConversation(id) },
            ]
        );
    };

    const loadConversation = async (id: string) => {
        try {
            const token = await storage.getItem('authToken');
            if (!token) return;

            const conversation = await api.get(`/api/chat/history/${id}`, token);

            // Navigate to chat with loaded messages
            router.push({
                pathname: '/chat',
                params: { conversationId: id, loadedMessages: JSON.stringify(conversation.messages) }
            });
        } catch (error) {
            console.error('[HISTORY] Load failed:', error);
            Alert.alert('Error', 'Failed to load conversation');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    const renderConversation = ({ item }: { item: Conversation }) => (
        <TouchableOpacity
            style={[styles.conversationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => loadConversation(item.id)}
        >
            <View style={styles.conversationContent}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={[styles.metadata, { color: colors.textSecondary }]}>
                    {item.message_count} messages • {formatDate(item.updated_at)}
                </Text>
            </View>
            <TouchableOpacity
                onPress={() => confirmDelete(item.id, item.title)}
                style={styles.deleteButton}
            >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'Chat History',
                    headerStyle: { backgroundColor: colors.surface },
                    headerTintColor: colors.text,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </TouchableOpacity>
                    ),
                }}
            />

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : conversations.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        No saved conversations yet
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                        Your chat conversations will be auto-saved here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderConversation}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    conversationCard: {
        flexDirection: 'row',
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    conversationContent: {
        flex: 1,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    metadata: {
        fontSize: 14,
        opacity: 0.8,
    },
    deleteButton: {
        padding: 5,
        marginLeft: 10,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 20,
        letterSpacing: 0.3,
    },
    emptySubtext: {
        fontSize: 15,
        marginTop: 8,
        textAlign: 'center',
        opacity: 0.8,
        lineHeight: 22,
    },
});
