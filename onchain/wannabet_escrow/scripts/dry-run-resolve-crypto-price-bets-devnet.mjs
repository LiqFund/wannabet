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

printPipelineHeader("Dry-run scanning devnet bets for resolver candidates...");

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
    console.log("  candleOpen:", candle.open);
    console.log("  candleHigh:", candle.high);
    console.log("  candleLow:", candle.low);
    console.log("  candleClose:", candle.close);
    console.log("  resolvedPriceE8:", resolvedPriceE8);
    console.log("  predictedWinnerSide:", winnerSide);
    console.log("");
  } catch (err) {
    console.error("Failed dry-run resolution for bet:", bet.pubkey);
    console.error(" ", err instanceof Error ? err.message : String(err));
    console.error("");
  }
}
