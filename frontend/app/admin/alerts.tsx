import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { Colors } from '../../constants/Colors';

interface AlertItem {
  _id: string;
  user_id: string;
  symbol: string;
  condition: string;
  threshold: number;
  is_active: boolean;
  triggered_count: number;
  created_at: string;
  last_triggered?: string;
}

export default function AlertManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [allPaused, setAllPaused] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const token = await storage.getItem('authToken');
      const data = await api.get('/api/admin/alerts?limit=100', token);
      setAlerts(data.alerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      Alert.alert('Error', 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseAll = async () => {
    Alert.alert(
      'Pause All Alerts',
      'This will pause all active alerts globally. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause All',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await storage.getItem('authToken');
              await api.patch('/api/admin/alerts/pause-all', {}, token);
              setAllPaused(true);
              Alert.alert('Success', 'All alerts have been paused');
              loadAlerts();
            } catch (error) {
              Alert.alert('Error', 'Failed to pause alerts');
            }
          },
        },
      ]
    );
  };

  const handleResumeAll = async () => {
    try {
      const token = await storage.getItem('authToken');
      await api.patch('/api/admin/alerts/resume-all', {}, token);
      setAllPaused(false);
      Alert.alert('Success', 'All alerts have been resumed');
      loadAlerts();
    } catch (error) {
      Alert.alert('Error', 'Failed to resume alerts');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  const activeAlerts = alerts.filter(a => a.is_active).length;
  const totalTriggered = alerts.reduce((sum, a) => sum + a.triggered_count, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Alert Management</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{alerts.length}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.activeValue]}>{activeAlerts}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalTriggered}</Text>
          <Text style={styles.statLabel}>Triggered</Text>
        </View>
      </View>

      {/* Emergency Controls */}
      <View style={styles.emergencySection}>
        <Text style={styles.sectionTitle}>Emergency Controls</Text>
        <View style={styles.emergencyButtons}>
          <TouchableOpacity
            style={[styles.emergencyButton, styles.pauseButton]}
            onPress={handlePauseAll}
            disabled={allPaused}
          >
            <Ionicons name="pause-circle" size={24} color="#fff" />
            <Text style={styles.emergencyButtonText}>Pause All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.emergencyButton, styles.resumeButton]}
            onPress={handleResumeAll}
            disabled={!allPaused}
          >
            <Ionicons name="play-circle" size={24} color="#fff" />
            <Text style={styles.emergencyButtonText}>Resume All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Alert List */}
      <ScrollView style={styles.listContainer}>
        <Text style={styles.sectionTitle}>All Alerts</Text>
        {alerts.map(alert => (
          <View key={alert._id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={styles.alertHeaderLeft}>
                <Text style={styles.alertSymbol}>{alert.symbol}</Text>
                <View style={[
                  styles.statusBadge,
                  alert.is_active ? styles.statusActive : styles.statusInactive
                ]}>
                  <Text style={styles.statusText}>
                    {alert.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>
              <Ionicons 
                name={alert.is_active ? "notifications" : "notifications-off"} 
                size={24} 
                color={alert.is_active ? Colors.dark.primary : Colors.dark.textSecondary} 
              />
            </View>
            
            <Text style={styles.alertCondition}>
              {alert.condition} {alert.threshold}
            </Text>
            
            <View style={styles.alertMeta}>
              <Text style={styles.metaText}>
                User: {alert.user_id.substring(0, 8)}...
              </Text>
              <Text style={styles.metaText}>
                Triggered: {alert.triggered_count}x
              </Text>
            </View>

            <View style={styles.alertDates}>
              <Text style={styles.dateText}>
                Created: {new Date(alert.created_at).toLocaleDateString()}
              </Text>
              {alert.last_triggered && (
                <Text style={styles.dateText}>
                  Last: {new Date(alert.last_triggered).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    margin: 4,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  activeValue: {
    color: '#22c55e',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  emergencySection: {
    padding: 20,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  emergencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emergencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  pauseButton: {
    backgroundColor: '#ef4444',
  },
  resumeButton: {
    backgroundColor: '#22c55e',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  alertCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#22c55e20',
  },
  statusInactive: {
    backgroundColor: Colors.dark.border,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  alertCondition: {
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  alertDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
});
