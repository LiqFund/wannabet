import { prisma } from "@/lib/prisma";

export async function listBetSportsEventLinks(betPubkeys: string[]) {
  if (betPubkeys.length === 0) {
    return [];
  }

  return prisma.betSportsEventLink.findMany({
    where: {
      betPubkey: {
        in: betPubkeys,
      },
    },
  });
}
