import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  OCRTable,
  ParsedFarmerRecord,
  ParsedCattleCandidate,
  ParsedMilkRecord,
  uploadImageToOcr,
  parseOcrApiResponse,
  mapTablesToFarmerRecords,
  mapTablesToMilkRecords,
  cleanPhoneNumber,
  cleanCattleTagId,
  parseMilkQuantity,
  KNOWN_BREEDS,
} from '../../services/ocrRegisterService';
import { AccountsApi } from '../../services/accountsApi';
import { MilkCollectionsApi } from '../../services/milkCollectionsApi';

interface OCRRegisterImportModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'farmers' | 'milk';
  onSuccess?: (savedCount: number) => void;
}

export const OCRRegisterImportModal: React.FC<OCRRegisterImportModalProps> = ({
  visible,
  onClose,
  mode,
  onSuccess,
}) => {
  const { user, activeRole } = useAuth();
  const { farmers, cows, booths, cacheFarmer } = useAavinStore();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;

  // Strict Role Check: Society ('booth') and Union ('union') only
  const isAuthorized = activeRole === 'booth' || activeRole === 'union';

  // Selected Society for Union user scope
  const authorizedSocieties = useMemo(() => {
    if (activeRole === 'booth') {
      return booths.filter(b => b.id === user?.associatedId);
    }
    return booths;
  }, [activeRole, booths, user]);

  const [selectedSocietyId, setSelectedSocietyId] = useState<string>(
    user?.associatedId || booths[0]?.id || ''
  );

  useEffect(() => {
    if (user?.associatedId && activeRole === 'booth') {
      setSelectedSocietyId(user.associatedId);
    } else if (booths.length > 0 && !selectedSocietyId) {
      setSelectedSocietyId(booths[0].id);
    }
  }, [user, activeRole, booths, selectedSocietyId]);

  // Image & Camera States
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [cameraTorch, setCameraTorch] = useState<boolean>(false);
  const [cameraMountError, setCameraMountError] = useState<string | null>(null);
  const [capturedPreviewUri, setCapturedPreviewUri] = useState<string | null>(null);
  const [isImagePreviewCollapsed, setIsImagePreviewCollapsed] = useState<boolean>(false);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // OCR Processing States
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [detectedTables, setDetectedTables] = useState<OCRTable[]>([]);
  const [farmerRecords, setFarmerRecords] = useState<ParsedFarmerRecord[]>([]);
  const [milkRecords, setMilkRecords] = useState<ParsedMilkRecord[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'needs_review' | 'duplicates'>('all');

  // Saving States
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Reset all states when modal opens
  useEffect(() => {
    if (visible) {
      setImageUri(null);
      setImageFile(null);
      setIsCameraActive(false);
      setCameraMountError(null);
      setCapturedPreviewUri(null);
      setIsProcessing(false);
      setStatusMessage('');
      setDetectedTables([]);
      setFarmerRecords([]);
      setMilkRecords([]);
      setSearchQuery('');
      setActiveFilter('all');
      setIsSaving(false);
      setIsImagePreviewCollapsed(false);
    }
  }, [visible]);

  // Confirm image replacement if data is already extracted
  const requestImageChange = (callback: () => void) => {
    const hasData = farmerRecords.length > 0 || milkRecords.length > 0;
    if (hasData) {
      Alert.alert(
        'Discard Current Records?',
        'Changing or taking a new register photo will clear current extracted records. Do you want to proceed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed',
            style: 'destructive',
            onPress: () => {
              setFarmerRecords([]);
              setMilkRecords([]);
              setDetectedTables([]);
              callback();
            },
          },
        ]
      );
    } else {
      callback();
    }
  };

  // Open Live Camera Viewfinder
  const handleOpenCamera = async () => {
    requestImageChange(async () => {
      setCameraMountError(null);
      setCapturedPreviewUri(null);
      setIsCameraActive(true);

      if (!permission?.granted) {
        try {
          await requestPermission();
        } catch (err) {
          console.warn('Camera permission request error:', err);
        }
      }
    });
  };

  // Capture Photo from Live Camera
  const handleCapturePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
        if (photo?.uri) {
          setCapturedPreviewUri(photo.uri);
          setImageFile(photo);
        }
      } catch (err: any) {
        console.warn('Capture error:', err);
        Alert.alert('Capture Error', err.message || 'Failed to capture photo. You can retry or choose from gallery.');
      }
    }
  };

  // Confirm Captured Photo ("Use This Photo")
  const handleConfirmCapturedPhoto = () => {
    if (capturedPreviewUri) {
      setImageUri(capturedPreviewUri);
      setIsCameraActive(false);
      setCapturedPreviewUri(null);
      setStatusMessage('Photo captured. Tap "Extract Text" to analyze register.');
    }
  };

  // Retake Photo
  const handleRetakePhoto = () => {
    setCapturedPreviewUri(null);
  };

  // Cancel Camera Viewfinder
  const handleCancelCamera = () => {
    setIsCameraActive(false);
    setCapturedPreviewUri(null);
    setCameraMountError(null);
  };

  // Handle Gallery Selection (Cross-Platform: Web DOM file picker + Native expo-image-picker)
  const handleOpenGallery = () => {
    requestImageChange(async () => {
      // Platform 1: Web Browser (Chrome, Safari, Edge, Firefox)
      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e: any) => {
            const file = e.target?.files?.[0];
            if (file) {
              setImageFile(file);
              const previewUrl = URL.createObjectURL(file);
              setImageUri(previewUrl);
              setIsCameraActive(false);
              setStatusMessage('Register photo selected from gallery. Tap "Extract Text" to analyze.');
            }
          };
          input.click();
        }
        return;
      }

      // Platform 2: Native Android & iOS (expo-image-picker)
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Gallery Permission', 'Permission to access photos is needed to choose a register image.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.9,
          allowsEditing: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setImageUri(asset.uri);
          setImageFile({
            uri: asset.uri,
            name: asset.fileName || 'register_gallery.jpg',
            type: asset.mimeType || 'image/jpeg',
          });
          setIsCameraActive(false);
          setStatusMessage('Register photo selected from gallery. Tap "Extract Text" to analyze.');
        }
      } catch (err: any) {
        console.warn('Native gallery picker error:', err);
        Alert.alert('Gallery Error', err.message || 'Unable to open photo gallery.');
      }
    });
  };

  // Sample Register loader for instant live test
  const handleLoadSampleRegister = () => {
    requestImageChange(async () => {
      setIsProcessing(true);
      setStatusMessage('Loading sample Tamil/English register table...');
      try {
        const sampleUrl = 'https://imgv2-1-f.scribdassets.com/img/document/868728214/original/df6a982afe/1?v=1';
        setImageUri(sampleUrl);
        setImageFile(sampleUrl);
        await triggerOcrProcessing(sampleUrl);
      } catch (err: any) {
        setIsProcessing(false);
        setStatusMessage(`Sample load error: ${err.message}`);
      }
    });
  };

  // Main OCR Extraction Execution (Triggered by "Extract Text" button)
  const triggerOcrProcessing = async (sourceFileToUse?: any) => {
    const file = sourceFileToUse || imageFile || imageUri;
    if (!file) {
      Alert.alert('No Image', 'Please capture or select a register image first.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Sending register image to Tamil/English OCR engine...');
    try {
      const response = await uploadImageToOcr(file);
      setStatusMessage('Parsing detected table columns and row boundaries...');
      const tables = parseOcrApiResponse(response);
      setDetectedTables(tables);

      if (tables.length === 0 || tables.every(t => t.rows.length === 0)) {
        setStatusMessage('No table rows detected in image. Please provide a clear register photo.');
        setIsProcessing(false);
        return;
      }

      const relevantFarmers = farmers.filter(f => !selectedSocietyId || f.assignedBoothId === selectedSocietyId);

      if (mode === 'farmers') {
        const parsed = mapTablesToFarmerRecords(tables, farmers, cows);
        setFarmerRecords(parsed);
        setStatusMessage(`Detected ${parsed.length} farmer record(s) across ${tables.length} table(s).`);
      } else {
        const parsed = mapTablesToMilkRecords(tables, relevantFarmers);
        setMilkRecords(parsed);
        setStatusMessage(`Detected ${parsed.length} milk collection entries.`);
      }
    } catch (err: any) {
      console.warn('OCR processing error:', err);
      setStatusMessage(`OCR Error: ${err.message || 'Service unavailable'}`);
      Alert.alert('OCR Extraction Notice', err.message || 'Unable to process image. Please check image quality or enter manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered Farmer Records
  const filteredFarmerRecords = useMemo(() => {
    return farmerRecords.filter(record => {
      if (activeFilter === 'valid' && record.status !== 'valid') return false;
      if (activeFilter === 'needs_review' && record.status !== 'needs_review') return false;
      if (activeFilter === 'duplicates' && !record.isDuplicate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = record.fullName.toLowerCase().includes(q);
        const matchesPhone = record.phone.includes(q);
        const matchesVillage = record.village.toLowerCase().includes(q);
        const matchesTag = record.cows.some(c => c.tagId.includes(q)) || record.cowTagId.includes(q);
        return matchesName || matchesPhone || matchesVillage || matchesTag;
      }
      return true;
    });
  }, [farmerRecords, activeFilter, searchQuery]);

  // Filtered Milk Records
  const filteredMilkRecords = useMemo(() => {
    return milkRecords.filter(record => {
      if (activeFilter === 'valid' && record.status !== 'valid') return false;
      if (activeFilter === 'needs_review' && record.status !== 'needs_review') return false;
      if (activeFilter === 'duplicates' && !record.isDuplicate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (record.matchedFarmerName || record.extractedName || '').toLowerCase().includes(q);
        const matchesPhone = (record.extractedPhone || '').includes(q);
        return matchesName || matchesPhone;
      }
      return true;
    });
  }, [milkRecords, activeFilter, searchQuery]);

  // Counts for summary bar
  const farmerCounts = useMemo(() => {
    const total = farmerRecords.length;
    const valid = farmerRecords.filter(r => r.status === 'valid').length;
    const needsReview = farmerRecords.filter(r => r.status === 'needs_review').length;
    const duplicates = farmerRecords.filter(r => r.isDuplicate).length;
    const selected = farmerRecords.filter(r => r.selected).length;
    return { total, valid, needsReview, duplicates, selected };
  }, [farmerRecords]);

  const milkCounts = useMemo(() => {
    const total = milkRecords.length;
    const valid = milkRecords.filter(r => r.status === 'valid').length;
    const needsReview = milkRecords.filter(r => r.status === 'needs_review').length;
    const duplicates = milkRecords.filter(r => r.isDuplicate).length;
    const selected = milkRecords.filter(r => r.selected).length;
    return { total, valid, needsReview, duplicates, selected };
  }, [milkRecords]);

  // Update a single Farmer Record in state (Farmer fields & recalculates count match)
  const handleUpdateFarmerRecord = (id: string, updates: Partial<ParsedFarmerRecord>) => {
    setFarmerRecords(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        // Recalculate cattle counts & matching
        const distinctDetectedCount = new Set(updated.cows.map(c => c.tagId).filter(Boolean)).size;
        updated.detectedCattleCount = distinctDetectedCount;
        updated.validCattleCount = updated.cows.filter(c => c.status === 'valid').length;

        if (updated.hasDeclaredCattleCount) {
          if (updated.declaredCattleCount === distinctDetectedCount) {
            updated.countMatchStatus = 'matched';
            updated.countMatchMessage = `Count Matched: ${updated.declaredCattleCount} of ${updated.declaredCattleCount} cattle IDs detected`;
          } else if (updated.declaredCattleCount > distinctDetectedCount) {
            const missing = updated.declaredCattleCount - distinctDetectedCount;
            updated.countMatchStatus = 'missing_ids';
            updated.countMatchMessage = `Review Required: ${missing} ID(s) may be missing (${distinctDetectedCount} detected of ${updated.declaredCattleCount} declared)`;
          } else {
            updated.countMatchStatus = 'extra_ids';
            updated.countMatchMessage = `Review Required: Detected IDs (${distinctDetectedCount}) exceed declared count (${updated.declaredCattleCount})`;
          }
        }

        // Re-validate fields dynamically
        const errors: Record<string, string> = {};
        if (!updated.fullName.trim()) errors.fullName = 'Farmer name is required.';
        if (!cleanPhoneNumber(updated.phone)) errors.phone = '10-digit mobile number required (starts with 6-9).';

        const countNeedsReview = updated.countMatchStatus === 'missing_ids' || updated.countMatchStatus === 'extra_ids';
        const hasCattleErrors = updated.cows.some(c => c.status === 'needs_review');

        const isValid = Object.keys(errors).length === 0 && !updated.isDuplicate && !countNeedsReview && !hasCattleErrors;
        updated.errors = errors;
        updated.status = updated.isDuplicate ? 'duplicate' : isValid ? 'valid' : 'needs_review';

        // Keep first cow getters synchronized
        if (updated.cows.length > 0) {
          updated.cowTagId = updated.cows[0].tagId;
          updated.cowBreed = updated.cows[0].breed;
          updated.cowMilkCapacity = updated.cows[0].milkCapacity;
          updated.cowName = updated.cows[0].name || `${updated.fullName}'s Cow`;
        }

        return updated;
      })
    );
  };

  // Update a single Cattle Candidate under a Farmer Record
  const handleUpdateCattleCandidate = (farmerId: string, cattleId: string, updates: Partial<ParsedCattleCandidate>) => {
    setFarmerRecords(prev =>
      prev.map(farmer => {
        if (farmer.id !== farmerId) return farmer;

        const updatedCows = farmer.cows.map(cow => {
          if (cow.id !== cattleId) return cow;
          const updatedCow = { ...cow, ...updates };

          const errors: Record<string, string> = {};
          if (updatedCow.tagId && !cleanCattleTagId(updatedCow.tagId)) {
            errors.tagId = 'Cattle tag must be exactly 12 digits.';
          }
          updatedCow.errors = errors;
          updatedCow.status = Object.keys(errors).length === 0 && !updatedCow.isDuplicate ? 'valid' : 'needs_review';
          return updatedCow;
        });

        // Re-run farmer update logic
        const distinctDetectedCount = new Set(updatedCows.map(c => c.tagId).filter(Boolean)).size;
        let countMatchStatus = farmer.countMatchStatus;
        let countMatchMessage = farmer.countMatchMessage;

        if (farmer.hasDeclaredCattleCount) {
          if (farmer.declaredCattleCount === distinctDetectedCount) {
            countMatchStatus = 'matched';
            countMatchMessage = `Count Matched: ${farmer.declaredCattleCount} of ${farmer.declaredCattleCount} cattle IDs detected`;
          } else if (farmer.declaredCattleCount > distinctDetectedCount) {
            const missing = farmer.declaredCattleCount - distinctDetectedCount;
            countMatchStatus = 'missing_ids';
            countMatchMessage = `Review Required: ${missing} ID(s) may be missing (${distinctDetectedCount} detected of ${farmer.declaredCattleCount} declared)`;
          } else {
            countMatchStatus = 'extra_ids';
            countMatchMessage = `Review Required: Detected IDs (${distinctDetectedCount}) exceed declared count (${farmer.declaredCattleCount})`;
          }
        }

        const countNeedsReview = countMatchStatus === 'missing_ids' || countMatchStatus === 'extra_ids';
        const hasCattleErrors = updatedCows.some(c => c.status === 'needs_review');
        const isValid = Object.keys(farmer.errors).length === 0 && !farmer.isDuplicate && !countNeedsReview && !hasCattleErrors;

        return {
          ...farmer,
          cows: updatedCows,
          detectedCattleCount: distinctDetectedCount,
          validCattleCount: updatedCows.filter(c => c.status === 'valid').length,
          countMatchStatus,
          countMatchMessage,
          status: farmer.isDuplicate ? 'duplicate' : isValid ? 'valid' : 'needs_review',
          cowTagId: updatedCows[0]?.tagId || '',
          cowBreed: updatedCows[0]?.breed || 'Jersey Cross',
          cowMilkCapacity: updatedCows[0]?.milkCapacity || '10.00',
        };
      })
    );
  };

  // Add a new Cattle Candidate manually to a Farmer
  const handleAddCattleCandidate = (farmerId: string) => {
    setFarmerRecords(prev =>
      prev.map(farmer => {
        if (farmer.id !== farmerId) return farmer;

        const newCow: ParsedCattleCandidate = {
          id: `cattle-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tagId: '',
          breed: 'Jersey Cross',
          milkCapacity: '10.00',
          name: `${farmer.fullName.split(' ')[0] || 'Farmer'}'s Cow #${farmer.cows.length + 1}`,
          sourceRowIndex: farmer.sourceRowIndex,
          sourceCellText: 'Manual entry',
          status: 'needs_review',
          errors: { tagId: 'Enter 12-digit Pashu Aadhaar.' },
          warnings: [],
          isDuplicate: false,
        };

        const updatedCows = [...farmer.cows, newCow];
        return {
          ...farmer,
          cows: updatedCows,
          detectedCattleCount: new Set(updatedCows.map(c => c.tagId).filter(Boolean)).size,
          isExpanded: true,
          status: 'needs_review',
        };
      })
    );
  };

  // Remove Candidate Cattle from pending import (does not touch DB)
  const handleRemoveCattleCandidate = (farmerId: string, cattleId: string) => {
    setFarmerRecords(prev =>
      prev.map(farmer => {
        if (farmer.id !== farmerId) return farmer;

        const updatedCows = farmer.cows.filter(c => c.id !== cattleId);
        const distinctDetectedCount = new Set(updatedCows.map(c => c.tagId).filter(Boolean)).size;

        let countMatchStatus = farmer.countMatchStatus;
        let countMatchMessage = farmer.countMatchMessage;

        if (farmer.hasDeclaredCattleCount) {
          if (farmer.declaredCattleCount === distinctDetectedCount) {
            countMatchStatus = 'matched';
            countMatchMessage = `Count Matched: ${farmer.declaredCattleCount} of ${farmer.declaredCattleCount} cattle IDs detected`;
          } else if (farmer.declaredCattleCount > distinctDetectedCount) {
            const missing = farmer.declaredCattleCount - distinctDetectedCount;
            countMatchStatus = 'missing_ids';
            countMatchMessage = `Review Required: ${missing} ID(s) may be missing (${distinctDetectedCount} detected of ${farmer.declaredCattleCount} declared)`;
          } else {
            countMatchStatus = 'extra_ids';
            countMatchMessage = `Review Required: Detected IDs (${distinctDetectedCount}) exceed declared count (${farmer.declaredCattleCount})`;
          }
        }

        const countNeedsReview = countMatchStatus === 'missing_ids' || countMatchStatus === 'extra_ids';
        const hasCattleErrors = updatedCows.some(c => c.status === 'needs_review');
        const isValid = Object.keys(farmer.errors).length === 0 && !farmer.isDuplicate && !countNeedsReview && !hasCattleErrors;

        return {
          ...farmer,
          cows: updatedCows,
          detectedCattleCount: distinctDetectedCount,
          validCattleCount: updatedCows.filter(c => c.status === 'valid').length,
          countMatchStatus,
          countMatchMessage,
          status: farmer.isDuplicate ? 'duplicate' : isValid ? 'valid' : 'needs_review',
          cowTagId: updatedCows[0]?.tagId || '',
          cowBreed: updatedCows[0]?.breed || 'Jersey Cross',
          cowMilkCapacity: updatedCows[0]?.milkCapacity || '10.00',
        };
      })
    );
  };

  // Update a single Milk Record in state
  const handleUpdateMilkRecord = (id: string, updates: Partial<ParsedMilkRecord>) => {
    setMilkRecords(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        const errors: Record<string, string> = {};
        if (!updated.matchedFarmerId) errors.matchedFarmerId = 'Farmer match required.';
        const q = parseFloat(updated.quantityLitres);
        if (isNaN(q) || q <= 0) errors.quantityLitres = 'Valid positive milk quantity required.';

        const isValid = Object.keys(errors).length === 0;
        updated.errors = errors;
        updated.status = isValid ? 'valid' : 'needs_review';
        return updated;
      })
    );
  };

  // Toggle selection
  const handleToggleSelectFarmer = (id: string) => {
    setFarmerRecords(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleSelectMilk = (id: string) => {
    setMilkRecords(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Select all valid
  const handleSelectAllValid = () => {
    if (mode === 'farmers') {
      setFarmerRecords(prev =>
        prev.map(item => ({ ...item, selected: item.status === 'valid' }))
      );
    } else {
      setMilkRecords(prev =>
        prev.map(item => ({ ...item, selected: item.status === 'valid' }))
      );
    }
  };

  const handleDeselectAll = () => {
    if (mode === 'farmers') {
      setFarmerRecords(prev => prev.map(item => ({ ...item, selected: false })));
    } else {
      setMilkRecords(prev => prev.map(item => ({ ...item, selected: false })));
    }
  };

  // Toggle card expansion
  const handleToggleExpandFarmer = (id: string) => {
    setFarmerRecords(prev =>
      prev.map(item => (item.id === id ? { ...item, isExpanded: !item.isExpanded } : item))
    );
  };

  const handleToggleExpandMilk = (id: string) => {
    setMilkRecords(prev =>
      prev.map(item => (item.id === id ? { ...item, isExpanded: !item.isExpanded } : item))
    );
  };

  // Save Selected Records (Supports Multi-Cow per Farmer)
  const handleSaveSelectedRecords = async () => {
    const societyIdToUse = selectedSocietyId || user?.associatedId;
    if (!societyIdToUse) {
      Alert.alert('Scope Error', 'Please select an authorized Society.');
      return;
    }

    if (mode === 'farmers') {
      const selectedFarmers = farmerRecords.filter(r => r.selected);
      if (selectedFarmers.length === 0) {
        Alert.alert('No Selection', 'Please select at least one farmer record to save.');
        return;
      }

      const invalidSelected = selectedFarmers.filter(r => r.status !== 'valid');
      if (invalidSelected.length > 0) {
        Alert.alert('Review Required', 'Some selected records have validation errors or mismatched cattle counts. Please review and fix them first.');
        return;
      }

      setIsSaving(true);
      setSaveProgress({ current: 0, total: selectedFarmers.length });

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedFarmers.length; i++) {
        const item = selectedFarmers[i];
        setSaveProgress({ current: i + 1, total: selectedFarmers.length });
        handleUpdateFarmerRecord(item.id, { saveStatus: 'saving' });

        try {
          // Gather all valid cattle candidates under this farmer
          const cowsPayload = item.cows
            .filter(c => c.tagId && c.status !== 'duplicate')
            .map(c => ({
              pashuAadhaar: c.tagId,
              breed: c.breed,
              milkCapacity: parseFloat(c.milkCapacity) || 10.0,
              name: c.name || `${item.fullName}'s Cow (${c.breed})`,
            }));

          const createdUser = await AccountsApi.registerFarmer({
            phone: item.phone,
            fullName: item.fullName,
            parentId: societyIdToUse,
            personalDetails: {
              farmerIdCode: item.farmerIdCode,
              address: item.address || item.village,
              village: item.village,
              numberOfCows: cowsPayload.length || item.declaredCattleCount || 1,
            },
            cows: cowsPayload.length > 0 ? cowsPayload : undefined,
          });

          successCount++;
          handleUpdateFarmerRecord(item.id, { saveStatus: 'success', selected: false });
        } catch (err: any) {
          failCount++;
          const errDetail = err.response?.data?.message || err.message || 'Failed to save';
          handleUpdateFarmerRecord(item.id, { saveStatus: 'error', saveError: errDetail });
        }
      }

      setIsSaving(false);
      Alert.alert(
        'Farmer Registration Completed',
        `Successfully registered ${successCount} farmer(s) with associated cattle. ${failCount > 0 ? `${failCount} record(s) failed.` : ''}`,
        [{ text: 'OK', onPress: () => { if (successCount > 0 && onSuccess) onSuccess(successCount); } }]
      );
    } else {
      // Milk Collection Save (Farmer-wise, strictly never multiplied by cow count)
      const selectedMilk = milkRecords.filter(r => r.selected);
      if (selectedMilk.length === 0) {
        Alert.alert('No Selection', 'Please select at least one milk record to save.');
        return;
      }

      const invalidSelected = selectedMilk.filter(r => r.status !== 'valid');
      if (invalidSelected.length > 0) {
        Alert.alert('Review Required', 'Some records have missing farmer matches or quantities. Please review first.');
        return;
      }

      setIsSaving(true);
      setSaveProgress({ current: 0, total: selectedMilk.length });

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedMilk.length; i++) {
        const item = selectedMilk[i];
        setSaveProgress({ current: i + 1, total: selectedMilk.length });
        handleUpdateMilkRecord(item.id, { saveStatus: 'saving' });

        try {
          await MilkCollectionsApi.create({
            farmerId: item.matchedFarmerId!,
            quantityLitres: item.quantityLitres,
            collectionDate: item.collectionDate,
            session: item.session,
            notes: item.notes,
          });

          successCount++;
          handleUpdateMilkRecord(item.id, { saveStatus: 'success', selected: false });
        } catch (err: any) {
          failCount++;
          const errDetail = err.response?.data?.message || err.message || 'Failed to record milk';
          handleUpdateMilkRecord(item.id, { saveStatus: 'error', saveError: errDetail });
        }
      }

      setIsSaving(false);
      Alert.alert(
        'Milk Entries Recorded',
        `Successfully saved ${successCount} milk collection record(s). ${failCount > 0 ? `${failCount} record(s) failed.` : ''}`,
        [{ text: 'OK', onPress: () => { if (successCount > 0 && onSuccess) onSuccess(successCount); } }]
      );
    }
  };

  // Render Image Preview / Actions Component
  const renderImagePreviewSection = () => (
    <Card style={styles.imagePreviewCard}>
      <View style={styles.imagePreviewHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="image-outline" size={18} color={colors.primary} />
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginLeft: 6 }]}>
            Register Image
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!isWide && imageUri && (
            <Pressable
              onPress={() => setIsImagePreviewCollapsed(!isImagePreviewCollapsed)}
              style={styles.pillActionBtn}
            >
              <Ionicons
                name={isImagePreviewCollapsed ? 'chevron-down-outline' : 'chevron-up-outline'}
                size={14}
                color={colors.textSecondary}
              />
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 2 }}>
                {isImagePreviewCollapsed ? 'Show' : 'Hide'}
              </Text>
            </Pressable>
          )}

          {imageUri && (
            <Pressable
              onPress={() => requestImageChange(() => { setImageUri(null); setImageFile(null); })}
              style={[styles.pillActionBtn, { borderColor: colors.destructive }]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.destructive} />
              <Text style={{ fontSize: 11, color: colors.destructive, marginLeft: 2 }}>Remove</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Preview Display or Empty Placeholder */}
      {imageUri && !isImagePreviewCollapsed ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          <View style={styles.imageActionBar}>
            <Pressable onPress={handleOpenCamera} style={[styles.subActionBtn, { backgroundColor: colors.card }]}>
              <Ionicons name="camera-reverse-outline" size={14} color={colors.primary} />
              <Text style={[styles.subActionBtnText, { color: colors.primary }]}>Retake</Text>
            </Pressable>
            <Pressable onPress={handleOpenGallery} style={[styles.subActionBtn, { backgroundColor: colors.card }]}>
              <Ionicons name="images-outline" size={14} color={colors.primary} />
              <Text style={[styles.subActionBtnText, { color: colors.primary }]}>Change</Text>
            </Pressable>
          </View>
        </View>
      ) : !imageUri ? (
        <View style={styles.emptyUploadBox}>
          <Ionicons name="document-text-outline" size={36} color={colors.textSecondary} />
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginTop: 8 }]}>
            Capture or Upload Register
          </Text>
          <Text style={[Typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 320 }]}>
            Handwritten Tamil & English ledgers. Supports multi-cow farmer registers and milk entries.
          </Text>

          <View style={styles.uploadOptionsRow}>
            <Pressable
              onPress={handleOpenCamera}
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="camera-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Open Camera</Text>
            </Pressable>

            <Pressable
              onPress={handleOpenGallery}
              style={[styles.secondaryActionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Ionicons name="images-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Gallery</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleLoadSampleRegister} style={styles.sampleRegisterLink}>
            <Ionicons name="sparkles" size={13} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>
              Load Sample Tamil/English Register Demo
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Extract Text Action Button */}
      {imageUri && (
        <View style={{ marginTop: 12 }}>
          <Pressable
            onPress={() => triggerOcrProcessing()}
            disabled={isProcessing}
            style={[
              styles.extractBtn,
              { backgroundColor: isProcessing ? colors.border : colors.primary },
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="scan-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            )}
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
              {isProcessing ? 'Analyzing Image...' : farmerRecords.length > 0 || milkRecords.length > 0 ? 'Retry OCR Extraction' : 'Extract Text from Register'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Status Notice */}
      {statusMessage ? (
        <View style={[styles.statusNotice, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <Ionicons
            name={isProcessing ? 'hourglass-outline' : statusMessage.includes('Error') ? 'alert-circle-outline' : 'information-circle-outline'}
            size={14}
            color={statusMessage.includes('Error') ? colors.destructive : colors.primary}
          />
          <Text style={[styles.statusNoticeText, { color: statusMessage.includes('Error') ? colors.destructive : colors.text }]}>
            {statusMessage}
          </Text>
        </View>
      ) : null}
    </Card>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Modal Top Header */}
        <View style={[styles.topHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.modeIconBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons
                name={mode === 'farmers' ? 'people-outline' : 'water-outline'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={[Typography.headline, { color: colors.text, fontSize: 17 }]}>
                {mode === 'farmers' ? 'Register Import (Multi-Cow OCR)' : 'Milk Collection Register Import'}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                {activeRole === 'booth' ? 'Primary Cooperative Society Operator' : 'District Milk Union Authority'}
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Live Camera Viewfinder Screen */}
        {isCameraActive && (
          <View style={styles.liveCameraFullscreen}>
            {!capturedPreviewUri ? (
              // Live camera feed or in-frame permission/error UI
              <View style={styles.cameraFlexWrapper}>
                {!permission?.granted ? (
                  // Clean In-Viewfinder Camera Permission Box
                  <View style={styles.permissionBox}>
                    <Ionicons name="camera-outline" size={60} color="#38BDF8" />
                    <Text style={[Typography.title2, { color: '#FFFFFF', textAlign: 'center', marginTop: 14, fontWeight: '700' }]}>
                      Camera Permission Required
                    </Text>
                    <Text style={[Typography.body, { color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 8, maxWidth: 340 }]}>
                      Please enable camera access to scan and photograph handwritten register ledgers.
                    </Text>

                    <Button
                      title="Grant Camera Access"
                      onPress={async () => {
                        const res = await requestPermission();
                        if (!res.granted && Platform.OS === 'web') {
                          Alert.alert('Permission Tip', 'Please click the camera lock icon in your browser address bar to allow camera access.');
                        }
                      }}
                      style={{ marginTop: 22, width: 220 }}
                    />

                    <Button
                      title="Choose from Gallery instead"
                      variant="outline"
                      onPress={handleOpenGallery}
                      style={{ marginTop: 12, width: 220, borderColor: 'rgba(255,255,255,0.4)' }}
                      textStyle={{ color: '#FFFFFF' }}
                    />

                    <Pressable onPress={handleCancelCamera} style={{ marginTop: 18, padding: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecorationLine: 'underline' }}>
                        Cancel & Go Back
                      </Text>
                    </Pressable>
                  </View>
                ) : cameraMountError ? (
                  // Camera Error / Unavailable on Device Fallback
                  <View style={styles.permissionBox}>
                    <Ionicons name="alert-circle-outline" size={56} color={colors.warning} />
                    <Text style={[Typography.title3, { color: '#FFFFFF', textAlign: 'center', marginTop: 12, fontWeight: '700' }]}>
                      Camera Unavailable
                    </Text>
                    <Text style={[Typography.callout, { color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 8, maxWidth: 320 }]}>
                      {cameraMountError || 'Unable to start camera on this device. You can choose a photo from your gallery.'}
                    </Text>
                    <Button
                      title="Choose from Gallery / Files"
                      onPress={handleOpenGallery}
                      style={{ marginTop: 20, width: 220 }}
                    />
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={handleCancelCamera}
                      style={{ marginTop: 10, width: 220 }}
                      textStyle={{ color: '#FFFFFF' }}
                    />
                  </View>
                ) : (
                  // Active Live Viewfinder
                  <View style={StyleSheet.absoluteFill}>
                    <CameraView
                      ref={cameraRef}
                      style={styles.cameraViewComponent}
                      facing={cameraFacing}
                      enableTorch={cameraTorch}
                      onMountError={err => {
                        console.warn('CameraView mount error:', err);
                        setCameraMountError(err.message || 'Camera device failed to start.');
                      }}
                    />

                    {/* Viewfinder Alignment Guide Frame */}
                    <View style={styles.cameraFrameGuide}>
                      <View style={styles.guideCornerTL} />
                      <View style={styles.guideCornerTR} />
                      <View style={styles.guideCornerBL} />
                      <View style={styles.guideCornerBR} />
                      <Text style={styles.guideText}>Position register table inside frame</Text>
                    </View>

                    {/* Controls Overlay Top */}
                    <View style={styles.cameraOverlayTop}>
                      <Pressable onPress={handleCancelCamera} style={styles.cameraCircleBtn} hitSlop={8}>
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                      </Pressable>

                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        {Platform.OS !== 'web' && (
                          <Pressable
                            onPress={() => setCameraTorch(!cameraTorch)}
                            style={[styles.cameraCircleBtn, cameraTorch && { backgroundColor: colors.warning }]}
                            hitSlop={8}
                          >
                            <Ionicons name={cameraTorch ? 'flash' : 'flash-off'} size={20} color="#FFFFFF" />
                          </Pressable>
                        )}

                        <Pressable
                          onPress={() => setCameraFacing(cameraFacing === 'back' ? 'front' : 'back')}
                          style={styles.cameraCircleBtn}
                          hitSlop={8}
                        >
                          <Ionicons name="camera-reverse" size={22} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    </View>

                    {/* Shutter Button Overlay Bottom */}
                    <View style={styles.cameraOverlayBottom}>
                      <Pressable onPress={handleOpenGallery} style={styles.cameraSideBtn} hitSlop={8}>
                        <Ionicons name="images-outline" size={22} color="#FFFFFF" />
                        <Text style={styles.cameraSideBtnText}>Gallery</Text>
                      </Pressable>

                      <Pressable onPress={handleCapturePhoto} style={styles.shutterOuterRing} hitSlop={12}>
                        <View style={styles.shutterInnerCircle} />
                      </Pressable>

                      <View style={{ width: 60 }} />
                    </View>
                  </View>
                )}
              </View>
            ) : (
              // Captured Photo Preview Screen
              <View style={StyleSheet.absoluteFillObject}>
                <Image source={{ uri: capturedPreviewUri }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
                <View style={styles.capturedConfirmOverlay}>
                  <Text style={styles.capturedPhotoTitle}>Inspect Register Photograph</Text>
                  <Text style={styles.capturedPhotoSubtitle}>Ensure text, column borders, and numbers are clear and legible.</Text>
                  <View style={styles.capturedActionButtonsRow}>
                    <Pressable onPress={handleRetakePhoto} style={styles.retakePhotoBtn}>
                      <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retake Photo</Text>
                    </Pressable>
                    <Pressable onPress={handleConfirmCapturedPhoto} style={[styles.usePhotoBtn, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Use This Photo</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Unauthorized Role Gate */}
        {!isAuthorized ? (
          <View style={styles.accessDeniedBox}>
            <Ionicons name="lock-closed-outline" size={54} color={colors.destructive} />
            <Text style={[Typography.title2, { color: colors.text, marginTop: 12, fontWeight: '700' }]}>
              Access Restricted
            </Text>
            <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
              The OCR Register Import feature is available exclusively to authorized Primary Dairy Cooperative Society and District Milk Union accounts.
            </Text>
            <Pressable onPress={onClose} style={[styles.sampleBtn, { marginTop: 24, backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Close</Text>
            </Pressable>
          </View>
        ) : !isCameraActive ? (
          // Main Body
          <View style={[styles.mainBodyContainer, isWide && styles.mainBodyWide]}>
            {/* Left Side (Desktop: preview pane; Mobile: top collapsible) */}
            <View style={isWide ? styles.previewSidePane : styles.previewMobilePane}>
              {renderImagePreviewSection()}
            </View>

            {/* Right Side / Main Scrollable Content */}
            <View style={styles.contentSidePane}>
              <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Society Scope Selector (for Union users) */}
                {activeRole === 'union' && (
                  <Card style={styles.scopeCard}>
                    <View style={styles.scopeRow}>
                      <Ionicons name="business" size={18} color={colors.primary} />
                      <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginLeft: 6 }]}>
                        Target Cooperative Society:
                      </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {authorizedSocieties.map(soc => {
                        const isSelected = soc.id === selectedSocietyId;
                        return (
                          <Pressable
                            key={soc.id}
                            onPress={() => setSelectedSocietyId(soc.id)}
                            style={[
                              styles.societyChip,
                              {
                                backgroundColor: isSelected ? colors.primary : colors.card,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                            ]}
                          >
                            <Text style={{ color: isSelected ? '#FFFFFF' : colors.text, fontWeight: '600', fontSize: 13 }}>
                              {soc.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </Card>
                )}

                {/* Summary Counts Bar */}
                {(farmerRecords.length > 0 || milkRecords.length > 0) && (
                  <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryVal, { color: colors.text }]}>
                        {mode === 'farmers' ? farmerCounts.total : milkCounts.total}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Extracted</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryVal, { color: colors.primary }]}>
                        {mode === 'farmers' ? farmerCounts.valid : milkCounts.valid}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ready to Save</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryVal, { color: colors.warning }]}>
                        {mode === 'farmers' ? farmerCounts.needsReview : milkCounts.needsReview}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Needs Review</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryVal, { color: colors.destructive }]}>
                        {mode === 'farmers' ? farmerCounts.duplicates : milkCounts.duplicates}
                      </Text>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Duplicates</Text>
                    </View>
                  </View>
                )}

                {/* Filter Chips & Selection Bar */}
                {(farmerRecords.length > 0 || milkRecords.length > 0) && (
                  <View style={styles.controlsBar}>
                    <View style={styles.filterChipRow}>
                      {(['all', 'valid', 'needs_review', 'duplicates'] as const).map(tabKey => {
                        const isTabActive = activeFilter === tabKey;
                        const label =
                          tabKey === 'all'
                            ? 'All'
                            : tabKey === 'valid'
                            ? 'Valid'
                            : tabKey === 'needs_review'
                            ? 'Review Required'
                            : 'Duplicates';

                        return (
                          <Pressable
                            key={tabKey}
                            onPress={() => setActiveFilter(tabKey)}
                            style={[
                              styles.filterChip,
                              {
                                backgroundColor: isTabActive ? colors.primary : colors.card,
                                borderColor: isTabActive ? colors.primary : colors.border,
                              },
                            ]}
                          >
                            <Text style={{ color: isTabActive ? '#FFFFFF' : colors.text, fontSize: 12, fontWeight: '600' }}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Batch Selection Quick Actions */}
                    <View style={styles.batchActionsRow}>
                      <Pressable onPress={handleSelectAllValid} style={styles.smallActionLink}>
                        <Ionicons name="checkmark-done" size={14} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                          Select All Valid
                        </Text>
                      </Pressable>
                      <Pressable onPress={handleDeselectAll} style={[styles.smallActionLink, { marginLeft: 12 }]}>
                        <Ionicons name="close-circle-outline" size={14} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>Deselect All</Text>
                      </Pressable>
                    </View>

                    {/* Search Field */}
                    <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                      <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                      <TextInput
                        placeholder="Search by name, phone, village, or cattle tag ID..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={[styles.searchInput, { color: colors.text }]}
                      />
                      {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}

                {/* Farmer Records List (Multi-Cow Expandable Cards) */}
                {mode === 'farmers' && (
                  <View style={{ marginTop: 8 }}>
                    {filteredFarmerRecords.map(item => {
                      const isCountMatched = item.countMatchStatus === 'matched';
                      const isCountMissing = item.countMatchStatus === 'missing_ids';
                      const isCountExtra = item.countMatchStatus === 'extra_ids';

                      return (
                        <Card
                          key={item.id}
                          style={[
                            styles.farmerCard,
                            item.selected && { borderColor: colors.primary, borderWidth: 1.5 },
                            item.isDuplicate && { opacity: 0.85 },
                          ]}
                        >
                          {/* Card Collapsed Header */}
                          <View style={styles.cardHeaderRow}>
                            <Pressable onPress={() => handleToggleSelectFarmer(item.id)} hitSlop={8} style={styles.checkbox}>
                              <Ionicons
                                name={item.selected ? 'checkbox' : 'square-outline'}
                                size={22}
                                color={item.selected ? colors.primary : colors.textMuted}
                              />
                            </Pressable>

                            <Pressable onPress={() => handleToggleExpandFarmer(item.id)} style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                <Text
                                  style={[
                                    Typography.subhead,
                                    { color: item.fullName ? colors.text : '#B45309', fontWeight: '700' },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {item.fullName || 'Name needs review'}
                                </Text>

                                {/* Validation Status Badge */}
                                <View
                                  style={[
                                    styles.badge,
                                    {
                                      backgroundColor:
                                        item.status === 'valid'
                                          ? '#DCFCE7'
                                          : item.status === 'duplicate'
                                          ? '#FEE2E2'
                                          : '#FEF3C7',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.badgeText,
                                      {
                                        color:
                                          item.status === 'valid'
                                            ? '#15803D'
                                            : item.status === 'duplicate'
                                            ? '#B91C1C'
                                            : '#B45309',
                                      },
                                    ]}
                                  >
                                    {item.status === 'valid' ? 'Valid' : item.status === 'duplicate' ? 'Duplicate' : 'Review'}
                                  </Text>
                                </View>

                                {/* Count Match Badge */}
                                {item.hasDeclaredCattleCount ? (
                                  <View
                                    style={[
                                      styles.badge,
                                      {
                                        backgroundColor: isCountMatched ? '#DCFCE7' : isCountMissing ? '#FEF3C7' : '#FFEDD5',
                                      },
                                    ]}
                                  >
                                    <Ionicons
                                      name={isCountMatched ? 'checkmark-circle' : 'alert-circle'}
                                      size={12}
                                      color={isCountMatched ? '#15803D' : '#B45309'}
                                      style={{ marginRight: 2 }}
                                    />
                                    <Text
                                      style={[
                                        styles.badgeText,
                                        { color: isCountMatched ? '#15803D' : '#B45309' },
                                      ]}
                                    >
                                      {item.detectedCattleCount}/{item.declaredCattleCount} Cattle
                                    </Text>
                                  </View>
                                ) : (
                                  <View
                                    style={[
                                      styles.badge,
                                      { backgroundColor: '#F1F5F9' },
                                    ]}
                                  >
                                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                                      {item.detectedCattleCount} Cattle Detected
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Subtitle with Phone and Village */}
                              <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                                {item.phone || 'Phone missing'} • {item.village || item.address || 'Village unassigned'} • Row #{item.sourceRowIndex}
                              </Text>

                              {/* Warning summary if any */}
                              {item.warnings.length > 0 && !item.isExpanded && (
                                <Text style={[Typography.caption2, { color: colors.warning, marginTop: 2 }]} numberOfLines={1}>
                                  ⚠️ {item.warnings[0]}
                                </Text>
                              )}
                            </Pressable>

                            {/* Expand / Collapse Icon */}
                            <Pressable onPress={() => handleToggleExpandFarmer(item.id)} hitSlop={8} style={{ padding: 4 }}>
                              <Ionicons
                                name={item.isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color={colors.textSecondary}
                              />
                            </Pressable>
                          </View>

                          {/* Expanded Form & Cattle Candidates Section */}
                          {item.isExpanded && (
                            <View style={styles.cardExpandedBody}>
                              <View style={styles.divider} />

                              {/* Farmer Registration Fields */}
                              <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '700', marginBottom: 8 }]}>
                                Farmer Personal Details
                              </Text>

                              <View style={styles.formGrid}>
                                <View style={styles.formCol}>
                                  <Text style={styles.fieldLabel}>Full Name *</Text>
                                  <TextInput
                                    style={[styles.input, item.errors.fullName && styles.inputError, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                                    value={item.fullName}
                                    onChangeText={val => handleUpdateFarmerRecord(item.id, { fullName: val })}
                                    placeholder="Farmer Full Name"
                                    placeholderTextColor={colors.textMuted}
                                  />
                                  {item.errors.fullName && <Text style={styles.errorText}>{item.errors.fullName}</Text>}
                                </View>

                                <View style={styles.formCol}>
                                  <Text style={styles.fieldLabel}>Mobile Number * (10 Digits)</Text>
                                  <TextInput
                                    style={[styles.input, item.errors.phone && styles.inputError, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                                    value={item.phone}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    onChangeText={val => handleUpdateFarmerRecord(item.id, { phone: val })}
                                    placeholder="9842000000"
                                    placeholderTextColor={colors.textMuted}
                                  />
                                  {item.errors.phone && <Text style={styles.errorText}>{item.errors.phone}</Text>}
                                </View>
                              </View>

                              <View style={styles.formGrid}>
                                <View style={styles.formCol}>
                                  <Text style={styles.fieldLabel}>Village / Town</Text>
                                  <TextInput
                                    style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                                    value={item.village}
                                    onChangeText={val => handleUpdateFarmerRecord(item.id, { village: val })}
                                    placeholder="Village"
                                    placeholderTextColor={colors.textMuted}
                                  />
                                </View>

                                <View style={styles.formCol}>
                                  <Text style={styles.fieldLabel}>Declared Cattle Count</Text>
                                  <TextInput
                                    style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                                    value={String(item.declaredCattleCount)}
                                    keyboardType="number-pad"
                                    onChangeText={val => {
                                      const n = parseInt(val.replace(/\D/g, ''), 10);
                                      handleUpdateFarmerRecord(item.id, { declaredCattleCount: isNaN(n) ? 0 : n, hasDeclaredCattleCount: true });
                                    }}
                                    placeholder="Count"
                                    placeholderTextColor={colors.textMuted}
                                  />
                                </View>
                              </View>

                              {/* Count Match Banner */}
                              <View style={[styles.countMatchBanner, { backgroundColor: isCountMatched ? '#F0FDF4' : '#FFFBEB', borderColor: isCountMatched ? '#BBF7D0' : '#FDE68A' }]}>
                                <Ionicons
                                  name={isCountMatched ? 'checkmark-circle' : 'alert-circle'}
                                  size={16}
                                  color={isCountMatched ? '#15803D' : '#B45309'}
                                  style={{ marginRight: 6 }}
                                />
                                <Text style={{ fontSize: 12, color: isCountMatched ? '#15803D' : '#B45309', fontWeight: '600', flex: 1 }}>
                                  {item.countMatchMessage}
                                </Text>
                              </View>

                              {/* Associated Cattle Section */}
                              <View style={{ marginTop: 14 }}>
                                <View style={styles.cattleSectionHeader}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="cube-outline" size={16} color={colors.primary} />
                                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginLeft: 6 }]}>
                                      Associated Cattle ({item.cows.length} Detected)
                                    </Text>
                                  </View>

                                  <Pressable
                                    onPress={() => handleAddCattleCandidate(item.id)}
                                    style={[styles.addCattleBtn, { borderColor: colors.primary }]}
                                  >
                                    <Ionicons name="add" size={14} color={colors.primary} />
                                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600', marginLeft: 2 }}>
                                      Add Cattle ID
                                    </Text>
                                  </Pressable>
                                </View>

                                {item.cows.map((cow, cowIdx) => (
                                  <View key={cow.id} style={[styles.cattleCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                                    <View style={styles.cattleCardHeader}>
                                      <Text style={[styles.cattleIndexLabel, { color: colors.textSecondary }]}>
                                        Cow #{cowIdx + 1}
                                      </Text>

                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        {cow.isDuplicate && (
                                          <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                                            <Text style={[styles.badgeText, { color: '#B91C1C' }]}>Duplicate</Text>
                                          </View>
                                        )}
                                        <Pressable
                                          onPress={() => handleRemoveCattleCandidate(item.id, cow.id)}
                                          hitSlop={6}
                                          style={styles.removeCandidateBtn}
                                        >
                                          <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                                          <Text style={{ fontSize: 11, color: colors.destructive, marginLeft: 2 }}>Remove</Text>
                                        </Pressable>
                                      </View>
                                    </View>

                                    <View style={styles.formGrid}>
                                      <View style={styles.formCol}>
                                        <Text style={styles.fieldLabel}>Pashu Aadhaar (12 Digits) *</Text>
                                        <TextInput
                                          style={[styles.input, cow.errors.tagId && styles.inputError, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                                          value={cow.tagId}
                                          keyboardType="number-pad"
                                          maxLength={12}
                                          onChangeText={val => handleUpdateCattleCandidate(item.id, cow.id, { tagId: val })}
                                          placeholder="001234567890"
                                          placeholderTextColor={colors.textMuted}
                                        />
                                        {cow.errors.tagId && <Text style={styles.errorText}>{cow.errors.tagId}</Text>}
                                      </View>

                                      <View style={styles.formCol}>
                                        <Text style={styles.fieldLabel}>Breed</Text>
                                        <TextInput
                                          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                                          value={cow.breed}
                                          onChangeText={val => handleUpdateCattleCandidate(item.id, cow.id, { breed: val })}
                                          placeholder="Jersey Cross / HF"
                                          placeholderTextColor={colors.textMuted}
                                        />
                                      </View>
                                    </View>

                                    {cow.warnings.length > 0 && (
                                      <Text style={[styles.warningText, { marginTop: 4 }]}>
                                        ⚠️ {cow.warnings.join(' • ')}
                                      </Text>
                                    )}
                                  </View>
                                ))}
                              </View>

                              {/* Save Error if any */}
                              {item.saveStatus === 'error' && (
                                <View style={styles.saveErrorBanner}>
                                  <Ionicons name="close-circle" size={16} color={colors.destructive} />
                                  <Text style={styles.saveErrorText}>{item.saveError || 'Save failed'}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </Card>
                      );
                    })}
                  </View>
                )}

                {/* Milk Records List (Farmer-wise Milk Collections) */}
                {mode === 'milk' && (
                  <View style={{ marginTop: 8 }}>
                    {filteredMilkRecords.map(item => (
                      <Card
                        key={item.id}
                        style={[
                          styles.farmerCard,
                          item.selected && { borderColor: colors.primary, borderWidth: 1.5 },
                        ]}
                      >
                        <View style={styles.cardHeaderRow}>
                          <Pressable onPress={() => handleToggleSelectMilk(item.id)} hitSlop={8} style={styles.checkbox}>
                            <Ionicons
                              name={item.selected ? 'checkbox' : 'square-outline'}
                              size={22}
                              color={item.selected ? colors.primary : colors.textMuted}
                            />
                          </Pressable>

                          <Pressable onPress={() => handleToggleExpandMilk(item.id)} style={{ flex: 1, minWidth: 0 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                                {item.matchedFarmerName || item.extractedName || item.farmerSearchQuery}
                              </Text>

                              <View
                                style={[
                                  styles.badge,
                                  {
                                    backgroundColor: item.status === 'valid' ? '#DCFCE7' : '#FEF3C7',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.badgeText,
                                    { color: item.status === 'valid' ? '#15803D' : '#B45309' },
                                  ]}
                                >
                                  {item.status === 'valid' ? 'Valid' : 'Match Required'}
                                </Text>
                              </View>
                            </View>

                            <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 2 }]}>
                              Quantity: {item.quantityLitres} L • Shift: {item.session} • Row #{item.sourceRowIndex}
                            </Text>
                          </Pressable>

                          <Pressable onPress={() => handleToggleExpandMilk(item.id)} hitSlop={8} style={{ padding: 4 }}>
                            <Ionicons
                              name={item.isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={20}
                              color={colors.textSecondary}
                            />
                          </Pressable>
                        </View>

                        {item.isExpanded && (
                          <View style={styles.cardExpandedBody}>
                            <View style={styles.divider} />
                            <View style={styles.formGrid}>
                              <View style={styles.formCol}>
                                <Text style={styles.fieldLabel}>Milk Litres (Quantity) *</Text>
                                <TextInput
                                  style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                                  value={item.quantityLitres}
                                  keyboardType="decimal-pad"
                                  onChangeText={val => handleUpdateMilkRecord(item.id, { quantityLitres: val })}
                                  placeholder="10.50"
                                  placeholderTextColor={colors.textMuted}
                                />
                              </View>
                              <View style={styles.formCol}>
                                <Text style={styles.fieldLabel}>Session</Text>
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                  {(['morning', 'evening'] as const).map(sess => (
                                    <Pressable
                                      key={sess}
                                      onPress={() => handleUpdateMilkRecord(item.id, { session: sess })}
                                      style={[
                                        styles.sessionSelectBtn,
                                        item.session === sess && { backgroundColor: colors.primary, borderColor: colors.primary },
                                      ]}
                                    >
                                      <Text style={{ fontSize: 12, color: item.session === sess ? '#FFFFFF' : colors.text }}>
                                        {sess === 'morning' ? 'Morning' : 'Evening'}
                                      </Text>
                                    </Pressable>
                                  ))}
                                </View>
                              </View>
                            </View>
                          </View>
                        )}
                      </Card>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Bottom Action Bar for Saving Selected Records */}
              {(farmerRecords.length > 0 || milkRecords.length > 0) && (
                <View style={[styles.bottomSaveBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                      {mode === 'farmers' ? `${farmerCounts.selected} Selected` : `${milkCounts.selected} Selected`}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      {mode === 'farmers'
                        ? 'Creates farmer profile and associates all detected cattle'
                        : 'Records individual farmer milk collection'}
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleSaveSelectedRecords}
                    disabled={isSaving || (mode === 'farmers' ? farmerCounts.selected === 0 : milkCounts.selected === 0)}
                    style={[
                      styles.saveBtn,
                      {
                        backgroundColor:
                          (mode === 'farmers' ? farmerCounts.selected === 0 : milkCounts.selected === 0) || isSaving
                            ? colors.border
                            : colors.primary,
                      },
                    ]}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                    ) : (
                      <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    )}
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                      {isSaving ? `Saving (${saveProgress.current}/${saveProgress.total})...` : 'Save Selected Records'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modeIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  accessDeniedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sampleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBodyContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  mainBodyWide: {
    flexDirection: 'row',
  },
  previewSidePane: {
    width: 380,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 14,
  },
  previewMobilePane: {
    padding: 12,
  },
  contentSidePane: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  imagePreviewCard: {
    padding: 12,
    borderRadius: 12,
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pillActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  imageActionBar: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  subActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  subActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyUploadBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    width: '100%',
    justifyContent: 'center',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  sampleRegisterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 4,
  },
  extractBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  statusNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
  },
  statusNoticeText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  scopeCard: {
    padding: 12,
    marginBottom: 10,
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  societyChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 17,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  controlsBar: {
    marginBottom: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  batchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  smallActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
  },
  farmerCard: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 10,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardExpandedBody: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  formCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  input: {
    height: 38,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
  },
  warningText: {
    fontSize: 11,
    color: '#D97706',
  },
  countMatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
  },
  cattleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addCattleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  cattleCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  cattleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cattleIndexLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  removeCandidateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  saveErrorText: {
    color: '#B91C1C',
    fontSize: 12,
    marginLeft: 6,
  },
  sessionSelectBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSaveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  liveCameraFullscreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraFlexWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cameraViewComponent: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  cameraOverlayTop: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  cameraCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFrameGuide: {
    position: 'absolute',
    top: '18%',
    left: '6%',
    right: '6%',
    bottom: '22%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 28,
    height: 28,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#10B981',
  },
  guideCornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#10B981',
  },
  guideCornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 28,
    height: 28,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#10B981',
  },
  guideCornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#10B981',
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    textAlign: 'center',
  },
  cameraOverlayBottom: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 28,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  cameraSideBtn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraSideBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  shutterOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  capturedConfirmOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.92)',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
  },
  capturedPhotoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  capturedPhotoSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  capturedActionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  retakePhotoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  usePhotoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
});
