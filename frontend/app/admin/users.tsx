import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { Colors } from '../../constants/Colors';

interface User {
  _id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_banned: boolean;
  created_at: string;
  last_login?: string;
}

export default function UserManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [filterRole]);

  const loadUsers = async () => {
    try {
      const token = await storage.getItem('authToken');
      const params = new URLSearchParams();
      if (filterRole) params.append('role', filterRole);
      
      const data = await api.get(`/api/admin/users?${params}`, token);
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, currentlyBanned: boolean) => {
    Alert.alert(
      currentlyBanned ? 'Unban User' : 'Ban User',
      `Are you sure you want to ${currentlyBanned ? 'unban' : 'ban'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentlyBanned ? 'Unban' : 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await storage.getItem('authToken');
              const endpoint = currentlyBanned ? 'unban' : 'ban';
              await api.patch(`/api/admin/users/${userId}/${endpoint}`, {}, token);
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to update user status');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const roles = ['user', 'moderator', 'admin', 'super_admin'];
    const roleOptions = roles.map(role => ({
      text: role.toUpperCase(),
      onPress: async () => {
        try {
          const token = await storage.getItem('authToken');
          await api.patch(`/api/admin/users/${userId}/role`, { role }, token);
          loadUsers();
        } catch (error) {
          Alert.alert('Error', 'Failed to update user role');
        }
      },
    }));

    Alert.alert('Change User Role', 'Select new role:', [
      ...roleOptions,
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Text style={styles.title}>User Management</Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={Colors.dark.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={Colors.dark.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !filterRole && styles.filterChipActive]}
            onPress={() => setFilterRole(null)}
          >
            <Text style={[styles.filterText, !filterRole && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          {['user', 'moderator', 'admin', 'super_admin'].map(role => (
            <TouchableOpacity
              key={role}
              style={[styles.filterChip, filterRole === role && styles.filterChipActive]}
              onPress={() => setFilterRole(role)}
            >
              <Text style={[styles.filterText, filterRole === role && styles.filterTextActive]}>
                {role.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* User List */}
      <ScrollView style={styles.listContainer}>
        {filteredUsers.map(user => (
          <View key={user._id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <Text style={styles.userName}>{user.full_name}</Text>
                <View style={[
                  styles.roleBadge,
                  user.role === 'super_admin' && styles.roleSuperAdmin,
                  user.role === 'admin' && styles.roleAdmin,
                  user.role === 'moderator' && styles.roleModerator,
                ]}>
                  <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.userMeta}>
                <Text style={styles.metaText}>
                  Created: {new Date(user.created_at).toLocaleDateString()}
                </Text>
                {user.last_login && (
                  <Text style={styles.metaText}>
                    Last login: {new Date(user.last_login).toLocaleDateString()}
                  </Text>
                )}
              </View>
              {user.is_banned && (
                <View style={styles.bannedBadge}>
                  <Ionicons name="ban" size={16} color={Colors.dark.error} />
                  <Text style={styles.bannedText}>BANNED</Text>
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleChangeRole(user._id, user.role)}
              >
                <Ionicons name="shield" size={20} color={Colors.dark.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionIcon, user.is_banned && styles.actionIconUnban]}
                onPress={() => handleBanUser(user._id, user.is_banned)}
              >
                <Ionicons 
                  name={user.is_banned ? "checkmark-circle" : "ban"} 
                  size={20} 
                  color={user.is_banned ? "#22c55e" : Colors.dark.error} 
                />
              </TouchableOpacity>
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
  controls: {
    padding: 20,
    paddingTop: 0,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.dark.text,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterChipActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.dark.background,
  },
  listContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.dark.background,
  },
  roleSuperAdmin: {
    backgroundColor: '#a855f720',
  },
  roleAdmin: {
    backgroundColor: '#ef444420',
  },
  roleModerator: {
    backgroundColor: '#3b82f620',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.dark.primary,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  userMeta: {
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 2,
  },
  bannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bannedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.error,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: 12,
  },
  actionIcon: {
    padding: 8,
    marginVertical: 4,
  },
  actionIconUnban: {
    // Additional styling for unban action
  },
});
