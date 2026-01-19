import React, { createContext, useState, useEffect } from 'react';
import client from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Default true for checking storage

    useEffect(() => {
        isLoggedIn();
    }, []);

    const isLoggedIn = async () => {
        try {
            setIsLoading(true);
            let userToken = await AsyncStorage.getItem('userToken');
            if (userToken) {
                setUserToken(userToken);
                client.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
            }
            setIsLoading(false);
        } catch (e) {
            console.log("isLoggedIn error", e);
            setIsLoading(false);
        }
    };

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);

            const response = await client.post('/auth/login', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const token = response.data.access_token;
            console.log("Login Success, Token:", token); // DEBUG

            setUserToken(token);
            await AsyncStorage.setItem('userToken', token);
            client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setIsLoading(false);
            return { success: true };
        } catch (e) {
            // ... existing error handling ...
            console.log("Login error full:", e);
            let msg = "Something went wrong";
            if (e.response && e.response.data) {
                msg = e.response.data.detail || JSON.stringify(e.response.data);
            } else if (e.message) {
                msg = e.message;
            }
            setIsLoading(false);
            return { success: false, error: msg };
        }
    };

    const signup = async (email, password) => {
        // Legacy
        return false;
    };

    const sendOtp = async (email) => {
        setIsLoading(true);
        try {
            await client.post('/auth/send-otp', { email });
            setIsLoading(false);
            return { success: true };
        } catch (e) {
            setIsLoading(false);
            console.log("Send OTP Error", e);
            let msg = "Failed to send OTP";
            if (e.response && e.response.data) {
                const detail = e.response.data.detail;
                if (typeof detail === 'object') {
                    msg = JSON.stringify(detail);
                } else if (detail) {
                    msg = detail;
                }
            } else if (e.message) {
                msg = e.message;
            }
            return { success: false, error: msg };
        }
    };

    const validateOtp = async (email, otp) => {
        setIsLoading(true);
        try {
            await client.post('/auth/validate-otp', { email, otp });
            setIsLoading(false);
            return { success: true };
        } catch (e) {
            setIsLoading(false);
            console.log("Validate OTP Error", e);
            return { success: false, error: e.response?.data?.detail || "Invalid OTP" };
        }
    };

    const verifySignup = async (email, password, otp, fullName) => {
        setIsLoading(true);
        try {
            console.log("Verifying Signup for:", email);
            const response = await client.post('/auth/verify-signup', { email, password, otp, full_name: fullName });
            const token = response.data.access_token;
            console.log("Signup Verified, Token:", token ? "Received" : "Missing"); // DEBUG

            setUserToken(token);
            await AsyncStorage.setItem('userToken', token);
            client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setIsLoading(false);
            return { success: true };
        } catch (e) {
            console.log("Verify error", e);
            setIsLoading(false);
            return { success: false, error: e.response?.data?.detail || "Verification failed" };
        }
    };

    const logout = () => {
        setUserToken(null);
        AsyncStorage.removeItem('userToken');
        delete client.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ login, signup, sendOtp, validateOtp, verifySignup, logout, userToken, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
