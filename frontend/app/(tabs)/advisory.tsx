import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: number;
}

export default function AdvisoryScreen() {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const { user } = useAuth();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: `Hello ${user?.name ? user.name.split(' ')[0] : 'Trader'}! I'm your AI Investment Advisor. Ask me anything about stocks, market trends, or your portfolio.`,
            sender: 'ai',
            timestamp: Date.now()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = async () => {
        if (!inputText.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            sender: 'user',
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        // Scroll to bottom immediately
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const token = await require('../../utils/storage').storage.getItem('authToken');
            const response = await api.post('/api/chat', {
                message: userMsg.text,
                history: messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [m.text] }))
            }, token || undefined);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.message || response.response || "I couldn't understand that.",
                sender: 'ai',
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble connecting right now. Please try again.",
                sender: 'ai',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.aiBubble,
                { backgroundColor: isUser ? colors.primary : (isDark ? '#374151' : '#E5E7EB') }
            ]}>
                {!isUser && (
                    <View style={styles.botIcon}>
                        <Ionicons name="sparkles" size={12} color={colors.primary} />
                    </View>
                )}
                <Text style={[
                    styles.messageText,
                    { color: isUser ? '#FFFFFF' : colors.text }
                ]}>
                    {item.text}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
            <StatusBar style="light" backgroundColor="#000000" />
            <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                <Header title="AI Advisory" />

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                >
                    <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
                            placeholder="Ask for advice..."
                            placeholderTextColor={colors.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={sendMessage}
                            returnKeyType="send"
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, { backgroundColor: colors.primary, opacity: (!inputText.trim() || isLoading) ? 0.5 : 1 }]}
                            onPress={sendMessage}
                            disabled={!inputText.trim() || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons name="send" size={20} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        flexDirection: 'row',
        gap: 8,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 24,
    },
    botIcon: {
        marginTop: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        fontSize: 16,
        marginRight: 10,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
