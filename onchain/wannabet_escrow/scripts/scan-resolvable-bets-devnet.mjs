import {
  collectCryptoPriceBetStatuses,
  printPipelineHeader,
  printReadyBetCore,
  printStatusSummary,
  printUnreadablePubkeys,
} from "./lib/crypto-price-resolver-devnet.mjs";

printPipelineHeader("Scanning devnet bets for resolver candidates...");

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
  printReadyBetCore(bet);
  console.log("");
}
