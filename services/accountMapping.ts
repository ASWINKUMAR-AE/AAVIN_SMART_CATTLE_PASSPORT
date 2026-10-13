import { Booth, Cow, DemoUser, Farmer, UserRole } from '../types/aavin';

export interface CowRegistration {
  pashuAadhaar: string;
  breed: string;
  milkCapacity: number;
  name?: string;
}

export interface BackendCow extends Omit<CowRegistration, 'milkCapacity'> {
  id: string;
  farmerId: string;
  milkCapacity: string | number;
  createdAt: string;
}

export interface PersonalDetails {
  farmerIdCode: string;
  address: string;
  village: string;
  community?: string;
  numberOfCows: number;
  verificationStatus?: 'pending' | 'verified';
  bankAccountName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
}
export interface BackendParent {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  parentId: string | null;
}
export interface BackendUser {
  id: string;
  phone: string;
  fullName: string;
  role: 'farmer' | 'society' | 'bmc' | 'union';
  parentId: string | null;
  parent: BackendParent | null;
  personalDetails: PersonalDetails | null;
  cows?: BackendCow[];
  createdAt: string;
}

// Undefined preserves cached cattle when talking to a server predating this API.
export function mapCows(account: BackendUser): Cow[] | undefined {
  return account.cows?.map(cow => ({
    id: cow.id,
    backendSynced: true,
    cowId: `COW-${cow.pashuAadhaar}`,
    tagId: cow.pashuAadhaar,
    farmerId: cow.farmerId,
    farmerName: account.fullName,
    breed: cow.breed,
    name: cow.name || `Cow (${cow.breed})`,
    dailyMilkYield: Number(cow.milkCapacity),
    createdAt: cow.createdAt,
    dateOfBirth: '',
    approxAgeMonths: 0,
    sex: 'female',
    currentStatus: 'lactating',
    healthStatus: 'healthy',
    lactationStage: 'peak',
    identificationMarks: 'Govt 12-digit RFID Tag',
    verificationStatus: 'pending',
    medicalHistory: [],
    vaccinationHistory: [],
    inseminationHistory: [],
    treatmentRecords: [],
  }));
}

export function mapAccount(account: BackendUser): DemoUser {
  const roles: Record<BackendUser['role'], UserRole> = { farmer: 'farmer', society: 'booth', bmc: 'bmc', union: 'union' };
  const role = roles[account.role];
  if (!role || !account.id) throw new Error('Unsupported account returned by the server.');
  return {
    id: account.id, username: account.phone, fullName: account.fullName,
    role, phone: account.phone, email: '', associatedId: account.id,
    description: `${account.fullName} • ${account.role}`, preferredLanguage: 'en',
  };
}

export function mapFarmer(account: BackendUser): Farmer {
  if (account.role !== 'farmer') throw new Error('Expected a Farmer account.');
  const details = account.personalDetails;
  return {
    id: account.id, name: account.fullName, mobileNumber: account.phone,
    farmerIdCode: details?.farmerIdCode ?? '', address: details?.address ?? '',
    village: details?.village ?? '', community: details?.community ?? '',
    numberOfCows: details?.numberOfCows ?? 0,
    assignedBoothId: account.parentId ?? '', verificationStatus: details?.verificationStatus ?? 'pending',
    bankAccountName: details?.bankAccountName, bankName: details?.bankName,
    bankAccountNumber: details?.bankAccountNumber, bankIfsc: details?.bankIfsc,
    upiId: details?.upiId, createdAt: account.createdAt,
  };
}

export function mapSociety(account: BackendUser | BackendParent): Booth {
  return {
    id: account.id, name: account.fullName, code: account.id,
    operatorName: account.fullName, phone: account.phone,
    assignedBmcId: account.parentId ?? '', taluk: '', village: '', district: '', capacityLitres: 0,
  };
}

export function apiErrorMessage(error: any): string {
  const flatten = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.flatMap(flatten);
    if (value && typeof value === 'object') return Object.values(value).flatMap(flatten);
    return typeof value === 'string' ? [value] : [];
  };
  const details = flatten(error?.response?.data?.errors);
  return details.join(' ') || error?.response?.data?.message || 'Unable to contact the server. Please try again.';
}
