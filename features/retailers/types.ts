import type { BasketLine } from '../shopping/engine';

export type RetailerId = 'tesco' | 'sainsburys' | 'asda' | 'morrisons' | 'ocado' | 'waitrose' | 'aldi' | 'lidl' | 'other';
export type ConnectionStatus = 'not_connected' | 'consent_required' | 'connected' | 'not_supported';
export type BasketHandoff = { retailer: RetailerId; status: 'ready' | 'unavailable'; checkoutUrl?: string; message: string };

/** Retailers must implement this adapter through an approved API/authorisation flow.
 * No password fields belong in the app or database. */
export interface RetailerAdapter {
  retailer: RetailerId;
  connectionStatus(userId: string): Promise<ConnectionStatus>;
  requestConsent(returnUrl: string): Promise<string>;
  compare(lines: BasketLine[]): Promise<{ groceryPence: number; deliveryPence?: number; loyaltySavingsPence?: number }>;
  addToBasket(lines: BasketLine[]): Promise<BasketHandoff>;
}
