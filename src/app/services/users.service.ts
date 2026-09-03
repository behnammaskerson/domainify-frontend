import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from './auth.service';

export interface ManagedUser extends User {
  enabled: boolean;
}

export interface PagedUsers {
  content: ManagedUser[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface UserListParams {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  enabled?: boolean;
  createMethod?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode?: string | null;
  phoneNumber?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api';

  list(params?: UserListParams): Observable<PagedUsers> {
    let httpParams = new HttpParams();
    if (params?.firstName) {
      httpParams = httpParams.set('firstName', params.firstName);
    }
    if (params?.lastName) {
      httpParams = httpParams.set('lastName', params.lastName);
    }
    if (params?.email) {
      httpParams = httpParams.set('email', params.email);
    }
    if (params?.role) {
      httpParams = httpParams.set('role', params.role);
    }
    if (params?.enabled != null) {
      httpParams = httpParams.set('enabled', String(params.enabled));
    }
    if (params?.createMethod) {
      httpParams = httpParams.set('createMethod', params.createMethod);
    }
    if (params?.createdFrom) {
      httpParams = httpParams.set('createdFrom', params.createdFrom);
    }
    if (params?.createdTo) {
      httpParams = httpParams.set('createdTo', params.createdTo);
    }
    httpParams = httpParams.set('page', String(params?.page ?? 0));
    httpParams = httpParams.set('size', String(params?.size ?? 10));
    if (params?.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    return this.http.get<PagedUsers>(`${this.API_URL}/users`, { params: httpParams });
  }

  getById(id: number): Observable<ManagedUser> {
    return this.http.get<ManagedUser>(`${this.API_URL}/users/${id}`);
  }

  create(payload: CreateUserPayload): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(`${this.API_URL}/users`, payload);
  }

  update(id: number, payload: UpdateUserPayload): Observable<ManagedUser> {
    return this.http.put<ManagedUser>(`${this.API_URL}/users/${id}`, payload);
  }

  setEnabled(id: number, enabled: boolean): Observable<ManagedUser> {
    return this.http.patch<ManagedUser>(`${this.API_URL}/users/${id}/enabled`, { enabled });
  }

  setRole(id: number, role: string): Observable<ManagedUser> {
    return this.http.patch<ManagedUser>(`${this.API_URL}/users/${id}/role`, { role });
  }

  setPassword(id: number, payload: { password: string; confirmPassword: string }): Observable<unknown> {
    return this.http.put(`${this.API_URL}/users/${id}/password`, payload);
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.API_URL}/users/${id}`);
  }

  getMe(): Observable<ManagedUser> {
    return this.http.get<ManagedUser>(`${this.API_URL}/users/me`);
  }

  updateMe(payload: UpdateProfilePayload): Observable<ManagedUser> {
    return this.http.put<ManagedUser>(`${this.API_URL}/users/me`, payload);
  }

  changePassword(payload: ChangePasswordPayload): Observable<unknown> {
    return this.http.put(`${this.API_URL}/users/me/password`, payload);
  }

  uploadAvatar(blob: Blob): Observable<ManagedUser> {
    const formData = new FormData();
    formData.append('file', blob, 'avatar.jpg');
    return this.http.post<ManagedUser>(`${this.API_URL}/users/me/avatar`, formData);
  }

  removeAvatar(): Observable<ManagedUser> {
    return this.http.delete<ManagedUser>(`${this.API_URL}/users/me/avatar`);
  }

  sendVerificationEmail(): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${this.API_URL}/users/me/send-verification-email`, {});
  }

  sendPhoneVerification(): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${this.API_URL}/users/me/send-phone-verification`, {});
  }

  verifyPhone(code: string): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/users/me/verify-phone`, { code });
  }

  resolveAvatarUrl(avatarUrl?: string | null): string | null {
    if (!avatarUrl) {
      return null;
    }
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    return `${this.API_URL}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
  }
}
