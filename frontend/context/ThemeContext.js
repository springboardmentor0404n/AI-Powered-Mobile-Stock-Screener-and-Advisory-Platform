import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [theme, setTheme] = useState('dark'); // Default to dark for premium feel

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('appTheme');
            if (savedTheme) {
                setTheme(savedTheme);
            }
        } catch (e) {
            console.log('Failed to load theme', e);
        }
    };

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        try {
            await AsyncStorage.setItem('appTheme', newTheme);
        } catch (e) {
            console.log('Failed to save theme', e);
        }
    };

    const colors = {
        dark: {
            background: ['#0f0c29', '#302b63', '#24243e'], // Gradient colors
            card: 'rgba(255,255,255,0.05)',
            text: '#fff',
            textSecondary: '#aaa',
            accent: '#00ff83',
            border: 'rgba(255,255,255,0.1)',
            tabBar: '#24243e',
            tabActive: '#302b63',
            danger: '#ff4d4d',
            warning: '#f4d03f',
            modalBg: '#24243e',
            inputBg: 'rgba(255,255,255,0.1)',
            placeholder: '#aaa'
        },
        light: {
            background: ['#f0f2f5', '#e1e5ea', '#dbe0e6'], // Gradient colors light
            card: '#ffffff',
            text: '#1a1a1a',
            textSecondary: '#666',
            accent: '#00cc66',
            border: '#e1e4e8',
            tabBar: '#ffffff',
            tabActive: '#e6e6e6',
            danger: '#d32f2f',
            warning: '#fbc02d',
            modalBg: '#ffffff',
            inputBg: '#f0f2f5',
            placeholder: '#888'
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, colors: colors[theme], toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
