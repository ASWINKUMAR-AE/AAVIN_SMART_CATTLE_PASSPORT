import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Switch } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function AISettingsScreen() {
  const { colors } = useTheme();

  const [providerIndex, setProviderIndex] = useState(0); // 0: openrouter, 1: own_api, 2: disabled
  const providers = ['OpenRouter', 'Own AI API', 'Disabled'];
  const providerKeys = ['openrouter', 'own_api', 'disabled'];

  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [fallbackProviderIndex, setFallbackProviderIndex] = useState(1); // 0: openrouter, 1: own_api
  const fallbackKeys = ['openrouter', 'own_api'];

  const [openrouterModel, setOpenrouterModel] = useState('meta-llama/llama-3.3-70b-instruct:free');
  const [ownApiModel, setOwnApiModel] = useState('dairy-llama-7b');
  const [timeoutMs, setTimeoutMs] = useState('15000');

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await api.get('/ai/admin/config');
      if (res.data?.data) {
        const c = res.data.data;
        const pIdx = providerKeys.indexOf(c.active_provider);
        setProviderIndex(pIdx >= 0 ? pIdx : 0);
        setFallbackEnabled(Boolean(c.fallback_enabled));
        const fbIdx = fallbackKeys.indexOf(c.fallback_provider);
        setFallbackProviderIndex(fbIdx >= 0 ? fbIdx : 1);
        if (c.openrouter_model) setOpenrouterModel(c.openrouter_model);
        if (c.own_api_model) setOwnApiModel(c.own_api_model);
        if (c.timeout_ms) setTimeoutMs(String(c.timeout_ms));
      }
    } catch (e) {
      console.warn('Failed to load AI settings:', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await api.patch('/ai/admin/config', {
        activeProvider: providerKeys[providerIndex],
        isEnabled: providerKeys[providerIndex] !== 'disabled',
        fallbackEnabled,
        fallbackProvider: fallbackKeys[fallbackProviderIndex],
        openrouterModel,
        ownApiModel,
        timeoutMs: parseInt(timeoutMs, 10) || 15000,
      });

      Alert.alert('Settings Saved', 'AI configuration updated on the Node.js backend.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/ai/admin/test');
      if (res.data?.data) {
        const d = res.data.data;
        setTestResult(`✅ Success! Provider: [${d.provider}] • Latency: ${d.latencyMs}ms\nResponse: "${d.text}"`);
      }
    } catch (err: any) {
      setTestResult(`❌ Test Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Policy Notice */}
      <View style={[styles.policyNotice, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="shield-checkmark" size={20} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={[Typography.caption1, { color: colors.text, flex: 1 }]}>
          AI Service Control: Credentials and endpoints are managed server-side. AI never makes, alters, or releases food safety decisions.
        </Text>
      </View>

      <Card>
        <Text style={[Typography.title2, { color: colors.text, marginBottom: 8 }]}>
          Primary AI Provider
        </Text>
        <Text style={[Typography.footnote, { color: colors.textSecondary, marginBottom: 12 }]}>
          Select active intelligence engine:
        </Text>

        <SegmentedControl
          values={providers}
          selectedIndex={providerIndex}
          onChange={setProviderIndex}
        />

        {providerIndex === 0 && (
          <TextField
            label="OpenRouter Model Identifier"
            value={openrouterModel}
            onChangeText={setOpenrouterModel}
            placeholder="meta-llama/llama-3.3-70b-instruct:free"
          />
        )}

        {providerIndex === 1 && (
          <TextField
            label="Private / Self-Hosted Model Name"
            value={ownApiModel}
            onChangeText={setOwnApiModel}
            placeholder="dairy-llama-7b"
          />
        )}

        <TextField
          label="Inference Timeout (Milliseconds)"
          value={timeoutMs}
          onChangeText={setTimeoutMs}
          keyboardType="number-pad"
        />

        {/* Fallback Configuration (Off by default) */}
        <View style={[styles.fallbackBox, { borderTopColor: colors.separator }]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.headline, { color: colors.text }]}>
                Automatic AI Fallback (Optional)
              </Text>
              <Text style={[Typography.caption1, { color: colors.textSecondary }]}>
                Disabled by default. Triggers only upon primary network timeout or 5xx. Never silent.
              </Text>
            </View>
            <Switch
              value={fallbackEnabled}
              onValueChange={setFallbackEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {fallbackEnabled && (
            <View style={{ marginTop: 12 }}>
              <Text style={[Typography.subhead, { color: colors.textSecondary, marginBottom: 6, fontWeight: '600' }]}>
                Fallback Provider:
              </Text>
              <SegmentedControl
                values={['OpenRouter', 'Own AI API']}
                selectedIndex={fallbackProviderIndex}
                onChange={setFallbackProviderIndex}
              />
            </View>
          )}
        </View>

        <View style={styles.btnRow}>
          <Button
            title="Save AI Configuration"
            onPress={handleSave}
            loading={saving}
            style={{ flex: 1, marginRight: 6 }}
          />
          <Button
            title="Test Connectivity"
            variant="secondary"
            onPress={handleTest}
            loading={testing}
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        {testResult && (
          <View style={[styles.testResultBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[Typography.footnote, { color: colors.text }]}>{testResult}</Text>
          </View>
        )}
      </Card>
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
  policyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  fallbackBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
  testResultBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
