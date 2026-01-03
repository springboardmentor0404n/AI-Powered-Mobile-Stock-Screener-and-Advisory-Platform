import React, { createContext, useState, useEffect } from 'react';
import client from '../api/client';
// import * as SecureStore from 'expo-secure-store'; // Recommended for prod, but using simple state/AsyncStorage for MVP if needed.
// For simplicity in this demo, just memory or simple non-persistent state first, can add AsyncStorage later.

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const response = await client.post('/auth/login', {
                username: email, // OAuth2 expects username
                password
            }, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const token = response.data.access_token;
            setUserToken(token);
            client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setIsLoading(false);
            return true;
        } catch (e) {
            console.log("Login error", e);
            setIsLoading(false);
            return false;
        }
    };

    const signup = async (email, password, fullName) => {
        setIsLoading(true);
        try {
            await client.post('/auth/signup', {
                email,
                password,
                full_name: fullName
            });
            setIsLoading(false);
            return true; // Proceed to login
        } catch (e) {
            console.log("Signup error", e);
            setIsLoading(false);
            return false;
        }
    };

    const logout = () => {
        setUserToken(null);
        delete client.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ login, signup, logout, userToken, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
