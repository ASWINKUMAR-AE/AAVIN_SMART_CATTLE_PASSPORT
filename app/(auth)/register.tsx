import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Card } from '../../components/ui/Card';
import { SegmentedControl } from '../../components/ui/SegmentedControl';

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [roleIndex, setRoleIndex] = useState(0); // 0: farmer, 1: vet, 2: operator, 3: vendor
  const roles = ['Farmer', 'Veterinarian', 'Operator', 'Vendor'];
  const roleKeys = ['farmer', 'veterinary', 'collection_operator', 'transport_vendor'];

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [village, setVillage] = useState('Melur Rural');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !username || !phone || !password) {
      Alert.alert('Required Fields', 'Please fill in all details');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName,
        username,
        phone,
        password,
        role: roleKeys[roleIndex],
        village,
      });
      Alert.alert('Success', 'Account registered successfully. Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      Alert.alert('Registration Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card>
        <Text style={[Typography.title2, { color: colors.text, marginBottom: 8 }]}>
          Create Account
        </Text>
        <Text style={[Typography.footnote, { color: colors.textSecondary, marginBottom: 16 }]}>
          Select your ecosystem role:
        </Text>

        <SegmentedControl
          values={roles}
          selectedIndex={roleIndex}
          onChange={setRoleIndex}
        />

        <TextField
          label="Full Name"
          placeholder="e.g. K. Murugesan"
          value={fullName}
          onChangeText={setFullName}
        />

        <TextField
          label="Username"
          placeholder="e.g. farmer_murugan"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextField
          label="10-Digit Mobile Number"
          placeholder="9842000002"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {roleIndex === 0 && (
          <TextField
            label="Village / Taluk"
            placeholder="Melur Rural"
            value={village}
            onChangeText={setVillage}
          />
        )}

        <TextField
          label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          style={{ marginTop: 16 }}
        />
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
});
