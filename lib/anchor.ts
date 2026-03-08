import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { Connection } from '@solana/web3.js';
import { SOLANA_RPC_URL, WANNABET_ESCROW_PROGRAM_ID } from '@/lib/solana';
import idl from '@/lib/idl/wannabet_escrow.json';

export function getWannaBetProgram(wallet: AnchorProvider['wallet']) {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed'
  });

  return new Program(
    {
      ...(idl as Idl),
      address: WANNABET_ESCROW_PROGRAM_ID.toBase58()
    } as Idl,
    provider
  );
}
