import { prisma } from "@/lib/prisma";

export async function getBetSportsEventLink(betPubkey: string) {
  return prisma.betSportsEventLink.findUnique({
    where: {
      betPubkey,
    },
  });
}
