import { Outcome, TemplateType } from '@/lib/types';

const hashSeed = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const simulateOracleValue = (betId: string, base = 90000, spread = 40000) => {
  const seed = hashSeed(betId);
  const rng = mulberry32(seed);
  return Number((base + rng() * spread).toFixed(2));
};

export const computeOutcome = (
  templateType: TemplateType,
  oracleValue: number,
  threshold?: number | null,
  lowerBound?: number | null,
  upperBound?: number | null
): Outcome => {
  if (templateType === 'PRICE_ABOVE_BELOW') {
    if (threshold == null) return 'PUSH';
    if (oracleValue === threshold) return 'PUSH';
    return oracleValue > threshold ? 'CREATOR_WINS' : 'TAKER_WINS';
  }

  if (templateType === 'PRICE_RANGE') {
    if (lowerBound == null || upperBound == null) return 'PUSH';
    return oracleValue >= lowerBound && oracleValue <= upperBound ? 'CREATOR_WINS' : 'TAKER_WINS';
  }

  return 'PUSH';
};
