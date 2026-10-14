import React from 'react';
import { RoleProfileScreen } from '../../components/RoleProfileScreen';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';

export default function BmcProfileScreen() {
  const { bmcs, discrepancyCases } = useAavinStore();
  const { user } = useAuth();
  const { t } = useTranslation();

  const bmc = bmcs[0] || { name: 'Alanganallur Bulk Milk Chilling Center', code: 'BMC-102' };
  const pendingCases = (discrepancyCases || []).filter(d => d.status === 'under_investigation' || d.status === 'open').length;

  return (
    <RoleProfileScreen
      roleTitle={t('bmc.managerProfileTitle')}
      roleSubtitle={t('bmc.chillingCenterOps')}
      staffName={user?.fullName || "Dr. S. Sundaram"}
      staffId={user?.associatedId || "BMC_OPERATOR"}
      facilityTitle={t('bmc.assignedChillingCenter')}
      facilityValue={bmc.name}
      jurisdictionTitle={t('bmc.targetDailyCapacity')}
      jurisdictionValue={t('bmc.targetDailyCapacityValue', { litres: '10,000' })}
      roleIcon="🏭"
      stats={[
        { label: t('bmc.connectedSocieties'), value: t('bmc.centersCount', { count: 8 }) },
        { label: t('bmc.activeChiller'), value: t('bmc.chillerOk') },
        { label: t('bmc.discrepancies'), value: t('bmc.casesCount', { count: pendingCases }) },
      ]}
    />
  );
}
