import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useTheme } from '../contexts/ThemeContext';
import StockChart from '../components/StockChart';
import { api } from '../utils/api';
import { storage } from '../utils/storage';
import { MarkdownText } from '../components/MarkdownText';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export default function ChatScreen() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hello! I am your AI stock advisor. Ask me anything about the available stocks.',
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;

    const { initialMessage } = useLocalSearchParams();
    const hasInitialMessageProcessed = useRef(false);

    const sendMessage = async (textToSend?: string) => {
        // Use provided text or fallback to input state
        // If event object is passed (from onSubmitEditing), ignore it and use inputText
        const text = (typeof textToSend === 'string' && textToSend) ? textToSend : inputText;

        if (!text.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: text,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);

        // Only clear input if we sent what was in the input
        if (text === inputText) {
            setInputText('');
        }

        setIsLoading(true);

        try {
            // Send to backend API (uses smart pattern matching, no external AI)
            const history = messages.map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            console.log('[CHAT] Sending to backend API');
            const data = await api.post('/api/chat', {
                message: text,
                history: history
            });
            
            console.log('[CHAT] Backend response:', data);

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.response,
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages((prev) => {
                const updated = [...prev, botMessage];
                // Auto-save conversation after bot response
                autoSaveConversation(updated);
                return updated;
            });
        } catch (error) {
            console.error('[CHAT] API error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Sorry, I encountered an error with Puter AI. Please try again.',
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const autoSaveConversation = async (messagesToSave: Message[]) => {
        try {
            const token = await storage.getItem('authToken');
            if (!token || messagesToSave.length < 2) return; // Don't save if not enough messages

            await api.post('/api/chat/save', {
                messages: messagesToSave,
                title: null // Auto-generate from first message
            }, token);

            console.log('[CHAT] Auto-saved conversation');
        } catch (error) {
            console.error('[CHAT] Auto-save failed:', error);
            // Silent fail - don't interrupt user experience
        }
    };

    // Handle initial message from other screens (e.g. Screener)
    useEffect(() => {
        if (initialMessage && !hasInitialMessageProcessed.current) {
            hasInitialMessageProcessed.current = true;
            // Small delay to ensure component is ready
            setTimeout(() => {
                sendMessage(initialMessage as string);
            }, 500);
        }
    }, [initialMessage]);

    useEffect(() => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages]);

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        // Check for [CHART: SYMBOL] tag
        const chartMatch = item.text.match(/\[CHART:\s*([A-Z0-9.]+?)\]/);
        const cleanText = item.text.replace(/\[CHART:\s*[A-Z0-9.]+?\]/, '').trim();
        const chartSymbol = chartMatch ? chartMatch[1] : null;

        return (
            <View
                style={[
                    styles.messageContainer,
                    isUser ? styles.userMessage : styles.botMessage,
                    { backgroundColor: isUser ? colors.primary : colors.surfaceHighlight },
                ]}
            >
                <MarkdownText
                    text={cleanText}
                    style={{ color: isUser ? '#FFFFFF' : colors.text }}
                    isDark={isDark}
                    isUser={isUser}
                />
                <Text
                    style={[
                        styles.timestamp,
                        { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary },
                    ]}
                >
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>AI Advisor</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
                <TextInput
                    style={[styles.input, { color: colors.text, backgroundColor: colors.background }]}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask about stocks..."
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="send"
                    onSubmitEditing={() => sendMessage()}
                    blurOnSubmit={false}
                    multiline
                    onKeyPress={(e) => {
                        if (e.nativeEvent.key === 'Enter') {
                            // On web, prevent default newline
                            if (Platform.OS === 'web') {
                                e.preventDefault();
                            }
                            // Don't send if Shift+Enter (allow new lines with shift)
                            if (!(e as any).shiftKey) {
                                sendMessage();
                            }
                        }
                    }}
                />
                <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: colors.primary, opacity: !inputText.trim() || isLoading ? 0.5 : 1 }]}
                    onPress={() => sendMessage()}
                    disabled={(!inputText.trim() && !isLoading) || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Ionicons name="send" size={20} color="#FFFFFF" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 20,
        paddingBottom: 24,
    },
    messageContainer: {
        maxWidth: '80%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    userMessage: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 6,
    },
    botMessage: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 6,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 20,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    input: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 14,
        marginRight: 12,
        maxHeight: 120,
        fontSize: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    sendButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
});
