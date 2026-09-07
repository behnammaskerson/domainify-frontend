import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type DomainListingStatus = 'ACTIVE' | 'INACTIVE' | 'SOLD';

export interface DomainListing {
  id: number;
  domainId: number;
  domainName: string;
  categoryId?: number | null;
  categoryName?: string | null;
  sellerId?: number | null;
  sellerName?: string | null;
  askingPrice: number;
  description?: string | null;
  status: DomainListingStatus;
  featured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PagedListings {
  content: DomainListing[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface UpsertListingPayload {
  domainId?: number;
  askingPrice: number;
  description?: string;
  featured?: boolean;
}

export interface MarketplaceListParams {
  q?: string;
  categoryId?: number;
  priceMin?: number;
  priceMax?: number;
  featured?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface MyListingsParams {
  q?: string;
  status?: DomainListingStatus;
  page?: number;
  size?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class ListingsService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api';

  listMine(params?: MyListingsParams): Observable<PagedListings> {
    let httpParams = new HttpParams();
    if (params?.q) httpParams = httpParams.set('q', params.q);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params?.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params?.sort) httpParams = httpParams.set('sort', params.sort);
    return this.http.get<PagedListings>(`${this.API_URL}/listings`, { params: httpParams });
  }

  getMine(id: number): Observable<DomainListing> {
    return this.http.get<DomainListing>(`${this.API_URL}/listings/${id}`);
  }

  getByDomain(domainId: number): Observable<DomainListing> {
    return this.http.get<DomainListing>(`${this.API_URL}/listings/by-domain/${domainId}`);
  }

  create(payload: UpsertListingPayload): Observable<DomainListing> {
    return this.http.post<DomainListing>(`${this.API_URL}/listings`, payload);
  }

  update(id: number, payload: UpsertListingPayload): Observable<DomainListing> {
    return this.http.put<DomainListing>(`${this.API_URL}/listings/${id}`, payload);
  }

  deactivate(id: number): Observable<DomainListing> {
    return this.http.post<DomainListing>(`${this.API_URL}/listings/${id}/deactivate`, {});
  }

  activate(id: number): Observable<DomainListing> {
    return this.http.post<DomainListing>(`${this.API_URL}/listings/${id}/activate`, {});
  }

  browseMarketplace(params?: MarketplaceListParams): Observable<PagedListings> {
    let httpParams = new HttpParams();
    if (params?.q) httpParams = httpParams.set('q', params.q);
    if (params?.categoryId != null) httpParams = httpParams.set('categoryId', String(params.categoryId));
    if (params?.priceMin != null) httpParams = httpParams.set('priceMin', String(params.priceMin));
    if (params?.priceMax != null) httpParams = httpParams.set('priceMax', String(params.priceMax));
    if (params?.featured != null) httpParams = httpParams.set('featured', String(params.featured));
    if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params?.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params?.sort) httpParams = httpParams.set('sort', params.sort);
    return this.http.get<PagedListings>(`${this.API_URL}/marketplace/listings`, { params: httpParams });
  }

  getPublic(id: number): Observable<DomainListing> {
    return this.http.get<DomainListing>(`${this.API_URL}/marketplace/listings/${id}`);
  }
}
