import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type WalletLedgerDirection = 'CREDIT' | 'DEBIT';
export type WalletLedgerEntryType =
  | 'TOP_UP'
  | 'HOLD'
  | 'RELEASE'
  | 'CAPTURE_TO_SELLER'
  | 'COMMISSION'
  | 'PURCHASE'
  | 'REFUND'
  | 'FEATURED_FEE'
  | 'PAYOUT'
  | 'ADJUSTMENT';

export type PaymentIntentStatus =
  | 'CREATED'
  | 'REDIRECTED'
  | 'VERIFIED'
  | 'FAILED'
  | 'CANCELLED';

export interface WalletLedgerEntry {
  id: number;
  direction: WalletLedgerDirection;
  amount: number;
  availableAfter: number;
  heldAfter: number;
  entryType: WalletLedgerEntryType;
  note?: string;
  paymentIntentId?: number | null;
  createdAt: string;
}

export interface PaymentIntentSummary {
  id: number;
  purpose: string;
  amountIrt: number;
  status: PaymentIntentStatus;
  authority?: string | null;
  refId?: number | null;
  gatewayCode?: number | null;
  failureReason?: string | null;
  failedAt?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface WalletSummary {
  walletId: number | null;
  availableBalance: number;
  heldBalance: number;
  minTopUpIrt: number;
  paymentsEnabled: boolean;
  recentLedger: WalletLedgerEntry[];
  recentPayments?: PaymentIntentSummary[];
}

export interface WalletTopUpResponse {
  paymentIntentId: number;
  amountIrt: number;
  authority: string;
  startPayUrl: string;
}

export interface PaymentVerifyResult {
  paymentIntentId: number;
  purpose: string;
  status: string;
  amountIrt: number;
  refId?: number | null;
  availableBalance: number;
  heldBalance: number;
  alreadyVerified: boolean;
  verifiedAt?: string | null;
}

export interface AdminWalletAdjustPayload {
  direction: 'CREDIT' | 'DEBIT';
  amountIrt: number;
  note: string;
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly http = inject(HttpClient);

  getWallet(ledgerLimit = 20): Observable<WalletSummary> {
    const params = new HttpParams().set('ledgerLimit', String(ledgerLimit));
    return this.http.get<WalletSummary>(`${this.API_URL}/wallet`, { params });
  }

  topUp(amountIrt: number): Observable<WalletTopUpResponse> {
    return this.http.post<WalletTopUpResponse>(`${this.API_URL}/wallet/top-up`, { amountIrt });
  }

  verify(authority: string): Observable<PaymentVerifyResult> {
    return this.http.post<PaymentVerifyResult>(`${this.API_URL}/payments/verify`, { authority });
  }

  cancel(authority: string): Observable<{ cancelled: boolean }> {
    const params = new HttpParams().set('authority', authority);
    return this.http.post<{ cancelled: boolean }>(`${this.API_URL}/payments/cancel`, null, { params });
  }

  getUserWallet(userId: number, ledgerLimit = 20): Observable<WalletSummary> {
    const params = new HttpParams().set('ledgerLimit', String(ledgerLimit));
    return this.http.get<WalletSummary>(`${this.API_URL}/admin/wallets/${userId}`, { params });
  }

  adjustUserWallet(userId: number, payload: AdminWalletAdjustPayload): Observable<WalletSummary> {
    return this.http.post<WalletSummary>(`${this.API_URL}/admin/wallets/${userId}/adjust`, payload);
  }
}
