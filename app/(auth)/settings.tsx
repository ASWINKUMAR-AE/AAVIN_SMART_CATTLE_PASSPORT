import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { getCurrentApiUrl, setCustomApiUrl } from '../../services/api';
import axios from 'axios';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { user, updateLanguage, logout } = useAuth();

  const [apiUrl, setApiUrl] = useState(getCurrentApiUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  useEffect(() => {
    setApiUrl(getCurrentApiUrl());
  }, []);

  const handleSaveApiUrl = async () => {
    if (!apiUrl.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please include http:// or https://');
      return;
    }
    await setCustomApiUrl(apiUrl.trim());
    Alert.alert('Saved', 'API Base URL updated successfully.');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const cleanUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
      const res = await axios.get(`${cleanUrl}/health`, { timeout: 4000 });
      if (res.status === 200) {
        setConnectionStatus('✅ Connected to Aavin Backend successfully!');
      } else {
        setConnectionStatus(`⚠️ Received HTTP ${res.status}`);
      }
    } catch (err: any) {
      setConnectionStatus(`❌ Connection failed: ${err.message}. Check that Node server is running and your PC IP is reachable.`);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[Typography.title2, { color: colors.text, marginBottom: 12 }]}>
        Server & Network Configuration
      </Text>

      <Card>
        <Text style={[Typography.headline, { color: colors.text, marginBottom: 8 }]}>
          API Endpoint (Host IP)
        </Text>
        <Text style={[Typography.footnote, { color: colors.textSecondary, marginBottom: 12 }]}>
          For physical phones on Wi-Fi, enter your computer LAN IP (e.g. http://192.168.1.15:4000/api/v1):
        </Text>

        <TextField
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://192.168.1.100:4000/api/v1"
          autoCapitalize="none"
          autoCorrect={false}
          clearButton
        />

        <View style={styles.btnRow}>
          <Button
            title="Save URL"
            size="sm"
            onPress={handleSaveApiUrl}
            style={{ flex: 1, marginRight: 6 }}
          />
          <Button
            title="Test Connection"
            variant="secondary"
            size="sm"
            loading={testingConnection}
            onPress={handleTestConnection}
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        {connectionStatus && (
          <Text style={[Typography.caption1, { color: colors.text, marginTop: 12, fontWeight: '600' }]}>
            {connectionStatus}
          </Text>
        )}
      </Card>

      <GroupedList title="Appearance & Theme">
        <ListRow
          title="Theme Mode"
          value={mode === 'system' ? 'System Automatic' : mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          icon={mode === 'dark' ? 'moon-outline' : 'sunny-outline'}
          onPress={() => {
            const nextMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
            setMode(nextMode);
          }}
          showChevron
        />
      </GroupedList>

      <GroupedList title="Language (மொழி)">
        <ListRow
          title="English"
          value={user?.preferredLanguage === 'en' ? '✓ Selected' : ''}
          icon="language-outline"
          onPress={() => updateLanguage('en')}
        />
        <ListRow
          title="தமிழ் (Tamil)"
          value={user?.preferredLanguage === 'ta' ? '✓ Selected' : ''}
          icon="language-outline"
          onPress={() => updateLanguage('ta')}
          isLast
        />
      </GroupedList>

      {user && (
        <Button
          title="Sign Out"
          variant="destructive"
          onPress={logout}
          style={{ marginTop: 24 }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
});
