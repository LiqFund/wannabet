"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getWannaBetProgram } from "@/lib/anchor";
import {
  WANNABET_DEVNET_TEST_MINT,
  WANNABET_ESCROW_PROGRAM_ID,
} from "@/lib/solana";

type BetSettlementActionsProps = {
  betPubkey: string;
  creator: string;
  accepter: string | null;
  creatorSide: number;
  winnerSide: number | null;
  resolutionStatus: string;
  payoutClaimed: boolean;
  creatorRefundClaimed: boolean;
  accepterRefundClaimed: boolean;
};

type ConfigAccountShape = {
  feeVault: PublicKey | { toBase58: () => string } | string;
};

export default function BetSettlementActions({
  betPubkey,
  creator,
  accepter,
  creatorSide,
  winnerSide,
  resolutionStatus,
  payoutClaimed,
  creatorRefundClaimed,
  accepterRefundClaimed,
}: BetSettlementActionsProps) {
  const router = useRouter();
  const wallet = useWallet();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedWallet = wallet.publicKey?.toBase58() ?? null;
  const normalizedStatus = String(resolutionStatus).toUpperCase();

  const winnerWallet = useMemo(() => {
    if (winnerSide === null || !accepter) return null;
    return winnerSide === creatorSide ? creator : accepter;
  }, [winnerSide, creatorSide, creator, accepter]);

  const canClaimWinnings =
    normalizedStatus === "RESOLVED" &&
    payoutClaimed === false &&
    connectedWallet !== null &&
    winnerWallet !== null &&
    connectedWallet === winnerWallet;

  const canClaimVoidRefund =
    normalizedStatus === "VOIDED" &&
    connectedWallet !== null &&
    ((connectedWallet === creator && creatorRefundClaimed === false) ||
      (accepter !== null &&
        connectedWallet === accepter &&
        accepterRefundClaimed === false));

  async function handleClaimWinnings() {
    if (
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !wallet.signAllTransactions
    ) {
      setError("Connected wallet does not support signing transactions.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSuccessTx(null);
      setError(null);

      const program = getWannaBetProgram({
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      });

      const bet = new PublicKey(betPubkey);

      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        WANNABET_ESCROW_PROGRAM_ID
      );

      const [escrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), bet.toBuffer()],
        WANNABET_ESCROW_PROGRAM_ID
      );

      const claimantAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        wallet.publicKey
      );

      const escrowAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        escrowAuthorityPda,
        true
      );

      const config = await (
        program.account as unknown as {
          config: {
            fetch: (address: PublicKey) => Promise<ConfigAccountShape>;
          };
        }
      ).config.fetch(configPda);

      const feeVault =
        config.feeVault instanceof PublicKey
          ? config.feeVault
          : new PublicKey(
              typeof config.feeVault === "string"
                ? config.feeVault
                : config.feeVault.toBase58()
            );

      const tx = await program.methods
        .claimWinnings()
        .accounts({
          claimant: wallet.publicKey,
          config: configPda,
          bet,
          mint: WANNABET_DEVNET_TEST_MINT,
          claimantAta,
          escrowAuthority: escrowAuthorityPda,
          escrowAta,
          feeVault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setSuccessTx(tx);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to claim winnings.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClaimVoidRefund() {
    if (
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !wallet.signAllTransactions
    ) {
      setError("Connected wallet does not support signing transactions.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSuccessTx(null);
      setError(null);

      const program = getWannaBetProgram({
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      });

      const bet = new PublicKey(betPubkey);

      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        WANNABET_ESCROW_PROGRAM_ID
      );

      const [escrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), bet.toBuffer()],
        WANNABET_ESCROW_PROGRAM_ID
      );

      const claimantAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        wallet.publicKey
      );

      const escrowAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        escrowAuthorityPda,
        true
      );

      const tx = await program.methods
        .claimVoidRefund()
        .accounts({
          claimant: wallet.publicKey,
          config: configPda,
          bet,
          mint: WANNABET_DEVNET_TEST_MINT,
          claimantAta,
          escrowAuthority: escrowAuthorityPda,
          escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setSuccessTx(tx);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to claim void refund."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-lg font-semibold text-white">Settlement actions</h2>

      {!wallet.publicKey ? (
        <p className="mt-3 text-sm text-white/70">
          Connect your wallet to see available settlement actions.
        </p>
      ) : !canClaimWinnings && !canClaimVoidRefund ? (
        <p className="mt-3 text-sm text-white/70">
          No settlement action is available for this wallet.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {canClaimWinnings ? (
            <button
              type="button"
              onClick={handleClaimWinnings}
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : "Claim winnings"}
            </button>
          ) : null}

          {canClaimVoidRefund ? (
            <button
              type="button"
              onClick={handleClaimVoidRefund}
              disabled={isSubmitting}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Processing..." : "Claim void refund"}
            </button>
          ) : null}
        </div>
      )}

      {successTx ? (
        <p className="mt-4 break-all text-sm text-emerald-300">
          Transaction sent: {successTx}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 break-all text-sm text-red-300">{error}</p>
      ) : null}
    </section>
  );
}