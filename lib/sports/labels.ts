export function readEnumVariantKey(value: Record<string, unknown> | null | undefined) {
  if (!value || typeof value !== "object") return "unknown";
  const [key] = Object.keys(value);
  return key ?? "unknown";
}

export function getSportsProviderLabel(value: Record<string, unknown> | null | undefined) {
  const key = readEnumVariantKey(value);

  if (key === "sportsDataIo") return "SPORTSDATAIO";
  return "UNKNOWN";
}

export function getSportLabel(value: Record<string, unknown> | null | undefined) {
  const key = readEnumVariantKey(value);

  if (key === "basketball") return "BASKETBALL";
  return "UNKNOWN";
}

export function getLeagueLabel(value: Record<string, unknown> | null | undefined) {
  const key = readEnumVariantKey(value);

  if (key === "nba") return "NBA";
  return "UNKNOWN";
}

export function getSportsMarketTypeLabel(value: Record<string, unknown> | null | undefined) {
  const key = readEnumVariantKey(value);

  if (key === "headToHeadWinner") return "HEAD_TO_HEAD_WINNER";
  return "UNKNOWN";
}
