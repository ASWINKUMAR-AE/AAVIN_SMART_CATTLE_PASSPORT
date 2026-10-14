import React from 'react';
import { RoleProfileScreen } from '../../components/RoleProfileScreen';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';

export default function UnionProfileScreen() {
  const { bmcs, booths, discrepancyCases } = useAavinStore();
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <RoleProfileScreen
      roleTitle={t('union.profile.title', 'Union Executive Profile')}
      roleSubtitle={t('union.profile.subtitle', 'Madurai District Co-operative Milk Union')}
      staffName={user?.fullName || t('union.profile.staffName', 'P. Jayaram')}
      staffId={user?.associatedId || 'UNION_EXECUTIVE'}
      facilityTitle={t('union.profile.facilityTitle', 'Headquarters Jurisdiction')}
      facilityValue={t('union.profile.facilityValue', 'Madurai District Milk Producers Union')}
      jurisdictionTitle={t('union.profile.jurisdictionTitle', 'District Operational Reach')}
      jurisdictionValue={t('union.profile.jurisdictionValue', '14 Taluks • 6 Chilling Centers')}
      roleIcon="🏛️"
      stats={[
        { label: t('union.profile.activeBmcs', 'Active BMCs'), value: t('union.profile.unitsCount', { count: bmcs.length }, `${bmcs.length} Units`) },
        { label: t('union.profile.activeSocieties', 'Active Societies'), value: t('union.profile.societiesCount', { count: booths.length }, `${booths.length} Societies`) },
        { label: t('union.profile.auditPipeline', 'Audit Pipeline'), value: t('union.profile.alertsCount', { count: (discrepancyCases || []).length }, `${(discrepancyCases || []).length} Alerts`) },
      ]}
    />
  );
}
