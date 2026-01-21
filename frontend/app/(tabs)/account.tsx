import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AccountScreen() {
    const { isDark, toggleTheme } = useTheme();
    const { user, logout, updateUser } = useAuth();
    const colors = isDark ? Colors.dark : Colors.light;
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');

    const handleUpdateName = async () => {
        if (!newName.trim()) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }
        try {
            await updateUser(newName);
            setIsEditing(false);
            Alert.alert("Success", "Profile updated successfully");
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
            <StatusBar style="light" backgroundColor="#000000" />
            <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                <Header title="Account" />
                <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
                    {/* Profile Card */}
                    <View style={[styles.profileCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text>
                        </View>
                        <View style={styles.profileInfo}>
                            {isEditing ? (
                                <View style={styles.editContainer}>
                                    <TextInput
                                        style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
                                        value={newName}
                                        onChangeText={setNewName}
                                        autoFocus
                                    />
                                    <TouchableOpacity onPress={handleUpdateName}>
                                        <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setIsEditing(false)}>
                                        <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.nameContainer}>
                                    <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'User'}</Text>
                                    <TouchableOpacity onPress={() => { setNewName(user?.name || ''); setIsEditing(true); }}>
                                        <Ionicons name="pencil" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email || 'email@example.com'}</Text>
                        </View>
                    </View>

                    {/* Settings */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Settings</Text>

                        <TouchableOpacity style={[styles.option, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]} onPress={toggleTheme}>
                            <View style={styles.optionLeft}>
                                <Ionicons name={isDark ? "moon" : "sunny"} size={22} color={colors.text} />
                                <Text style={[styles.optionText, { color: colors.text }]}>App Theme</Text>
                            </View>
                            <Text style={{ color: colors.primary }}>{isDark ? 'Dark' : 'Light'}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.logoutButton, { borderColor: '#EF4444' }]}
                        onPress={handleLogout}
                    >
                        <Text style={{ color: '#EF4444', fontWeight: '600' }}>Log Out</Text>
                    </TouchableOpacity>

                </ScrollView>
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
    content: {
        padding: 16,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    profileInfo: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 4,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    optionText: {
        fontSize: 16,
    },
    logoutButton: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        marginTop: 20,
    },
    editContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    editInput: {
        flex: 1,
        borderBottomWidth: 1,
        fontSize: 18,
        paddingVertical: 2,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});
