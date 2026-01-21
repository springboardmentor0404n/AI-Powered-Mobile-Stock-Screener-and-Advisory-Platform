import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '../gluestack-ui.config';
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function GluestackProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  
  return (
    <GluestackUIProvider config={config} colorMode={isDark ? 'dark' : 'light'}>
      {children}
    </GluestackUIProvider>
  );
}
