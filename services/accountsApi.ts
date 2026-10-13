import { api } from './api';
import { BackendUser, CowRegistration, PersonalDetails } from './accountMapping';

export const AccountsApi = {
  async updateFarmer(farmerId: string, payload: {
    phone?: string;
    fullName?: string;
    personalDetails?: Partial<PersonalDetails>;
    cows?: Array<{ id: string; name?: string; milkCapacity?: number }>;
    newCows?: CowRegistration[];
  }): Promise<BackendUser> {
    const response = await api.patch(`/farmers/${farmerId}`, payload);
    return response.data.data.user;
  },
  async registerFarmer(payload: { phone: string; fullName: string; parentId: string; personalDetails: PersonalDetails; cows?: CowRegistration[] }): Promise<BackendUser> {
    const response = await api.post('/auth/register', { ...payload, role: 'farmer' });
    return response.data.data.user;
  },
  async listFarmers(): Promise<BackendUser[]> {
    const response = await api.get('/farmers');
    return response.data.data.farmers;
  },
};
