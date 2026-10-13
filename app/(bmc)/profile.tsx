import React from 'react';
import { RoleProfileScreen } from '../../components/RoleProfileScreen';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';

export default function BmcProfileScreen() {
  const { bmcs, discrepancyCases } = useAavinStore();
  const { user } = useAuth();

  const bmc = bmcs[0] || { name: 'Alanganallur Bulk Milk Chilling Center', code: 'BMC-102' };
  const pendingCases = (discrepancyCases || []).filter(d => d.status === 'under_investigation' || d.status === 'open').length;

  return (
    <RoleProfileScreen
      roleTitle="BMC Manager Profile"
      roleSubtitle="Bulk Milk Chilling Center Operations"
      staffName={user?.fullName || "Dr. S. Sundaram"}
      staffId={user?.associatedId || "BMC_OPERATOR"}
      facilityTitle="Assigned Chilling Center"
      facilityValue={bmc.name}
      jurisdictionTitle="Target Daily Capacity"
      jurisdictionValue="10,000 Litres (4°C Chilled)"
      roleIcon="🏭"
      stats={[
        { label: "Connected Societies", value: "8 Centers" },
        { label: "Active Chiller", value: "3.8°C OK" },
        { label: "Discrepancies", value: `${pendingCases} Cases` },
      ]}
    />
  );
}
