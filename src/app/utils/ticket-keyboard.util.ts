/** Helpers for admin ticket keyboard shortcuts. */

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return !!target.closest(
    'input, textarea, select, [contenteditable="true"], .md-textarea'
  );
}

export function isPlainLetterKey(event: KeyboardEvent, letter: string): boolean {
  return (
    event.key.toLowerCase() === letter.toLowerCase()
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
    && !event.shiftKey
  );
}

export function isModEnter(event: KeyboardEvent): boolean {
  return event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.altKey;
}

export function hasOpenMaterialOverlay(): boolean {
  return !!document.querySelector(
    '.cdk-overlay-container .cdk-overlay-pane:not([style*="pointer-events: none"])'
  );
}

export type TicketShortcutScope = 'inbox' | 'detail';

export interface TicketShortcutHelpItem {
  keys: string;
  actionKey: string;
}

export interface TicketShortcutHelpGroup {
  titleKey: string;
  items: TicketShortcutHelpItem[];
}

export function ticketShortcutHelpGroups(scope: TicketShortcutScope): TicketShortcutHelpGroup[] {
  const shared: TicketShortcutHelpGroup = {
    titleKey: 'tickets.shortcuts.groups.common',
    items: [
      { keys: '?', actionKey: 'tickets.shortcuts.actions.help' }
    ]
  };

  if (scope === 'inbox') {
    return [
      shared,
      {
        titleKey: 'tickets.shortcuts.groups.inbox',
        items: [
          { keys: '/', actionKey: 'tickets.shortcuts.actions.focusSearch' },
          { keys: 'r', actionKey: 'tickets.shortcuts.actions.refresh' },
          { keys: 'f', actionKey: 'tickets.shortcuts.actions.toggleFilters' },
          { keys: 'j / k', actionKey: 'tickets.shortcuts.actions.moveFocus' },
          { keys: 'x', actionKey: 'tickets.shortcuts.actions.toggleSelect' },
          { keys: 'Shift+A', actionKey: 'tickets.shortcuts.actions.selectAllPage' },
          { keys: 'Enter / o', actionKey: 'tickets.shortcuts.actions.openTicket' },
          { keys: 'Shift+C', actionKey: 'tickets.shortcuts.actions.bulkClose' },
          { keys: '1–9 / 0', actionKey: 'tickets.shortcuts.actions.switchView' },
          { keys: 'Esc', actionKey: 'tickets.shortcuts.actions.clearOrClose' }
        ]
      }
    ];
  }

  return [
    shared,
    {
      titleKey: 'tickets.shortcuts.groups.detail',
      items: [
        { keys: 'r', actionKey: 'tickets.shortcuts.actions.focusReply' },
        { keys: 'Ctrl+Enter', actionKey: 'tickets.shortcuts.actions.sendReply' },
        { keys: 'i', actionKey: 'tickets.shortcuts.actions.toggleInternalNote' },
        { keys: 'a', actionKey: 'tickets.shortcuts.actions.assignToMe' },
        { keys: 'w', actionKey: 'tickets.shortcuts.actions.toggleWatch' },
        { keys: 'c', actionKey: 'tickets.shortcuts.actions.closeTicket' },
        { keys: 'Shift+R', actionKey: 'tickets.shortcuts.actions.reopenTicket' },
        { keys: 't', actionKey: 'tickets.shortcuts.actions.transfer' },
        { keys: 'e', actionKey: 'tickets.shortcuts.actions.escalate' },
        { keys: 'm', actionKey: 'tickets.shortcuts.actions.merge' },
        { keys: 's', actionKey: 'tickets.shortcuts.actions.split' },
        { keys: 'd', actionKey: 'tickets.shortcuts.actions.clone' },
        { keys: 'l', actionKey: 'tickets.shortcuts.actions.linkRelated' },
        { keys: 'Esc', actionKey: 'tickets.shortcuts.actions.backInbox' }
      ]
    }
  ];
}
