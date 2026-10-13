import React from 'react';
import { RoleProfileScreen } from '../../components/RoleProfileScreen';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';

export default function BoothProfileScreen() {
  const { booths, farmers, milkRecords } = useAavinStore();
  const { user } = useAuth();

  const booth = booths[0] || { name: 'Kallandiri Milk Collection Center', code: 'BOOTH-401' };
  const todayLitres = (milkRecords || []).reduce((sum, d) => sum + (d.quantityLitres || 0), 0);

  return (
    <RoleProfileScreen
      roleTitle="Booth Operator Profile"
      roleSubtitle="Milk Collection Center Staff"
      staffName={user?.fullName || "K. Murugan"}
      staffId={user?.associatedId || "BOOTH_OPERATOR"}
      facilityTitle="Assigned Booth"
      facilityValue={booth.name}
      jurisdictionTitle="Assigned BMC Hub"
      jurisdictionValue="Alanganallur BMC Center"
      roleIcon="🏪"
      stats={[
        { label: "Registered Farmers", value: `${farmers.length}` },
        { label: "Today Collected", value: `${todayLitres.toFixed(1)} L` },
        { label: "Awaiting BMC", value: "2 Batches" },
      ]}
    />
  );
}
