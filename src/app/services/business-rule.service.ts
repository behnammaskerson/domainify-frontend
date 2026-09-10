import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type BusinessRuleOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY'
  | 'IN'
  | 'NOT_IN';

export type BusinessRuleActionType =
  | 'SET_STATUS'
  | 'SET_PRIORITY'
  | 'ASSIGN_TO_USER'
  | 'ASSIGN_TO_QUEUE'
  | 'ADD_TAGS'
  | 'REMOVE_TAGS'
  | 'SET_CATEGORY'
  | 'ADD_INTERNAL_NOTE'
  | 'SEND_EMAIL_NOTIFICATION'
  | 'SEND_SMS_NOTIFICATION'
  | 'SET_DUE_DATE'
  | 'ESCALATE_TICKET';

export type BusinessRuleTrigger = 'ON_CREATE' | 'ON_UPDATE' | 'ON_REPLY' | 'ON_SCHEDULE';

export interface BusinessRuleCondition {
  field: string;
  operator: BusinessRuleOperator;
  value?: unknown;
}

export interface BusinessRuleAction {
  actionType: BusinessRuleActionType;
  parameters: Record<string, unknown>;
}

export interface BusinessRule {
  id?: number;
  name: string;
  description?: string;
  enabled: boolean;
  triggerEvent: BusinessRuleTrigger;
  priority: number;
  conditions: BusinessRuleCondition[];
  actions: BusinessRuleAction[];
  createdAt?: string;
  updatedAt?: string;
  lastExecutedAt?: string;
  executionCount?: number;
}

/** Matches Spring Data Page JSON. */
export interface PagedBusinessRules {
  content: BusinessRule[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty?: boolean;
}

export interface ConditionFieldOption {
  field: string;
  labelKey: string;
  type: 'text' | 'number' | 'select';
}

@Injectable({ providedIn: 'root' })
export class BusinessRuleService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly baseUrl = `${this.API_URL}/admin/business-rules`;

  getRules(page = 0, size = 20, sortBy = 'priority', sortDir = 'asc'): Observable<PagedBusinessRules> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);
    return this.http.get<PagedBusinessRules>(this.baseUrl, { params });
  }

  getRule(id: number): Observable<BusinessRule> {
    return this.http.get<BusinessRule>(`${this.baseUrl}/${id}`);
  }

  createRule(rule: BusinessRule): Observable<BusinessRule> {
    return this.http.post<BusinessRule>(this.baseUrl, rule);
  }

  updateRule(id: number, rule: BusinessRule): Observable<BusinessRule> {
    return this.http.put<BusinessRule>(`${this.baseUrl}/${id}`, rule);
  }

  deleteRule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  toggleRule(id: number, enabled: boolean): Observable<BusinessRule> {
    return this.http.patch<BusinessRule>(`${this.baseUrl}/${id}/toggle`, { enabled });
  }

  getConditionFields(): ConditionFieldOption[] {
    return [
      { field: 'status', labelKey: 'tickets.businessRules.fields.status', type: 'select' },
      { field: 'priority', labelKey: 'tickets.businessRules.fields.priority', type: 'select' },
      { field: 'assigneeEmail', labelKey: 'tickets.businessRules.fields.assigneeEmail', type: 'text' },
      { field: 'queueName', labelKey: 'tickets.businessRules.fields.queueName', type: 'text' },
      { field: 'categoryName', labelKey: 'tickets.businessRules.fields.categoryName', type: 'text' },
      { field: 'customerEmail', labelKey: 'tickets.businessRules.fields.customerEmail', type: 'text' },
      { field: 'subject', labelKey: 'tickets.businessRules.fields.subject', type: 'text' },
      { field: 'description', labelKey: 'tickets.businessRules.fields.description', type: 'text' },
      { field: 'tags', labelKey: 'tickets.businessRules.fields.tags', type: 'text' },
      { field: 'age', labelKey: 'tickets.businessRules.fields.age', type: 'number' }
    ];
  }

  getOperatorsForField(fieldType: string): { operator: BusinessRuleOperator; labelKey: string }[] {
    const text = [
      { operator: 'EQUALS' as const, labelKey: 'tickets.businessRules.operators.equals' },
      { operator: 'NOT_EQUALS' as const, labelKey: 'tickets.businessRules.operators.notEquals' },
      { operator: 'CONTAINS' as const, labelKey: 'tickets.businessRules.operators.contains' },
      { operator: 'NOT_CONTAINS' as const, labelKey: 'tickets.businessRules.operators.notContains' },
      { operator: 'STARTS_WITH' as const, labelKey: 'tickets.businessRules.operators.startsWith' },
      { operator: 'ENDS_WITH' as const, labelKey: 'tickets.businessRules.operators.endsWith' },
      { operator: 'IS_EMPTY' as const, labelKey: 'tickets.businessRules.operators.isEmpty' },
      { operator: 'IS_NOT_EMPTY' as const, labelKey: 'tickets.businessRules.operators.isNotEmpty' }
    ];
    const number = [
      { operator: 'EQUALS' as const, labelKey: 'tickets.businessRules.operators.equals' },
      { operator: 'NOT_EQUALS' as const, labelKey: 'tickets.businessRules.operators.notEquals' },
      { operator: 'GREATER_THAN' as const, labelKey: 'tickets.businessRules.operators.greaterThan' },
      { operator: 'LESS_THAN' as const, labelKey: 'tickets.businessRules.operators.lessThan' },
      { operator: 'GREATER_THAN_OR_EQUAL' as const, labelKey: 'tickets.businessRules.operators.gte' },
      { operator: 'LESS_THAN_OR_EQUAL' as const, labelKey: 'tickets.businessRules.operators.lte' }
    ];
    const select = [
      { operator: 'EQUALS' as const, labelKey: 'tickets.businessRules.operators.equals' },
      { operator: 'NOT_EQUALS' as const, labelKey: 'tickets.businessRules.operators.notEquals' }
    ];
    if (fieldType === 'number') return number;
    if (fieldType === 'select') return select;
    return text;
  }

  getActionTypes(): { type: BusinessRuleActionType; labelKey: string }[] {
    return [
      { type: 'SET_STATUS', labelKey: 'tickets.businessRules.actionTypes.setStatus' },
      { type: 'SET_PRIORITY', labelKey: 'tickets.businessRules.actionTypes.setPriority' },
      { type: 'ASSIGN_TO_USER', labelKey: 'tickets.businessRules.actionTypes.assignToUser' },
      { type: 'ADD_TAGS', labelKey: 'tickets.businessRules.actionTypes.addTags' },
      { type: 'ADD_INTERNAL_NOTE', labelKey: 'tickets.businessRules.actionTypes.addInternalNote' },
      { type: 'SET_DUE_DATE', labelKey: 'tickets.businessRules.actionTypes.setDueDate' }
    ];
  }
}
