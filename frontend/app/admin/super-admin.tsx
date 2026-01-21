import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { Colors } from '../../constants/Colors';

interface FeatureFlag {
  _id: string;
  name: string;
  enabled: boolean;
  description: string;
  created_at: string;
}

interface SystemConfig {
  llm_rate_limit?: number;
  max_queries_per_user?: number;
  maintenance_mode?: boolean;
}

export default function SuperAdminTools() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [config, setConfig] = useState<SystemConfig>({});
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDesc, setNewFeatureDesc] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await storage.getItem('authToken');
      
      const [featuresData, configData] = await Promise.all([
        api.get('/api/admin/features', token),
        api.get('/api/admin/system/config', token).catch(() => ({}))
      ]);
      
      setFeatures(featuresData.flags || []);
      setConfig(configData || {});
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load super admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (flagName: string, currentState: boolean) => {
    try {
      const token = await storage.getItem('authToken');
      await api.patch(`/api/admin/features/${flagName}/toggle`, 
        { enabled: !currentState }, 
        token
      );
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle feature');
    }
  };

  const handleCreateFeature = async () => {
    if (!newFeatureName.trim()) {
      Alert.alert('Error', 'Feature name is required');
      return;
    }

    try {
      const token = await storage.getItem('authToken');
      await api.post('/api/admin/features', {
        name: newFeatureName,
        description: newFeatureDesc,
        enabled: false
      }, token);
      
      setNewFeatureName('');
      setNewFeatureDesc('');
      Alert.alert('Success', 'Feature flag created');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to create feature flag');
    }
  };

  const handleDeleteFeature = async (flagName: string) => {
    Alert.alert(
      'Delete Feature Flag',
      `Are you sure you want to delete "${flagName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await storage.getItem('authToken');
              await api.delete(`/api/admin/features/${flagName}`, token);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete feature flag');
            }
          },
        },
      ]
    );
  };

  const handleTriggerBackup = async () => {
    Alert.alert(
      'System Backup',
      'This will trigger a full system backup. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Backup',
          onPress: async () => {
            try {
              const token = await storage.getItem('authToken');
              const result = await api.post('/api/admin/system/backup', {}, token);
              Alert.alert('Success', `Backup triggered: ${result.backup_id}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to trigger backup');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Super Admin Tools</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Feature Flags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feature Flags</Text>
          
          {/* Create New Feature */}
          <View style={styles.createCard}>
            <Text style={styles.createTitle}>Create New Feature</Text>
            <TextInput
              style={styles.input}
              placeholder="Feature name (e.g., enable_new_ui)"
              placeholderTextColor={Colors.dark.textSecondary}
              value={newFeatureName}
              onChangeText={setNewFeatureName}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor={Colors.dark.textSecondary}
              value={newFeatureDesc}
              onChangeText={setNewFeatureDesc}
            />
            <TouchableOpacity style={styles.createButton} onPress={handleCreateFeature}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Feature</Text>
            </TouchableOpacity>
          </View>

          {/* Feature List */}
          {features.map(feature => (
            <View key={feature._id} style={styles.featureCard}>
              <View style={styles.featureHeader}>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureName}>{feature.name}</Text>
                  <Text style={styles.featureDesc}>{feature.description}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteFeature(feature.name)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={20} color={Colors.dark.error} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.featureActions}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    feature.enabled ? styles.toggleEnabled : styles.toggleDisabled
                  ]}
                  onPress={() => handleToggleFeature(feature.name, feature.enabled)}
                >
                  <Ionicons 
                    name={feature.enabled ? "toggle" : "toggle-outline"} 
                    size={24} 
                    color={feature.enabled ? '#22c55e' : Colors.dark.textSecondary} 
                  />
                  <Text style={[
                    styles.toggleText,
                    feature.enabled ? styles.toggleTextEnabled : styles.toggleTextDisabled
                  ]}>
                    {feature.enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* System Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Tools</Text>
          
          <TouchableOpacity style={styles.toolCard} onPress={handleTriggerBackup}>
            <Ionicons name="cloud-upload" size={24} color={Colors.dark.primary} />
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>Trigger Backup</Text>
              <Text style={styles.toolDesc}>Create a full system backup</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toolCard}
            onPress={() => Alert.alert('Info', 'View system logs functionality')}
          >
            <Ionicons name="list" size={24} color={Colors.dark.primary} />
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>View System Logs</Text>
              <Text style={styles.toolDesc}>Access detailed system logs</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toolCard}
            onPress={() => Alert.alert('Info', 'Cost analysis functionality')}
          >
            <Ionicons name="analytics" size={24} color={Colors.dark.primary} />
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>Cost Analysis</Text>
              <Text style={styles.toolDesc}>View detailed cost breakdown</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* System Config */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Configuration</Text>
          <View style={styles.configCard}>
            <Text style={styles.configText}>
              LLM Rate Limit: {config.llm_rate_limit || 'Not set'}{'\n'}
              Max Queries/User: {config.max_queries_per_user || 'Not set'}{'\n'}
              Maintenance Mode: {config.maintenance_mode ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <View style={styles.dangerCard}>
            <Ionicons name="warning" size={24} color={Colors.dark.error} />
            <Text style={styles.dangerText}>
              These actions are irreversible. Use with extreme caution.
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  dangerTitle: {
    color: Colors.dark.error,
  },
  createCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  createTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.dark.background,
    color: Colors.dark.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    fontSize: 14,
    marginBottom: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  featureCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  deleteButton: {
    padding: 4,
  },
  featureActions: {
    marginTop: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  toggleEnabled: {
    backgroundColor: '#22c55e20',
  },
  toggleDisabled: {
    backgroundColor: Colors.dark.background,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextEnabled: {
    color: '#22c55e',
  },
  toggleTextDisabled: {
    color: Colors.dark.textSecondary,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 12,
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  toolDesc: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  configCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  configText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 22,
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef444440',
    gap: 12,
  },
  dangerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.error,
    lineHeight: 20,
  },
});
