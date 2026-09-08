import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarketplaceOrder } from './orders.service';

export type DomainListingOfferStatus =
  | 'PENDING'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED';

export type OfferEventAction =
  | 'OFFER'
  | 'COUNTER'
  | 'ACCEPT'
  | 'REJECT'
  | 'WITHDRAW'
  | 'SYSTEM_REJECT'
  | 'EXPIRE';

export interface OfferEvent {
  id: number;
  actorId?: number | null;
  actorName?: string | null;
  action: OfferEventAction;
  amount?: number | null;
  message?: string | null;
  createdAt?: string;
}

export interface ListingOffer {
  id: number;
  listingId: number;
  domainId?: number | null;
  domainName?: string | null;
  askingPrice?: number | null;
  buyerId?: number | null;
  buyerName?: string | null;
  sellerId?: number | null;
  sellerName?: string | null;
  amount: number;
  message?: string | null;
  status: DomainListingOfferStatus;
  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string | null;
  events?: OfferEvent[];
}

export interface AcceptOfferResponse {
  offer: ListingOffer;
  order: MarketplaceOrder;
}

export interface PagedOffers {
  content: ListingOffer[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface UpsertOfferPayload {
  amount: number;
  message?: string;
}

export interface OfferListParams {
  status?: DomainListingOfferStatus;
  page?: number;
  size?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class OffersService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api';

  create(listingId: number, payload: UpsertOfferPayload): Observable<ListingOffer> {
    return this.http.post<ListingOffer>(
      `${this.API_URL}/marketplace/listings/${listingId}/offers`,
      payload
    );
  }

  listMine(params?: OfferListParams): Observable<PagedOffers> {
    return this.http.get<PagedOffers>(`${this.API_URL}/marketplace/offers/mine`, {
      params: this.toParams(params)
    });
  }

  listForListing(listingId: number, params?: OfferListParams): Observable<PagedOffers> {
    return this.http.get<PagedOffers>(`${this.API_URL}/listings/${listingId}/offers`, {
      params: this.toParams(params)
    });
  }

  get(id: number): Observable<ListingOffer> {
    return this.http.get<ListingOffer>(`${this.API_URL}/offers/${id}`);
  }

  counter(id: number, payload: UpsertOfferPayload): Observable<ListingOffer> {
    return this.http.post<ListingOffer>(`${this.API_URL}/offers/${id}/counter`, payload);
  }

  accept(id: number): Observable<AcceptOfferResponse> {
    return this.http.post<AcceptOfferResponse>(`${this.API_URL}/offers/${id}/accept`, {});
  }

  reject(id: number): Observable<ListingOffer> {
    return this.http.post<ListingOffer>(`${this.API_URL}/offers/${id}/reject`, {});
  }

  withdraw(id: number): Observable<ListingOffer> {
    return this.http.post<ListingOffer>(`${this.API_URL}/offers/${id}/withdraw`, {});
  }

  private toParams(params?: OfferListParams): HttpParams {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params?.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params?.sort) httpParams = httpParams.set('sort', params.sort);
    return httpParams;
  }
}
