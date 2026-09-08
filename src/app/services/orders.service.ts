import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type MarketplaceOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID_HELD'
  | 'RELEASED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'DISPUTED';

export type MarketplaceOrderPaymentMethod = 'WALLET' | 'ZARINPAL';

export interface MarketplaceOrder {
  id: number;
  listingId: number;
  domainName?: string | null;
  buyerId?: number | null;
  buyerName?: string | null;
  sellerId?: number | null;
  sellerName?: string | null;
  offerId?: number | null;
  grossAmount: number;
  commissionAmount: number;
  sellerNet: number;
  status: MarketplaceOrderStatus;
  paymentMethod?: MarketplaceOrderPaymentMethod | null;
  paymentIntentId?: number | null;
  paidAt?: string | null;
  releasedAt?: string | null;
  cancelledAt?: string | null;
  paymentDeadline?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PagedOrders {
  content: MarketplaceOrder[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface OrderPayResponse {
  paymentIntentId: number;
  amountIrt: number;
  authority: string;
  startPayUrl: string;
}

export interface OrderListParams {
  role?: 'buyer' | 'seller' | 'all';
  page?: number;
  size?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api';

  buyNow(listingId: number): Observable<MarketplaceOrder> {
    return this.http.post<MarketplaceOrder>(
      `${this.API_URL}/marketplace/listings/${listingId}/buy`,
      {}
    );
  }

  listMine(params?: OrderListParams): Observable<PagedOrders> {
    let httpParams = new HttpParams();
    if (params?.role) httpParams = httpParams.set('role', params.role);
    if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params?.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params?.sort) httpParams = httpParams.set('sort', params.sort);
    return this.http.get<PagedOrders>(`${this.API_URL}/marketplace/orders`, { params: httpParams });
  }

  get(id: number): Observable<MarketplaceOrder> {
    return this.http.get<MarketplaceOrder>(`${this.API_URL}/marketplace/orders/${id}`);
  }

  payWithWallet(id: number): Observable<MarketplaceOrder> {
    return this.http.post<MarketplaceOrder>(
      `${this.API_URL}/marketplace/orders/${id}/pay-wallet`,
      {}
    );
  }

  payWithZarinPal(id: number): Observable<OrderPayResponse> {
    return this.http.post<OrderPayResponse>(
      `${this.API_URL}/marketplace/orders/${id}/pay-zarinpal`,
      {}
    );
  }
}
