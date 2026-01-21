import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';
import { storage } from '../utils/storage';
import { Colors } from '../constants/Colors';
import { useTheme } from '../contexts/ThemeContext';

interface SystemMetrics {
  users: {
    total: number;
    active: number;
    banned: number;
  };
  queries_24h: number;
  active_alerts: number;
}

interface SystemService {
  service: string;
  status: string;
  last_check: string;
  error?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [health, setHealth] = useState<SystemService[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const token = await storage.getItem('authToken');
      
      const [metricsData, healthData] = await Promise.all([
        api.get('/api/admin/metrics', token),
        api.get('/api/admin/health', token)
      ]);
      
      setMetrics(metricsData);
      setHealth(healthData.services);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.primaryGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* System Health */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>System Health</Text>
          {health.map((service, index) => (
            <View key={index} style={[styles.healthCard, { backgroundColor: colors.card }]}>
              <View style={styles.healthHeader}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: service.status === 'up' ? colors.success : colors.error }
                ]} />
                <Text style={[styles.serviceName, { color: colors.text }]}>{service.service}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: service.status === 'up' ? colors.success + '20' : colors.error + '20' }
                ]}>
                  <Text style={[styles.statusText, { color: service.status === 'up' ? colors.success : colors.error }]}>
                    {service.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              {service.error && (
                <Text style={[styles.errorText, { color: colors.error }]}>{service.error}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Metrics */}
        {metrics && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Metrics</Text>
            <View style={styles.metricsGrid}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.metricCard}
              >
                <Ionicons name="people" size={32} color="#fff" style={{ marginBottom: 8 }} />
                <Text style={styles.metricValue}>{metrics.users.total}</Text>
                <Text style={styles.metricLabel}>Total Users</Text>
              </LinearGradient>

              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.metricCard}
              >
                <Ionicons name="checkmark-circle" size={32} color="#fff" style={{ marginBottom: 8 }} />
                <Text style={styles.metricValue}>{metrics.users.active}</Text>
                <Text style={styles.metricLabel}>Active Users</Text>
              </LinearGradient>

              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.metricCard}
              >
                <Ionicons name="search" size={32} color="#fff" style={{ marginBottom: 8 }} />
                <Text style={styles.metricValue}>{metrics.queries_24h}</Text>
                <Text style={styles.metricLabel}>Queries (24h)</Text>
              </LinearGradient>

              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.metricCard}
              >
                <Ionicons name="notifications" size={32} color="#fff" style={{ marginBottom: 8 }} />
                <Text style={styles.metricValue}>42</Text>
                <Text style={styles.metricLabel}>Active Alerts</Text>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => router.push('/admin/users' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Manage Users</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => router.push('/admin/queries' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={24} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.text }]}>Query Logs</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => router.push('/admin/alerts' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications" size={24} color={colors.warning} />
            <Text style={[styles.actionText, { color: colors.text }]}>Alert Management</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => router.push('/admin/analytics' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="analytics" size={24} color={colors.info} />
            <Text style={[styles.actionText, { color: colors.text }]}>Analytics</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => router.push('/admin/compliance' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark" size={24} color={colors.accent} />
            <Text style={[styles.actionText, { color: colors.text }]}>Compliance</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => router.push('/admin/super-admin' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings" size={24} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.text }]}>Super Admin Tools</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    letterSpacing: 0.3,
  },
  healthCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    marginLeft: 22,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.95,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  metricDanger: {
    color: Colors.dark.error,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark.text,
    marginLeft: 16,
  },
});
