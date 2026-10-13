import React from 'react';
import { RoleProfileScreen } from '../../components/RoleProfileScreen';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';

export default function UnionProfileScreen() {
  const { bmcs, booths, discrepancyCases } = useAavinStore();
  const { user } = useAuth();

  return (
    <RoleProfileScreen
      roleTitle="Union Executive Profile"
      roleSubtitle="Madurai District Co-operative Milk Union"
      staffName={user?.fullName || "P. Jayaram"}
      staffId={user?.associatedId || "UNION_EXECUTIVE"}
      facilityTitle="Headquarters Jurisdiction"
      facilityValue="Madurai District Milk Producers Union"
      jurisdictionTitle="District Operational Reach"
      jurisdictionValue="14 Taluks • 6 Chilling Centers"
      roleIcon="🏛️"
      stats={[
        { label: "Active BMCs", value: `${bmcs.length} Units` },
        { label: "Active Booths", value: `${booths.length} Booths` },
        { label: "Audit Pipeline", value: `${(discrepancyCases || []).length} Alerts` },
      ]}
    />
  );
}
