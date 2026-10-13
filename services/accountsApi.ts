import { api } from './api';
import { BackendUser, PersonalDetails } from './accountMapping';

export const AccountsApi = {
  async registerFarmer(payload: { phone: string; fullName: string; parentId: string; personalDetails: PersonalDetails }): Promise<BackendUser> {
    const response = await api.post('/auth/register', { ...payload, role: 'farmer' });
    return response.data.data.user;
  },
  async listFarmers(): Promise<BackendUser[]> {
    const response = await api.get('/farmers');
    return response.data.data.farmers;
  },
};
