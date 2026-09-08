import {
  commissionCentsForSeats,
  commissionTaxLines,
  type TaxLine,
  type TaxMode,
} from '@carpool/schemas';
import { env } from '../../env';

export function currentTaxMode(): TaxMode {
  return env.TAX_MODE;
}

export function fareCentsFromPrice(pricePerSeat: string | number, seats: number): number {
  return Math.round(Number(pricePerSeat) * 100) * seats;
}

/**
 * Split commission (+ optional ride fare) according to TAX_MODE.
 * Tax is applied on the commission only — the fare is a pass-through.
 * Commission scales with `seats` (25% off the total from 3+ seats booked).
 */
export function computeInvoiceAmounts(
  fareCents = 0,
  seats = 1,
  mode: TaxMode = currentTaxMode(),
): {
  fareCents: number;
  commissionCents: number;
  subtotalCents: number;
  taxLines: TaxLine[];
  taxCents: number;
  totalCents: number;
} {
  const commissionCents = commissionCentsForSeats(seats);
  const taxLines = commissionTaxLines(mode, commissionCents);
  const taxCents = taxLines.reduce((sum, line) => sum + line.amountCents, 0);
  const subtotalCents = commissionCents + fareCents;
  return {
    fareCents,
    commissionCents,
    subtotalCents,
    taxLines,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}
