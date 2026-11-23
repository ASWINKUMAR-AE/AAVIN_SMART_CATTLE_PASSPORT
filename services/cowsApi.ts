import { api } from './api';
import { Cow, Farmer, Booth } from '../types/aavin';

export interface ScannedCowResponse {
  cow: Cow;
  farmer: Farmer;
  society?: Booth;
}

export const CowsApi = {
  /**
   * Scan a cattle ear tag / barcode / RFID and fetch cow details with owner farmer data from the database.
   */
  async scanCow(tagId: string): Promise<ScannedCowResponse> {
    const cleanTag = encodeURIComponent(tagId.trim());
    const response = await api.get(`/cows/scan/${cleanTag}`);
    return response.data.data;
  },

  /**
   * Fetch all registered cows from the database with farmer details.
   */
  async listCows(params?: { tag?: string; search?: string; farmerId?: string }): Promise<Cow[]> {
    const response = await api.get('/cows', { params });
    return response.data.data?.cows || [];
  },

  /**
   * Get single cow details by tag or id from the database.
   */
  async getCow(idOrTag: string): Promise<ScannedCowResponse> {
    const clean = encodeURIComponent(idOrTag.trim());
    const response = await api.get(`/cows/${clean}`);
    return response.data.data;
  },
};
