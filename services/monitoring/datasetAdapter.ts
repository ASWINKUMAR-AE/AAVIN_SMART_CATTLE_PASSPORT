/**
 * Documented Cattle & Buffalo Breed Milk Yield Reference Dataset Adapter
 * 
 * Sources & Reference Standards:
 * - National Dairy Development Board (NDDB) Breed Profiles
 * - Indian Council of Agricultural Research (ICAR-NBAGR) Performance Data
 * - Tamil Nadu Animal Husbandry & Dairying Department Breed Production Baselines
 * - Dataset Version: TN-DAIRY-BREED-v2026.1
 * 
 * Units: Litres per day (daily average under balanced feeding)
 * Session Split: Typically Morning ~55%, Evening ~45% for tropical stall-fed/semi-stall-fed conditions.
 */

export interface BreedYieldBaseline {
  breedCode: string;
  primaryName: string;
  aliases: string[];
  species: 'cattle' | 'buffalo';
  averageDailyYieldLitres: number;
  minDailyYieldLitres: number;
  maxDailyYieldLitres: number;
  morningRatio: number;
  eveningRatio: number;
  fatPercentAverage: number;
  snfPercentAverage: number;
  lactationPeriodDays: number;
  notes: string;
}

export const TAMIL_NADU_BREED_DATASET: Record<string, BreedYieldBaseline> = {
  jersey_cross: {
    breedCode: 'JER_X',
    primaryName: 'Jersey Crossbred',
    aliases: ['jersey cross', 'jersey crossbred', 'jersey', 'cb jersey', 'jersey x'],
    species: 'cattle',
    averageDailyYieldLitres: 14.0,
    minDailyYieldLitres: 10.0,
    maxDailyYieldLitres: 20.0,
    morningRatio: 0.55,
    eveningRatio: 0.45,
    fatPercentAverage: 4.2,
    snfPercentAverage: 8.5,
    lactationPeriodDays: 305,
    notes: 'Predominant dairy crossbred in Tamil Nadu cooperative societies with consistent dual-shift production.',
  },
  holstein_cross: {
    breedCode: 'HF_X',
    primaryName: 'Holstein Friesian Crossbred',
    aliases: ['holstein friesian cross', 'hf cross', 'hf', 'holstein', 'cb hf'],
    species: 'cattle',
    averageDailyYieldLitres: 16.5,
    minDailyYieldLitres: 12.0,
    maxDailyYieldLitres: 24.0,
    morningRatio: 0.56,
    eveningRatio: 0.44,
    fatPercentAverage: 3.8,
    snfPercentAverage: 8.4,
    lactationPeriodDays: 305,
    notes: 'High-volume commercial crossbred; requires adequate cooling and energy-dense ration.',
  },
  kangayam: {
    breedCode: 'KANG',
    primaryName: 'Kangayam',
    aliases: ['kangayam', 'kangeyam'],
    species: 'cattle',
    averageDailyYieldLitres: 4.5,
    minDailyYieldLitres: 3.0,
    maxDailyYieldLitres: 7.0,
    morningRatio: 0.52,
    eveningRatio: 0.48,
    fatPercentAverage: 4.8,
    snfPercentAverage: 8.8,
    lactationPeriodDays: 270,
    notes: 'Indigenous hardy draught/dual-purpose breed of western Tamil Nadu with moderate milk yield but high butterfat.',
  },
  umblachery: {
    breedCode: 'UMBL',
    primaryName: 'Umblachery',
    aliases: ['umblachery', 'umbalachery', 'jathi madu'],
    species: 'cattle',
    averageDailyYieldLitres: 4.0,
    minDailyYieldLitres: 2.5,
    maxDailyYieldLitres: 6.0,
    morningRatio: 0.50,
    eveningRatio: 0.50,
    fatPercentAverage: 4.9,
    snfPercentAverage: 8.9,
    lactationPeriodDays: 250,
    notes: 'Indigenous breed adapted to delta wetland conditions of Thanjavur/Nagapattinam.',
  },
  murrah: {
    breedCode: 'MURR',
    primaryName: 'Murrah Buffalo',
    aliases: ['murrah', 'murrah buffalo', 'graded murrah'],
    species: 'buffalo',
    averageDailyYieldLitres: 12.0,
    minDailyYieldLitres: 8.0,
    maxDailyYieldLitres: 18.0,
    morningRatio: 0.54,
    eveningRatio: 0.46,
    fatPercentAverage: 6.8,
    snfPercentAverage: 9.0,
    lactationPeriodDays: 300,
    notes: 'Premier dairy buffalo; high SNF and fat suited for Aavin premium buffalo milk procurement.',
  },
  sahiwal: {
    breedCode: 'SAHI',
    primaryName: 'Sahiwal',
    aliases: ['sahiwal'],
    species: 'cattle',
    averageDailyYieldLitres: 9.5,
    minDailyYieldLitres: 6.5,
    maxDailyYieldLitres: 14.0,
    morningRatio: 0.53,
    eveningRatio: 0.47,
    fatPercentAverage: 4.5,
    snfPercentAverage: 8.7,
    lactationPeriodDays: 300,
    notes: 'Zebu dairy breed; excellent heat tolerance and tick resistance.',
  },
  red_sindhi: {
    breedCode: 'RSIN',
    primaryName: 'Red Sindhi',
    aliases: ['red sindhi', 'sindhi'],
    species: 'cattle',
    averageDailyYieldLitres: 8.5,
    minDailyYieldLitres: 5.5,
    maxDailyYieldLitres: 12.0,
    morningRatio: 0.53,
    eveningRatio: 0.47,
    fatPercentAverage: 4.6,
    snfPercentAverage: 8.7,
    lactationPeriodDays: 290,
    notes: 'Indigenous milch breed maintained in state breeding farms and crossbreeding programs.',
  },
  gir: {
    breedCode: 'GIR',
    primaryName: 'Gir',
    aliases: ['gir', 'guzerat'],
    species: 'cattle',
    averageDailyYieldLitres: 10.0,
    minDailyYieldLitres: 7.0,
    maxDailyYieldLitres: 15.0,
    morningRatio: 0.54,
    eveningRatio: 0.46,
    fatPercentAverage: 4.6,
    snfPercentAverage: 8.7,
    lactationPeriodDays: 300,
    notes: 'Prominent desi dairy breed known for docility and persistent lactation.',
  },
  indigenous_nondescript: {
    breedCode: 'IND_ND',
    primaryName: 'Non-Descript / Indigenous Local',
    aliases: ['non-descript', 'nondescript', 'local', 'desi', 'naatu maadu', 'other'],
    species: 'cattle',
    averageDailyYieldLitres: 5.0,
    minDailyYieldLitres: 3.0,
    maxDailyYieldLitres: 8.0,
    morningRatio: 0.52,
    eveningRatio: 0.48,
    fatPercentAverage: 4.7,
    snfPercentAverage: 8.8,
    lactationPeriodDays: 260,
    notes: 'Local indigenous cattle baseline for mixed village herds where formal pedigree is unspecified.',
  },
};

/**
 * Adapter providing documented breed baselines with stage/health adjustments.
 */
export class BreedYieldDatasetAdapter {
  public static readonly DATASET_VERSION = 'TN-DAIRY-BREED-v2026.1';
  public static readonly DATASET_SOURCE = 'NDDB & Tamil Nadu Animal Husbandry Dairy Baseline Reference Standard';

  /**
   * Find baseline for a given breed string.
   */
  public static lookupBreedBaseline(breedName?: string): BreedYieldBaseline {
    if (!breedName) {
      return TAMIL_NADU_BREED_DATASET.indigenous_nondescript;
    }

    const clean = breedName.trim().toLowerCase();

    // Direct key match
    if (TAMIL_NADU_BREED_DATASET[clean]) {
      return TAMIL_NADU_BREED_DATASET[clean];
    }

    // Alias scan
    for (const entry of Object.values(TAMIL_NADU_BREED_DATASET)) {
      if (entry.aliases.some(alias => clean.includes(alias) || alias.includes(clean))) {
        return entry;
      }
    }

    // Default fallback to indigenous non-descript
    return TAMIL_NADU_BREED_DATASET.indigenous_nondescript;
  }

  /**
   * Calculate adjusted expected batch yield based on breed baseline, lactation stage, and batch.
   */
  public static estimateFromBreed(
    breedName: string,
    batch: 'morning' | 'evening',
    lactationStage?: 'early' | 'peak' | 'mid' | 'late' | 'dry'
  ): { expectedLitres: number; dailyBaseline: number; ratio: number; stageFactor: number } {
    const baseline = this.lookupBreedBaseline(breedName);

    // Lactation curve stage multipliers
    let stageFactor = 1.0;
    if (lactationStage === 'early') stageFactor = 0.85;
    else if (lactationStage === 'peak') stageFactor = 1.05;
    else if (lactationStage === 'mid') stageFactor = 0.90;
    else if (lactationStage === 'late') stageFactor = 0.65;
    else if (lactationStage === 'dry') stageFactor = 0.0;

    const ratio = batch === 'morning' ? baseline.morningRatio : baseline.eveningRatio;
    const expectedLitres = Number((baseline.averageDailyYieldLitres * stageFactor * ratio).toFixed(2));

    return {
      expectedLitres,
      dailyBaseline: baseline.averageDailyYieldLitres,
      ratio,
      stageFactor,
    };
  }
}
