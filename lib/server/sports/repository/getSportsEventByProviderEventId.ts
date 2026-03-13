import { prisma } from "@/lib/prisma";

export async function getSportsEventByProviderEventId(params: {
  provider: string;
  providerEventId: string;
}) {
  const { provider, providerEventId } = params;

  return prisma.sportsEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider,
        providerEventId,
      },
    },
  });
}
