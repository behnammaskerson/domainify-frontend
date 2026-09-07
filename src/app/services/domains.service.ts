import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type DomainStatus = 'ACTIVE' | 'PENDING' | 'SOLD' | 'EXPIRED';
export type DomainOwnershipStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED';
export type DomainOwnershipMethod = 'DNS_TXT' | 'HTTP_FILE';
export type DomainExpirySource = 'MANUAL' | 'REGISTRAR';

export interface DomainItem {
  id: number;
  name: string;
  status: DomainStatus;
  categoryId: number;
  categoryCode?: string;
  categoryName?: string;
  price: number;
  expiresAt?: string | null;
  expiresSource?: DomainExpirySource | null;
  expiresCheckedAt?: string | null;
  expiresRegistrar?: string | null;
  customRenewalWindows?: boolean;
  renewalWindows?: string | null;
  renewalWindowsParsed?: number[];
  ownershipStatus?: DomainOwnershipStatus;
  ownershipMethod?: DomainOwnershipMethod | null;
  ownershipVerifiedAt?: string | null;
  ownershipTokenExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DomainRegistrarExpiry {
  domainName: string;
  expiresAt: string;
  registrar?: string | null;
  rdapUrl?: string | null;
  checkedAt?: string | null;
}

export interface DomainWhois {
  domainName: string;
  ldhName?: string | null;
  unicodeName?: string | null;
  statuses?: string[];
  registeredAt?: string | null;
  updatedAt?: string | null;
  expiresAt?: string | null;
  registrar?: string | null;
  registrarIanaId?: string | null;
  registrarUrl?: string | null;
  registrarEmail?: string | null;
  registrantName?: string | null;
  registrantOrganization?: string | null;
  registrantCountry?: string | null;
  registrantEmail?: string | null;
  nameServers?: string[];
  dnssecSigned?: boolean;
  rdapUrl?: string | null;
  checkedAt?: string | null;
  available?: boolean;
}

export interface DomainOwnershipChallenge {
  domainId: number;
  domainName: string;
  ownershipStatus: DomainOwnershipStatus;
  method: DomainOwnershipMethod;
  token: string;
  tokenExpiresAt?: string | null;
  dnsHost?: string | null;
  dnsType?: string | null;
  dnsValue?: string | null;
  httpUrl?: string | null;
  httpBody?: string | null;
}

export interface DomainCategory {
  id: number;
  code: string;
  name: string;
  parentId?: number | null;
  parentName?: string | null;
  active: boolean;
  sortOrder: number;
  depth: number;
  children?: DomainCategory[];
}

export interface DomainCategoryPayload {
  name: string;
  code?: string;
  parentId?: number | null;
  active?: boolean;
  sortOrder?: number;
}

export interface PagedDomains {
  content: DomainItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface DomainListParams {
  q?: string;
  status?: DomainStatus;
  categoryId?: number;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface UpsertDomainPayload {
  name: string;
  status: DomainStatus;
  categoryId: number;
  price: number;
  expiresAt?: string | null;
  expiresSource?: DomainExpirySource | null;
  expiresRegistrar?: string | null;
  /** null = use global admin windows; non-empty = custom */
  renewalWindows?: number[] | null;
}

export interface DomainStatusCounts {
  all: number;
  byStatus: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class DomainsService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api';

  list(params?: DomainListParams): Observable<PagedDomains> {
    let httpParams = new HttpParams();
    if (params?.q) httpParams = httpParams.set('q', params.q);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.categoryId != null) httpParams = httpParams.set('categoryId', String(params.categoryId));
    if (params?.priceMin != null) httpParams = httpParams.set('priceMin', String(params.priceMin));
    if (params?.priceMax != null) httpParams = httpParams.set('priceMax', String(params.priceMax));
    if (params?.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params?.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params?.sort) httpParams = httpParams.set('sort', params.sort);
    return this.http.get<PagedDomains>(`${this.API_URL}/domains`, { params: httpParams });
  }

  statusCounts(): Observable<DomainStatusCounts> {
    return this.http.get<DomainStatusCounts>(`${this.API_URL}/domains/status-counts`);
  }

  get(id: number): Observable<DomainItem> {
    return this.http.get<DomainItem>(`${this.API_URL}/domains/${id}`);
  }

  create(payload: UpsertDomainPayload): Observable<DomainItem> {
    return this.http.post<DomainItem>(`${this.API_URL}/domains`, payload);
  }

  update(id: number, payload: UpsertDomainPayload): Observable<DomainItem> {
    return this.http.put<DomainItem>(`${this.API_URL}/domains/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/domains/${id}`);
  }

  lookupRegistrarExpiry(name: string): Observable<DomainRegistrarExpiry> {
    const params = new HttpParams().set('name', name.trim().toLowerCase());
    return this.http.get<DomainRegistrarExpiry>(`${this.API_URL}/domains/registrar-expiry`, { params });
  }

  lookupWhois(name: string): Observable<DomainWhois> {
    const params = new HttpParams().set('name', name.trim().toLowerCase());
    return this.http.get<DomainWhois>(`${this.API_URL}/domains/whois`, { params });
  }

  lookupWhoisForDomain(id: number): Observable<DomainWhois> {
    return this.http.get<DomainWhois>(`${this.API_URL}/domains/${id}/whois`);
  }

  refreshExpiryFromRegistrar(id: number): Observable<DomainItem> {
    return this.http.post<DomainItem>(`${this.API_URL}/domains/${id}/expiry/refresh`, {});
  }

  startOwnership(id: number, method: DomainOwnershipMethod): Observable<DomainOwnershipChallenge> {
    return this.http.post<DomainOwnershipChallenge>(`${this.API_URL}/domains/${id}/ownership/start`, { method });
  }

  getOwnershipChallenge(id: number): Observable<DomainOwnershipChallenge> {
    return this.http.get<DomainOwnershipChallenge>(`${this.API_URL}/domains/${id}/ownership`);
  }

  checkOwnership(id: number): Observable<DomainItem> {
    return this.http.post<DomainItem>(`${this.API_URL}/domains/${id}/ownership/check`, {});
  }

  cancelOwnership(id: number): Observable<DomainItem> {
    return this.http.post<DomainItem>(`${this.API_URL}/domains/${id}/ownership/cancel`, {});
  }

  listActiveCategoriesFlat(): Observable<DomainCategory[]> {
    return this.http.get<DomainCategory[]>(`${this.API_URL}/domain-categories`);
  }

  listActiveCategoriesTree(): Observable<DomainCategory[]> {
    return this.http.get<DomainCategory[]>(`${this.API_URL}/domain-categories/tree`);
  }

  listAdminCategoriesFlat(activeOnly = false): Observable<DomainCategory[]> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return this.http.get<DomainCategory[]>(`${this.API_URL}/admin/domain-categories`, { params });
  }

  listAdminCategoriesTree(activeOnly = false): Observable<DomainCategory[]> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return this.http.get<DomainCategory[]>(`${this.API_URL}/admin/domain-categories/tree`, { params });
  }

  createCategory(payload: DomainCategoryPayload): Observable<DomainCategory> {
    return this.http.post<DomainCategory>(`${this.API_URL}/admin/domain-categories`, payload);
  }

  updateCategory(id: number, payload: DomainCategoryPayload): Observable<DomainCategory> {
    return this.http.put<DomainCategory>(`${this.API_URL}/admin/domain-categories/${id}`, payload);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/domain-categories/${id}`);
  }
}
