import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, Pressable, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (scannedValue: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  title = 'Scan Pashu Aadhaar Barcode',
  subtitle = 'Align cattle ear-tag 12-digit barcode within the scanner',
}) => {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Animated laser scanline for barcode reticle
  const [scanAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible && !showManualInput) {
      setScanned(false);
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, showManualInput]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!scanned && data) {
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onScan(data.trim());
      onClose();
    }
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      onClose();
    }
  };

  const laserTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 120],
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="barcode-outline" size={20} color="#38BDF8" style={{ marginRight: 6 }} />
            <Text style={[Typography.headline, { color: '#FFFFFF' }]}>{title}</Text>
          </View>
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
                <Ionicons name="barcode-outline" size={56} color="#38BDF8" />
                <Text style={[Typography.body, { color: '#FFFFFF', textAlign: 'center', marginTop: 12 }]}>
                  Camera access is required to scan Pashu Aadhaar ear-tag barcodes.
                </Text>
                <Button
                  title="Grant Camera Permission"
                  onPress={requestPermission}
                  style={{ marginTop: 16 }}
                />
                <Button
                  title="Enter 12-Digit Tag Manually"
                  variant="outline"
                  onPress={() => setShowManualInput(true)}
                  style={{ marginTop: 10 }}
                />
              </View>
            ) : (
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{
                  barcodeTypes: ['code128', 'code39', 'ean13', 'upc_a', 'itf14', 'qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              >
                <View style={styles.overlay}>
                  {/* Badge banner above reticle */}
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>🏷️ PASHU AADHAAR 12-DIGIT BARCODE</Text>
                  </View>

                  {/* Wide Barcode Reticle with corner markers */}
                  <View style={styles.barcodeReticle}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {/* Animated Red Laser Scanline */}
                    <Animated.View
                      style={[
                        styles.laserLine,
                        { transform: [{ translateY: laserTranslateY }] },
                      ]}
                    />
                  </View>

                  <Text style={[Typography.callout, styles.promptText]}>{subtitle}</Text>
                  <Text style={styles.hintSub}>Supports Code-128, EAN-13, and 12-digit Pashu Aadhaar UID</Text>

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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="barcode" size={26} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[Typography.title2, { color: colors.text }]}>
                Manual Pashu Aadhaar
              </Text>
            </View>
            <Text style={[Typography.subhead, { color: colors.textSecondary, marginBottom: 16 }]}>
              Enter 12-Digit Pashu Aadhaar UID or Cattle Ear Tag Number:
            </Text>
            <TextField
              placeholder="100100001001"
              value={manualInput}
              onChangeText={setManualInput}
              keyboardType="number-pad"
              autoCapitalize="characters"
              autoFocus
              clearButton
            />
            <View style={styles.demoSuggestions}>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 6 }]}>
                Quick Demo Pashu Aadhaar Tags:
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {['100100001001', '100100001002', '100100001003', '100100001005'].map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => setManualInput(tag)}
                    style={[styles.tagChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                      #{tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Button
              title="Lookup Cattle Digital Passport"
              onPress={handleManualSubmit}
              disabled={!manualInput.trim()}
              style={{ marginTop: 24 }}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

// Export backwards-compatible QRScannerModal alias so all legacy references work seamlessly
export const QRScannerModal = BarcodeScannerModal;

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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagBadge: {
    backgroundColor: '#FACC15',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#713F12',
    letterSpacing: 0.5,
  },
  barcodeReticle: {
    width: 310,
    height: 140,
    borderRadius: 12,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#38BDF8',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  promptText: {
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 30,
    fontWeight: '700',
    fontSize: 15,
  },
  hintSub: {
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
  },
  rescanBtn: {
    marginTop: 20,
  },
  manualContainer: {
    flex: 1,
    padding: 24,
  },
  demoSuggestions: {
    marginTop: 14,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});
