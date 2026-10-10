import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (scannedValue: string) => void;
  title?: string;
  subtitle?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  title = 'Scan Cattle Ear-Tag QR',
  subtitle = 'Point camera at the cow Ear Tag QR code or lookup token',
}) => {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!scanned && data) {
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onScan(data);
      onClose();
    }
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={[Typography.headline, { color: '#FFFFFF' }]}>{title}</Text>
          <Pressable
            onPress={() => setShowManualInput(!showManualInput)}
            style={styles.manualToggleBtn}
          >
            <Ionicons name={showManualInput ? 'camera' : 'keypad'} size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {!showManualInput ? (
          <View style={styles.cameraContainer}>
            {!permission?.granted ? (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={48} color="#FFFFFF" />
                <Text style={[Typography.body, { color: '#FFFFFF', textAlign: 'center', marginTop: 12 }]}>
                  Camera access is required to scan cattle QR tokens.
                </Text>
                <Button
                  title="Grant Camera Permission"
                  onPress={requestPermission}
                  style={{ marginTop: 16 }}
                />
                <Button
                  title="Enter ID Manually Instead"
                  variant="outline"
                  onPress={() => setShowManualInput(true)}
                  style={{ marginTop: 10 }}
                />
              </View>
            ) : (
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'code128', 'ean13'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              >
                <View style={styles.overlay}>
                  <View style={styles.reticle}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                  </View>
                  <Text style={[Typography.callout, styles.promptText]}>{subtitle}</Text>
                  {scanned && (
                    <Button
                      title="Tap to Scan Again"
                      onPress={() => setScanned(false)}
                      size="sm"
                      style={styles.rescanBtn}
                    />
                  )}
                </View>
              </CameraView>
            )}
          </View>
        ) : (
          <View style={[styles.manualContainer, { backgroundColor: colors.background }]}>
            <Text style={[Typography.title2, { color: colors.text, marginBottom: 8 }]}>
              Manual Cattle Lookup
            </Text>
            <Text style={[Typography.subhead, { color: colors.textSecondary, marginBottom: 16 }]}>
              Enter Cow Tag Number (e.g. TN-MDU-COW-1001) or QR token:
            </Text>
            <TextField
              placeholder="TN-MDU-COW-1001"
              value={manualInput}
              onChangeText={setManualInput}
              autoCapitalize="characters"
              autoFocus
              clearButton
            />
            <Button
              title="Search Cattle Digital Passport"
              onPress={handleManualSubmit}
              disabled={!manualInput.trim()}
              style={{ marginTop: 16 }}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: 250,
    height: 250,
    borderRadius: 20,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#0072BC',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  promptText: {
    color: '#FFFFFF',
    marginTop: 24,
    textAlign: 'center',
    paddingHorizontal: 30,
    fontWeight: '600',
  },
  rescanBtn: {
    marginTop: 20,
  },
  manualContainer: {
    flex: 1,
    padding: 24,
  },
});
