import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface KbCategory {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  parentId?: number | null;
  parentName?: string | null;
  active: boolean;
  sortOrder: number;
  depth?: number;
  articleCount?: number;
  children?: KbCategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface KbArticle {
  id?: number;
  slug: string;
  title: string;
  summary?: string | null;
  body?: string;
  locale: string;
  categoryId: number;
  categoryCode?: string;
  categoryName?: string;
  published: boolean;
  sortOrder: number;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PagedKbArticles {
  content: KbArticle[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface KbCategoryRequest {
  code: string;
  name: string;
  description?: string | null;
  parentId?: number | null;
  active: boolean;
  sortOrder: number;
}

export interface KbArticleRequest {
  slug: string;
  title: string;
  summary?: string | null;
  body: string;
  locale: string;
  categoryId: number;
  published: boolean;
  sortOrder: number;
}

@Injectable({ providedIn: 'root' })
export class KnowledgeBaseService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api';

  // —— Admin ——
  listAdminCategories(opts: { flat?: boolean; activeOnly?: boolean } = {}): Observable<KbCategory[]> {
    let params = new HttpParams()
      .set('flat', String(opts.flat ?? true))
      .set('activeOnly', String(opts.activeOnly ?? false));
    return this.http.get<KbCategory[]>(`${this.API_URL}/admin/kb/categories`, { params });
  }

  createCategory(payload: KbCategoryRequest): Observable<KbCategory> {
    return this.http.post<KbCategory>(`${this.API_URL}/admin/kb/categories`, payload);
  }

  updateCategory(id: number, payload: KbCategoryRequest): Observable<KbCategory> {
    return this.http.put<KbCategory>(`${this.API_URL}/admin/kb/categories/${id}`, payload);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/kb/categories/${id}`);
  }

  listAdminArticles(opts: {
    q?: string;
    categoryId?: number | null;
    locale?: string | null;
    published?: boolean | null;
    page?: number;
    size?: number;
  } = {}): Observable<PagedKbArticles> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 0))
      .set('size', String(opts.size ?? 20));
    if (opts.q?.trim()) params = params.set('q', opts.q.trim());
    if (opts.categoryId != null) params = params.set('categoryId', String(opts.categoryId));
    if (opts.locale) params = params.set('locale', opts.locale);
    if (opts.published != null) params = params.set('published', String(opts.published));
    return this.http.get<PagedKbArticles>(`${this.API_URL}/admin/kb/articles`, { params });
  }

  getAdminArticle(id: number): Observable<KbArticle> {
    return this.http.get<KbArticle>(`${this.API_URL}/admin/kb/articles/${id}`);
  }

  createArticle(payload: KbArticleRequest): Observable<KbArticle> {
    return this.http.post<KbArticle>(`${this.API_URL}/admin/kb/articles`, payload);
  }

  updateArticle(id: number, payload: KbArticleRequest): Observable<KbArticle> {
    return this.http.put<KbArticle>(`${this.API_URL}/admin/kb/articles/${id}`, payload);
  }

  deleteArticle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/kb/articles/${id}`);
  }

  // —— Public ——
  listPublicCategories(locale?: string): Observable<KbCategory[]> {
    let params = new HttpParams();
    if (locale) params = params.set('locale', locale);
    return this.http.get<KbCategory[]>(`${this.API_URL}/public/kb/categories`, { params });
  }

  searchPublicArticles(opts: {
    q?: string;
    categoryId?: number | null;
    locale?: string;
    page?: number;
    size?: number;
  } = {}): Observable<PagedKbArticles> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 0))
      .set('size', String(opts.size ?? 20));
    if (opts.q?.trim()) params = params.set('q', opts.q.trim());
    if (opts.categoryId != null) params = params.set('categoryId', String(opts.categoryId));
    if (opts.locale) params = params.set('locale', opts.locale);
    return this.http.get<PagedKbArticles>(`${this.API_URL}/public/kb/articles`, { params });
  }

  getPublicArticleBySlug(slug: string, locale?: string): Observable<KbArticle> {
    let params = new HttpParams();
    if (locale) params = params.set('locale', locale);
    return this.http.get<KbArticle>(`${this.API_URL}/public/kb/articles/by-slug/${encodeURIComponent(slug)}`, {
      params
    });
  }

  suggest(q: string, locale?: string, limit = 5): Observable<KbArticle[]> {
    let params = new HttpParams().set('q', q).set('limit', String(limit));
    if (locale) params = params.set('locale', locale);
    return this.http.get<KbArticle[]>(`${this.API_URL}/public/kb/suggest`, { params });
  }
}
