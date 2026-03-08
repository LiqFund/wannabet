import { clusterApiUrl, PublicKey } from '@solana/web3.js';

export const SOLANA_NETWORK = 'devnet';
export const SOLANA_RPC_URL = clusterApiUrl(SOLANA_NETWORK);

export const WANNABET_ESCROW_PROGRAM_ID = new PublicKey(
  'H1fMNM3LC2Ljy6auyBVzeTvE2aeG4CTDRhpm6crn5bVW'
);

export const WANNABET_DEVNET_TEST_MINT = new PublicKey(
  '41HMG3gXWky6c5HRo7z9moHuPWc2dk7EXQRxwEa2huqu'
);
