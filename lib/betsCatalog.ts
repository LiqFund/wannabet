import { BetStatus, Outcome, TemplateType } from '@/lib/types';

export type BetResolution = {
  resolvedAt: Date;
  oracleValue: number | null;
  notes: string | null;
};

export type BetRecord = {
  id: string;
  title: string;
  description: string;
  templateType: TemplateType;
  assetBase: string;
  assetQuote: string;
  threshold: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  resolveAt: Date;
  stakePerSide: number;
  currencyLabel: string;
  creatorAddress: string;
  takerAddress: string | null;
  xCreatorHandle: string | null;
  xOpponentHandle: string | null;
  handlesPublic: boolean;
  oracleSource: string;
  status: BetStatus;
  outcome: Outcome;
  createdAt: Date;
  resolution: BetResolution | null;
};

export const betsCatalog: BetRecord[] = [
  {
    id: 'btc-100k-q4',
    title: 'BTC closes above $100k by 2026-12-31',
    description: 'Bet resolves using BTC/USD reference price at resolution timestamp.',
    templateType: 'PRICE_ABOVE_BELOW',
    assetBase: 'BTC',
    assetQuote: 'USD',
    threshold: 100000,
    lowerBound: null,
    upperBound: null,
    resolveAt: new Date('2026-12-31T23:00:00Z'),
    stakePerSide: 250,
    currencyLabel: 'USDC',
    creatorAddress: '0x9Afbc30f58Bcb34f5D7bB2Db1b752f29fa9cE321',
    takerAddress: null,
    xCreatorHandle: 'alicealpha',
    xOpponentHandle: null,
    handlesPublic: true,
    oracleSource: 'Chainlink price feed: BTC/USD',
    status: 'OPEN',
    outcome: 'UNRESOLVED',
    createdAt: new Date('2026-09-15T12:00:00Z'),
    resolution: null
  },
  {
    id: 'eth-range-nov',
    title: 'ETH in $3,500-$4,200 range on Nov 30',
    description: 'Settlement uses ETH/USD snapshot at the exact resolve time.',
    templateType: 'PRICE_RANGE',
    assetBase: 'ETH',
    assetQuote: 'USD',
    threshold: null,
    lowerBound: 3500,
    upperBound: 4200,
    resolveAt: new Date('2026-11-30T18:00:00Z'),
    stakePerSide: 100,
    currencyLabel: 'USDC',
    creatorAddress: '0x4cE31D12193037d3fDaC1b66C1C5f20A1A72401D',
    takerAddress: '0x6D6B42066Fa1BcC61f7A12C9A8b1Bd7D5a50F239',
    xCreatorHandle: 'ethwizard',
    xOpponentHandle: 'rangehunter',
    handlesPublic: true,
    oracleSource: 'Chainlink price feed: ETH/USD',
    status: 'MATCHED',
    outcome: 'UNRESOLVED',
    createdAt: new Date('2026-08-07T08:30:00Z'),
    resolution: null
  },
  {
    id: 'sol-above-300',
    title: 'SOL above $300 by 2026-10-01',
    description: 'A deterministic oracle snapshot picks winner at resolution.',
    templateType: 'PRICE_ABOVE_BELOW',
    assetBase: 'SOL',
    assetQuote: 'USD',
    threshold: 300,
    lowerBound: null,
    upperBound: null,
    resolveAt: new Date('2026-10-01T16:00:00Z'),
    stakePerSide: 75,
    currencyLabel: 'USDC',
    creatorAddress: '0x3f3314c03f15C87C76Ff5808b0e2CC4f8e4Ce513',
    takerAddress: '0x8B505d32740cB285F8B71C3162Bf85Fd269f4690',
    xCreatorHandle: null,
    xOpponentHandle: null,
    handlesPublic: false,
    oracleSource: 'Chainlink price feed: SOL/USD',
    status: 'RESOLVED',
    outcome: 'TAKER_WINS',
    createdAt: new Date('2026-06-20T10:45:00Z'),
    resolution: {
      resolvedAt: new Date('2026-10-01T16:00:05Z'),
      oracleValue: 284.12,
      notes: 'Simulated deterministic oracle resolution for MVP UI.'
    }
  }
];

export const getBetById = (id: string) => betsCatalog.find((bet) => bet.id === id);
