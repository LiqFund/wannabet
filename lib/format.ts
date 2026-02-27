import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { BetRecord } from '@/lib/betsCatalog';

dayjs.extend(utc);

export const formatDateUtc = (date: Date) => dayjs(date).utc().format('YYYY-MM-DD HH:mm [UTC]');

export const formatTemplate = (bet: BetRecord) => {
  switch (bet.templateType) {
    case 'PRICE_ABOVE_BELOW':
      return `${bet.assetBase}/${bet.assetQuote} > ${bet.threshold?.toString() ?? '-'} at ${formatDateUtc(bet.resolveAt)}`;
    case 'PRICE_RANGE':
      return `${bet.assetBase}/${bet.assetQuote} in [${bet.lowerBound?.toString() ?? '-'}, ${bet.upperBound?.toString() ?? '-'}] at ${formatDateUtc(bet.resolveAt)}`;
    case 'SPORTS_WINNER':
      return 'Sports winner template (coming soon)';
    case 'SPORTS_OU':
      return 'Sports over/under template (coming soon)';
    default:
      return '';
  }
};

const trimTrailingZeros = (value: string) => value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');

export const formatUSDC = (value: number): string => {
  const amount = Number.isFinite(value) ? value : 0;
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);

  if (absolute >= 1_000_000_000) {
    return `${sign}${trimTrailingZeros((absolute / 1_000_000_000).toFixed(2))}B USDC`;
  }

  if (absolute >= 1_000_000) {
    return `${sign}${trimTrailingZeros((absolute / 1_000_000).toFixed(2))}M USDC`;
  }

  if (absolute >= 1_000) {
    return `${sign}${trimTrailingZeros((absolute / 1_000).toFixed(2))}k USDC`;
  }

  return `${sign}${trimTrailingZeros(absolute.toFixed(2))} USDC`;
};

export const formatUsdcCompact = (value: number): string => formatUSDC(value);

export const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
