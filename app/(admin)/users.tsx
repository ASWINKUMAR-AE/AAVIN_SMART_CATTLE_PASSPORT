import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { StatusChip } from '../../components/ui/StatusChip';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { api } from '../../services/api';

export default function UserManagementScreen() {
  const { colors } = useTheme();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users${filterRole ? `?role=${filterRole}` : ''}`);
      if (res.data?.data) {
        setUsers(res.data.data);
      }
    } catch (e) {
      console.warn('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filterRole]);

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    Alert.alert(
      'Confirm Status Change',
      `Change account status for ${user.full_name} (${user.username}) to ${nextStatus.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.patch(`/admin/users/${user.id}/status`, { status: nextStatus });
              Alert.alert('Updated', `User status updated to ${nextStatus}`);
              loadUsers();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUsers} tintColor={colors.primary} />}
    >
      <Text style={[Typography.title2, { color: colors.text, marginHorizontal: 16, marginTop: 8, marginBottom: 12 }]}>
        Ecosystem User Management
      </Text>

      {/* Role Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <Button
          title="All Roles"
          variant={filterRole === '' ? 'primary' : 'secondary'}
          size="sm"
          onPress={() => setFilterRole('')}
          style={{ marginRight: 6 }}
        />
        <Button
          title="Farmers"
          variant={filterRole === 'farmer' ? 'primary' : 'secondary'}
          size="sm"
          onPress={() => setFilterRole('farmer')}
          style={{ marginRight: 6 }}
        />
        <Button
          title="Veterinarians"
          variant={filterRole === 'veterinary' ? 'primary' : 'secondary'}
          size="sm"
          onPress={() => setFilterRole('veterinary')}
          style={{ marginRight: 6 }}
        />
        <Button
          title="Operators"
          variant={filterRole === 'collection_operator' ? 'primary' : 'secondary'}
          size="sm"
          onPress={() => setFilterRole('collection_operator')}
          style={{ marginRight: 6 }}
        />
        <Button
          title="Vendors"
          variant={filterRole === 'transport_vendor' ? 'primary' : 'secondary'}
          size="sm"
          onPress={() => setFilterRole('transport_vendor')}
          style={{ marginRight: 6 }}
        />
      </ScrollView>

      {/* User Directory */}
      <GroupedList title="Registered System Users" footer="Tap any user to toggle active/suspended account status">
        {users.map((u, idx) => (
          <ListRow
            key={u.id}
            title={u.full_name}
            subtitle={`@${u.username} • Mobile: ${u.phone} • Role: ${u.roles}`}
            icon="person-outline"
            rightComponent={
              <View style={{ alignItems: 'flex-end' }}>
                <StatusChip status={u.status} size="sm" />
              </View>
            }
            onPress={() => handleToggleStatus(u)}
            isLast={idx === users.length - 1}
          />
        ))}
      </GroupedList>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
});
