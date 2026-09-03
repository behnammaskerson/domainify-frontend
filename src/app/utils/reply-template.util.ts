export interface ReplyTemplateVariables {
  name?: string;
  ticketId?: string;
  domain?: string;
}

const VARIABLE_PATTERN = /\{\{\s*(name|ticketId|domain)\s*\}\}/gi;

export function renderReplyTemplate(body: string, vars: ReplyTemplateVariables): string {
  return body.replace(VARIABLE_PATTERN, (_match, key: string) => {
    const normalized = key.toLowerCase();
    if (normalized === 'name') {
      return vars.name?.trim() || '';
    }
    if (normalized === 'ticketid') {
      return vars.ticketId?.trim() || '';
    }
    if (normalized === 'domain') {
      return vars.domain?.trim() || '';
    }
    return '';
  });
}

export function toMentionHandle(displayName: string): string {
  if (!displayName?.trim()) {
    return '';
  }
  return displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
}
