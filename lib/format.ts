import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Bet } from '@prisma/client';

dayjs.extend(utc);

export const formatDateUtc = (date: Date) => dayjs(date).utc().format('YYYY-MM-DD HH:mm [UTC]');

export const formatTemplate = (bet: Bet) => {
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

export const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
