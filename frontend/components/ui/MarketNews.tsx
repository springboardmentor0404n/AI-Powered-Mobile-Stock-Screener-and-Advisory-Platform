import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Linking } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { api } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';

interface NewsItem {
    id: number;
    headline: string;
    summary: string;
    source: string;
    url: string;
    image: string;
    datetime: number;
}

export const MarketNews = ({ lastUpdate = 0 }: { lastUpdate?: number }) => {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNews();
    }, [lastUpdate]);

    const fetchNews = async () => {
        // Don't set loading to true on updates to avoid flicker, only on initial mount if news is empty
        if (news.length === 0) setLoading(true);

        try {
            const response = await api.get('/api/market/news');
            if (response && response.news) {
                setNews(response.news);
            }
        } catch (error) {
            console.error("Failed to fetch news:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePress = (url: string) => {
        if (url) {
            try {
                Linking.openURL(url);
            } catch (err) {
                console.error("Couldn't open URL:", err);
            }
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    const renderItem = ({ item }: { item: NewsItem }) => (
        <TouchableOpacity
            style={[styles.card, { borderBottomColor: colors.border }]}
            onPress={() => handlePress(item.url)}
        >
            <View style={styles.cardContent}>
                <View style={styles.textContainer}>
                    <Text style={[styles.headline, { color: colors.text }]} numberOfLines={3}>
                        {item.headline}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={[styles.source, { color: colors.textSecondary }]}>
                            {item.source}
                        </Text>
                        <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
                        <Text style={[styles.time, { color: colors.textSecondary }]}>
                            {formatTime(item.datetime)}
                        </Text>
                    </View>
                </View>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: colors.surfaceHighlight }]}>
                        <Ionicons name="newspaper-outline" size={24} color={colors.textSecondary} />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={[styles.title, { color: colors.text, marginBottom: 16 }]}>Market News</Text>
                <Text style={{ color: colors.textSecondary, marginLeft: 20 }}>Loading...</Text>
            </View>
        );
    }

    if (news.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Market News</Text>
                <TouchableOpacity onPress={fetchNews}>
                    <Ionicons name="refresh" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
            <View style={[styles.listContainer, { backgroundColor: colors.surface }]}>
                {news.slice(0, 4).map((item) => (
                    <View key={item.id}>
                        {renderItem({ item })}
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    listContainer: {
        borderRadius: 12,
        marginHorizontal: 20,
        overflow: 'hidden',
    },
    card: {
        borderBottomWidth: 1,
        padding: 16,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    source: {
        fontSize: 12,
        fontWeight: '500',
    },
    dot: {
        fontSize: 12,
        marginHorizontal: 4,
    },
    time: {
        fontSize: 12,
    },
    headline: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 22,
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    placeholderImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
