import { syncNbaCurrentSeason } from "@/lib/server/sports/sync/syncNbaSeason";

async function main() {
  const result = await syncNbaCurrentSeason();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
