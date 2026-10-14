import React from 'react';
import { RoleProfileScreen } from '../../components/RoleProfileScreen';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';

export default function VeterinaryProfileScreen() {
  const { cows } = useAavinStore();
  const { user } = useAuth();
  const { t } = useTranslation();

  const activeQuarantined = (cows || []).filter(
    c => c.healthStatus === 'quarantine_hold' || c.healthStatus === 'under_treatment' || c.activeWithdrawal?.hasActiveWithdrawal
  ).length;

  const totalTreatments = (cows || []).reduce(
    (count, c) => count + (c.treatmentRecords ? c.treatmentRecords.length : 0),
    0
  );

  return (
    <RoleProfileScreen
      roleTitle={t('veterinary.profile.roleTitle', 'Veterinary Officer Profile')}
      roleSubtitle={t('veterinary.profile.roleSubtitle', 'Aavin District Animal Husbandry Services')}
      staffName={user?.fullName || "Dr. V. Rajesh DVM"}
      staffId={user?.associatedId || "VET_OFFICER"}
      facilityTitle={t('veterinary.profile.facilityTitle', 'Veterinary Jurisdiction')}
      facilityValue={t('veterinary.profile.facilityValue', 'Vadipatti & Melur Dairy Veterinary Dispensaries')}
      jurisdictionTitle={t('veterinary.profile.jurisdictionTitle', 'Clinical License ID')}
      jurisdictionValue="TNV-VET-48921"
      roleIcon="🩺"
      stats={[
        { 
          label: t('veterinary.profile.registeredHerd', 'Registered Herd'), 
          value: t('veterinary.profile.cowsCount', '{count} Cows', { count: cows.length }) 
        },
        { 
          label: t('veterinary.profile.treatmentsLogged', 'Treatments Logged'), 
          value: `${totalTreatments}` 
        },
        { 
          label: t('veterinary.profile.underHolds', 'Under Holds'), 
          value: t('veterinary.profile.activeCount', '{count} Active', { count: activeQuarantined }) 
        },
      ]}
    />
  );
}
