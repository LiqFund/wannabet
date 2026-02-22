import { BetStatus, TemplateType } from '@prisma/client';

export const statusOptions: BetStatus[] = ['OPEN', 'MATCHED', 'RESOLVED'];
export const templateOptions: TemplateType[] = [
  'PRICE_ABOVE_BELOW',
  'PRICE_RANGE',
  'SPORTS_WINNER',
  'SPORTS_OU'
];

export const labelForTemplate: Record<TemplateType, string> = {
  PRICE_ABOVE_BELOW: 'Price Above/Below',
  PRICE_RANGE: 'Price Range',
  SPORTS_WINNER: 'Sports Winner (coming soon)',
  SPORTS_OU: 'Sports Over/Under (coming soon)'
};
