import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen({ navigation }) {
    const { sendOtp, validateOtp, verifySignup, login, isLoading } = useContext(AuthContext);
    const { colors } = useTheme();

    const [step, setStep] = useState(1);

    // Form Data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digit array
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');

    // Validation State
    const [emailError, setEmailError] = useState('');
    const [timer, setTimer] = useState(30);

    // Refs for OTP inputs
    const otpRefs = useRef([]);

    // Countdown Timer logic
    useEffect(() => {
        let interval;
        if (step === 2 && timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const handleStep1 = async () => {
        if (!email.includes('@')) {
            setEmailError('Please enter a valid email');
            return;
        }
        setEmailError('');

        try {
            const result = await sendOtp(email);
            if (result.success) {
                setTimer(30);
                setStep(2); // Direct State Update - No Animation
            } else {
                setEmailError(result.error);
            }
        } catch (err) {
            setEmailError("Unexpected network error");
        }
    };

    const handleOtpChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        if (text && index < 5) {
            otpRefs.current[index + 1].focus();
        }
    };

    const handleOtpKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1].focus();
        }
    };

    const handleStep2 = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setEmailError("Please enter the full 6-digit code");
            return;
        }

        // Clear previous errors
        setEmailError('');

        const result = await validateOtp(email, otpCode);
        if (result.success) {
            setStep(3); // Direct State Update - No Animation
        } else {
            setEmailError(result.error);
        }
    };

    const handleStep3 = async () => {
        if (fullName.length < 2) return Alert.alert("Error", "Name too short");
        if (password.length < 6) return Alert.alert("Error", "Password too short");

        const otpCode = otp.join('');
        const result = await verifySignup(email, password, otpCode, fullName);
        if (!result.success) {
            Alert.alert("Error", result.error);
        }
    };

    const getPasswordColor = () => {
        if (password.length > 8) return '#00C851';
        if (password.length > 5) return '#FFBB33';
        return '#CC0000';
    };

    return (
        <LinearGradient colors={colors.background} style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* Error Display */}
                    {emailError ? (
                        <View style={{ padding: 10, backgroundColor: '#ffebee', marginBottom: 20, borderRadius: 8 }}>
                            <Text style={{ color: '#c62828', textAlign: 'center' }}>{emailError}</Text>
                        </View>
                    ) : null}

                    {/* Progress Indicator */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.dot, step >= 1 && styles.activeDot]} />
                        <View style={[styles.line, step >= 2 && styles.activeLine]} />
                        <View style={[styles.dot, step >= 2 && styles.activeDot]} />
                        <View style={[styles.line, step >= 3 && styles.activeLine]} />
                        <View style={[styles.dot, step >= 3 && styles.activeDot]} />
                    </View>

                    <View style={{ width: '100%' }}>

                        {/* STEP 1: EMAIL */}
                        {step === 1 && (
                            <View style={styles.stepContainer}>
                                <Text style={[styles.header, { color: colors.text }]}>Get Started</Text>
                                <Text style={[styles.subHeader, { color: colors.textSecondary }]}>Enter your email to join.</Text>

                                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: emailError ? '#ff4444' : colors.border }]}>
                                    <Ionicons name="mail-outline" size={20} color={colors.placeholder} style={styles.icon} />
                                    <TextInput
                                        placeholder="name@example.com"
                                        placeholderTextColor={colors.placeholder}
                                        style={[styles.input, { color: colors.text }]}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                                <TouchableOpacity onPress={handleStep1} style={[styles.btnPrimary, { backgroundColor: colors.accent }]}>
                                    {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Continue</Text>}
                                </TouchableOpacity>

                                <View style={styles.divider}>
                                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                                    <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                                </View>

                                {/* SKIP BUTTON */}
                                <TouchableOpacity
                                    onPress={async () => {
                                        const devEmail = 'dev@example.com';
                                        const devPassword = 'devpass123';

                                        // 1. Try Login (using login from context)
                                        const loginResult = await login(devEmail, devPassword);
                                        if (loginResult.success) return;

                                        // 2. If Login failed, Signup
                                        const signupResult = await verifySignup(devEmail, devPassword, '000000', 'Dev User');
                                        if (!signupResult.success) {
                                            const errMsg = typeof signupResult.error === 'object' ? JSON.stringify(signupResult.error) : signupResult.error;
                                            Alert.alert("Error", "Dev Mode Failed: " + errMsg);
                                        }
                                    }}
                                    style={{ marginBottom: 15, padding: 10 }}
                                >
                                    <Text style={{ color: colors.textSecondary, textDecorationLine: 'underline' }}>
                                        Skip Verification (Dev Mode)
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.btnGoogle, { borderColor: colors.border, backgroundColor: colors.card }]}>
                                    <Ionicons name="logo-google" size={20} color={colors.text} />
                                    <Text style={[styles.btnGoogleText, { color: colors.text }]}>Continue with Google</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* STEP 2: OTP */}
                        {step === 2 && (
                            <View style={styles.stepContainer}>
                                <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                                </TouchableOpacity>

                                <Text style={[styles.header, { color: colors.text }]}>Verify Email</Text>
                                <Text style={[styles.subHeader, { color: colors.textSecondary }]}>
                                    Code sent to {email}
                                </Text>

                                <View style={styles.otpContainer}>
                                    {otp.map((digit, index) => (
                                        <TextInput
                                            key={index}
                                            ref={ref => otpRefs.current[index] = ref}
                                            style={[styles.otpBox, {
                                                backgroundColor: colors.inputBg,
                                                borderColor: digit ? colors.accent : colors.border,
                                                color: colors.text,
                                                // Web fixes
                                                width: 45,
                                                minWidth: 40,
                                                height: 50,
                                            }]}
                                            maxLength={1}
                                            keyboardType="number-pad"
                                            value={digit}
                                            onChangeText={(text) => handleOtpChange(text, index)}
                                            onKeyPress={(e) => handleOtpKeyPress(e, index)}
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </View>

                                <TouchableOpacity onPress={handleStep2} style={[styles.btnPrimary, { backgroundColor: colors.accent }]}>
                                    {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Verify Code</Text>}
                                </TouchableOpacity>

                                <TouchableOpacity disabled={timer > 0} onPress={handleStep1}>
                                    <Text style={[styles.resendText, { color: timer > 0 ? colors.textSecondary : colors.accent }]}>
                                        {timer > 0 ? `Resend code in ${timer}s` : "Resend Code"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* STEP 3: PROFILE */}
                        {step === 3 && (
                            <View style={styles.stepContainer}>
                                <Text style={[styles.header, { color: colors.text }]}>Complete Profile</Text>
                                <Text style={[styles.subHeader, { color: colors.textSecondary }]}>Secure your account.</Text>

                                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: fullName.length > 2 ? '#00C851' : colors.border }]}>
                                    <Ionicons name="person-outline" size={20} color={colors.placeholder} style={styles.icon} />
                                    <TextInput
                                        placeholder="Full Name / Username"
                                        placeholderTextColor={colors.placeholder}
                                        style={[styles.input, { color: colors.text }]}
                                        value={fullName}
                                        onChangeText={setFullName}
                                    />
                                    {fullName.length > 2 && <Ionicons name="checkmark-circle" size={20} color="#00C851" />}
                                </View>

                                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: getPasswordColor() }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={colors.placeholder} style={styles.icon} />
                                    <TextInput
                                        placeholder="Password"
                                        placeholderTextColor={colors.placeholder}
                                        style={[styles.input, { color: colors.text }]}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>
                                {password.length > 0 && password.length < 6 && (
                                    <Text style={styles.errorText}>Must be at least 6 characters</Text>
                                )}

                                <TouchableOpacity onPress={handleStep3} style={[styles.btnPrimary, { backgroundColor: colors.accent }]}>
                                    {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Create Account</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                    </View>

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 40 }}>
                        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                            Already have an account? <Text style={{ color: colors.accent, fontWeight: 'bold' }}>Log In</Text>
                        </Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 30, justifyContent: 'center' },

    progressContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#333' },
    activeDot: { backgroundColor: '#6c63ff', transform: [{ scale: 1.2 }] },
    line: { width: 30, height: 2, backgroundColor: '#333', marginHorizontal: 5 },
    activeLine: { backgroundColor: '#6c63ff' },

    stepContainer: { width: '100%', alignItems: 'center' },
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
    errorText: { color: '#ff4444', alignSelf: 'flex-start', marginLeft: 5, marginBottom: 10, fontSize: 12 },

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

    // OTP Styles
    otpContainer: { flexDirection: 'row', justifyContent: 'center', width: '100%', gap: 5, marginBottom: 30 },
    otpBox: {
        flex: 1, height: 60, borderRadius: 12, borderWidth: 1.5,
        textAlign: 'center', fontSize: 24, fontWeight: 'bold',
        elevation: 2
    },
    backBtn: { alignSelf: 'flex-start', marginBottom: 20 },
    resendText: { marginTop: 20, fontSize: 14, fontWeight: '600' }
});
