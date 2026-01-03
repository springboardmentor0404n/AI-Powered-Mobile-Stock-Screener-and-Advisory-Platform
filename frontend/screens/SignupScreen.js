import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function SignupScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const { signup, isLoading } = useContext(AuthContext);

    const handleSignup = async () => {
        if (!email || !password) return Alert.alert("Error", "Please fill all fields");
        const success = await signup(email, password, fullName);
        if (success) {
            Alert.alert("Success", "Account created! Please login.");
            navigation.navigate('Login');
        } else {
            Alert.alert("Error", "Signup failed. Try again.");
        }
    };

    return (
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join the AI trading revolution</Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Full Name"
                        placeholderTextColor="#aaa"
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Email"
                        placeholderTextColor="#aaa"
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Password"
                        placeholderTextColor="#aaa"
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity onPress={handleSignup} style={styles.button}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkText}>Already have an account? Login</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    content: { padding: 30 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#ccc', marginBottom: 40 },
    inputContainer: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        marginBottom: 20,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    input: { height: 50, color: '#fff' },
    button: {
        backgroundColor: '#6c63ff',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20
    },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    linkText: { color: '#aaa', textAlign: 'center', marginTop: 10 }
});
