import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, isLoading } = useContext(AuthContext);
    const { colors } = useTheme();

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Please fill all fields");
            return;
        }
        setError('');
        const result = await login(email, password);

        if (result.success) {
            // success
        } else {
            setError(result.error || "Invalid credentials");
        }
    };

    return (
        <LinearGradient colors={colors.background} style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    <View style={styles.formContainer}>
                        <Text style={[styles.header, { color: colors.text }]}>Welcome Back</Text>
                        <Text style={[styles.subHeader, { color: colors.textSecondary }]}>Sign in to access your screener</Text>

                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                            <Ionicons name="mail-outline" size={20} color={colors.placeholder} style={styles.icon} />
                            <TextInput
                                placeholder="Email"
                                placeholderTextColor={colors.placeholder}
                                style={[styles.input, { color: colors.text }]}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.placeholder} style={styles.icon} />
                            <TextInput
                                placeholder="Password"
                                placeholderTextColor={colors.placeholder}
                                style={[styles.input, { color: colors.text }]}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    setError('');
                                }}
                                secureTextEntry
                            />
                        </View>

                        <View style={{ width: '100%', alignItems: 'flex-end', marginBottom: 20 }}>
                            <TouchableOpacity>
                                <Text style={{ color: colors.accent, fontWeight: '600' }}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>

                        {error ? (
                            <View style={{ padding: 10, backgroundColor: '#ffebee', marginBottom: 20, borderRadius: 8, width: '100%' }}>
                                <Text style={{ color: '#c62828', textAlign: 'center' }}>{error}</Text>
                            </View>
                        ) : null}

                        <TouchableOpacity onPress={handleLogin} style={[styles.btnPrimary, { backgroundColor: colors.accent }]}>
                            {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Log In</Text>}
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        </View>

                        <TouchableOpacity style={[styles.btnGoogle, { borderColor: colors.border, backgroundColor: colors.card }]}>
                            <Ionicons name="logo-google" size={20} color={colors.text} />
                            <Text style={[styles.btnGoogleText, { color: colors.text }]}>Continue with Google</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={{ marginTop: 40 }}>
                            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                                Don't have an account? <Text style={{ color: colors.accent, fontWeight: 'bold' }}>Sign Up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 30, justifyContent: 'center' },
    formContainer: { width: '100%', alignItems: 'center' },

    header: { fontSize: 32, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
    subHeader: { fontSize: 16, marginBottom: 30, textAlign: 'center' },

    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        width: '100%', height: 56, borderRadius: 16, borderWidth: 1,
        paddingHorizontal: 15, marginBottom: 15,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
    },
    icon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, height: '100%' },

    btnPrimary: {
        width: '100%', height: 56, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        marginTop: 10,
        elevation: 4, shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
    },
    btnText: { color: '#000', fontSize: 18, fontWeight: '700' },

    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 25, width: '100%' },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { marginHorizontal: 10, fontSize: 14, fontWeight: '600' },

    btnGoogle: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: 56, borderRadius: 16, borderWidth: 1,
        gap: 10
    },
    btnGoogleText: { fontSize: 16, fontWeight: '600' },
});
