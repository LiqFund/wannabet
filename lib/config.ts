import { PublicKey } from '@solana/web3.js';

const allowedNetworks = ['devnet', 'mainnet-beta'] as const;
type SolanaNetwork = (typeof allowedNetworks)[number];

const currentDevnetProgramId = '36r1hGZPxnwoJRuDQ7Qqf5ndx2FHLRKcQ3iFivkoxZ2L';
const currentDevnetMint = '41HMG3gXWky6c5HRo7z9moHuPWc2dk7EXQRxwEa2huqu';

const rawEnv = {
  NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
  NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  NEXT_PUBLIC_WANNABET_PROGRAM_ID: process.env.NEXT_PUBLIC_WANNABET_PROGRAM_ID,
  NEXT_PUBLIC_WANNABET_MINT: process.env.NEXT_PUBLIC_WANNABET_MINT,
} as const;

function getEnv(name: keyof typeof rawEnv) {
  const value = rawEnv[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseNetwork(value: string): SolanaNetwork {
  if ((allowedNetworks as readonly string[]).includes(value)) {
    return value as SolanaNetwork;
  }
  throw new Error(
    `Invalid NEXT_PUBLIC_SOLANA_NETWORK: ${value}. Expected devnet or mainnet-beta.`
  );
}

function parsePublicKey(name: string, value: string) {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`Invalid public key in ${name}: ${value}`);
  }
}

const solanaNetwork = parseNetwork(getEnv('NEXT_PUBLIC_SOLANA_NETWORK'));
const solanaRpcUrl = getEnv('NEXT_PUBLIC_SOLANA_RPC_URL');
const wannabetProgramId = parsePublicKey(
  'NEXT_PUBLIC_WANNABET_PROGRAM_ID',
  getEnv('NEXT_PUBLIC_WANNABET_PROGRAM_ID')
);
const wannabetMint = parsePublicKey(
  'NEXT_PUBLIC_WANNABET_MINT',
  getEnv('NEXT_PUBLIC_WANNABET_MINT')
);

if (
  solanaNetwork === 'mainnet-beta' &&
  wannabetMint.toBase58() === currentDevnetMint
) {
  throw new Error('Refusing to boot mainnet with the current devnet test mint.');
}

if (
  solanaNetwork === 'mainnet-beta' &&
  wannabetProgramId.toBase58() === currentDevnetProgramId
) {
  throw new Error('Refusing to boot mainnet with the current devnet program ID.');
}

export const appConfig = {
  solanaNetwork,
  solanaRpcUrl,
  wannabetProgramId,
  wannabetMint,
} as const;