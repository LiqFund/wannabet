import { execFileSync } from "child_process";
import path from "path";
import {
  collectCryptoPriceBetStatuses,
  computeWinnerSide,
  decimalPriceToE8,
  fetchBinanceMinuteClose,
  printPipelineHeader,
  printReadyBetCore,
  printStatusSummary,
  printUnreadablePubkeys,
} from "./lib/crypto-price-resolver-devnet.mjs";

const resolveScriptPath = path.resolve(
  "onchain/wannabet_escrow/scripts/resolve-crypto-price-bet-devnet.mjs"
);

printPipelineHeader("Resolving ready devnet crypto price bets...");

const { nowTs, readyBets, summary } = await collectCryptoPriceBetStatuses();

printStatusSummary(nowTs, summary);
printUnreadablePubkeys(summary);

console.log("Ready candidate count:", readyBets.length);
console.log("");

if (readyBets.length === 0) {
  console.log("No BTC/USDT Binance resolver candidates are ready right now.");
  process.exit(0);
}

for (const bet of readyBets) {
  try {
    const candle = await fetchBinanceMinuteClose(bet.settlementMinuteTs);
    const resolvedPriceE8 = decimalPriceToE8(candle.close);
    const winnerSide = computeWinnerSide(bet, resolvedPriceE8);

    printReadyBetCore(bet);
    console.log("  candleClose:", candle.close);
    console.log("  resolvedPriceE8:", resolvedPriceE8);
    console.log("  predictedWinnerSide:", winnerSide);

    execFileSync("node", [resolveScriptPath, bet.pubkey, resolvedPriceE8], {
      stdio: "inherit",
    });

    console.log("  resolved:", bet.pubkey);
    console.log("");
  } catch (err) {
    console.error("Failed resolution for bet:", bet.pubkey);
    console.error(" ", err instanceof Error ? err.message : String(err));
    console.error("");
  }
}
