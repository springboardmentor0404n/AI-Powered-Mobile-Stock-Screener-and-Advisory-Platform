import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { Colors } from '../../constants/Colors';

interface Disclaimer {
  _id: string;
  content: string;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export default function ComplianceManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [disclaimer, setDisclaimer] = useState<Disclaimer | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    loadDisclaimer();
  }, []);

  const loadDisclaimer = async () => {
    try {
      const token = await storage.getItem('authToken');
      const data = await api.get('/api/admin/disclaimer', token);
      setDisclaimer(data);
      setNewContent(data.content || '');
    } catch (error) {
      console.error('Failed to load disclaimer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDisclaimer = async () => {
    if (!newContent.trim()) {
      Alert.alert('Error', 'Disclaimer content cannot be empty');
      return;
    }

    Alert.alert(
      'Update Disclaimer',
      'This will create a new version of the disclaimer. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const token = await storage.getItem('authToken');
              await api.post('/api/admin/disclaimer', { content: newContent }, token);
              Alert.alert('Success', 'Disclaimer updated successfully');
              setEditMode(false);
              loadDisclaimer();
            } catch (error) {
              Alert.alert('Error', 'Failed to update disclaimer');
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
        <Text style={styles.title}>Compliance</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Current Disclaimer */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Risk Disclaimer</Text>
            {!editMode ? (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setEditMode(true)}
              >
                <Ionicons name="create" size={20} color={Colors.dark.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setEditMode(false);
                  setNewContent(disclaimer?.content || '');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {disclaimer && (
            <View style={styles.disclaimerInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Version:</Text>
                <Text style={styles.infoValue}>{disclaimer.version}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <View style={[
                  styles.statusBadge,
                  disclaimer.is_active ? styles.statusActive : styles.statusInactive
                ]}>
                  <Text style={styles.statusText}>
                    {disclaimer.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Updated:</Text>
                <Text style={styles.infoValue}>
                  {new Date(disclaimer.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.disclaimerContent}>
            {editMode ? (
              <>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={10}
                  value={newContent}
                  onChangeText={setNewContent}
                  placeholder="Enter disclaimer content..."
                  placeholderTextColor={Colors.dark.textSecondary}
                />
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveDisclaimer}
                >
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save New Version</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.disclaimerText}>
                {disclaimer?.content || 'No disclaimer set'}
              </Text>
            )}
          </View>
        </View>

        {/* Compliance Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance Guidelines</Text>
          <View style={styles.guidelineCard}>
            <View style={styles.guidelineHeader}>
              <Ionicons name="warning" size={24} color="#f59e0b" />
              <Text style={styles.guidelineTitle}>Important Reminders</Text>
            </View>
            <Text style={styles.guidelineText}>
              • All investment advice must include appropriate risk disclaimers{'\n'}
              • Users must acknowledge disclaimers before receiving recommendations{'\n'}
              • Disclaimers should be versioned for audit purposes{'\n'}
              • Regular review of compliance requirements is mandatory{'\n'}
              • Changes must be logged with admin information
            </Text>
          </View>
        </View>

        {/* Regulatory Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Regulatory Framework</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoCardRow}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.dark.primary} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Data Protection</Text>
                <Text style={styles.infoCardText}>
                  User data is encrypted and stored securely. Access is logged and monitored.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardRow}>
              <Ionicons name="document-text" size={20} color={Colors.dark.primary} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Terms of Service</Text>
                <Text style={styles.infoCardText}>
                  Last updated: {new Date().toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardRow}>
              <Ionicons name="lock-closed" size={20} color={Colors.dark.primary} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Privacy Policy</Text>
                <Text style={styles.infoCardText}>
                  Compliant with applicable data protection regulations.
                </Text>
              </View>
            </View>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  disclaimerInfo: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '500',
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
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  disclaimerContent: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  disclaimerText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 22,
  },
  textArea: {
    backgroundColor: Colors.dark.background,
    color: Colors.dark.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  guidelineCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  guidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  guidelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  guidelineText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
});
