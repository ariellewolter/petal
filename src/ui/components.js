// ═══════════════════════ SHARED UI COMPONENTS ═══════════════════════
// Reusable components for consistent UI across all pages

import { escapeHtml } from '../utils/strings.js';

/**
 * Standard button components
 */
export const Buttons = {
  /**
   * Create a primary action button
   * @param {Object} options - Button options
   * @param {string} options.text - Button text
   * @param {string} options.action - Data action attribute
   * @param {string} options.id - Optional ID
   * @param {string} options.className - Additional classes
   * @param {Object} options.dataAttrs - Additional data attributes
   */
  primary({ text, action, id = '', className = '', dataAttrs = {} }) {
    const dataAttrsStr = Object.entries(dataAttrs)
      .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
      .join(' ');
    return `
      <button 
        class="btn-primary ${className}" 
        ${id ? `id="${id}"` : ''}
        data-action="${escapeHtml(action)}"
        ${dataAttrsStr}
      >
        ${escapeHtml(text)}
      </button>
    `;
  },

  /**
   * Create a secondary/ghost button
   */
  secondary({ text, action, id = '', className = '', dataAttrs = {} }) {
    const dataAttrsStr = Object.entries(dataAttrs)
      .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
      .join(' ');
    return `
      <button 
        class="btn-secondary ${className}" 
        ${id ? `id="${id}"` : ''}
        data-action="${escapeHtml(action)}"
        ${dataAttrsStr}
      >
        ${escapeHtml(text)}
      </button>
    `;
  },

  /**
   * Create an icon button
   */
  icon({ icon, action, id = '', className = '', title = '', dataAttrs = {} }) {
    const dataAttrsStr = Object.entries(dataAttrs)
      .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
      .join(' ');
    return `
      <button 
        class="btn-icon ${className}" 
        ${id ? `id="${id}"` : ''}
        data-action="${escapeHtml(action)}"
        ${title ? `title="${escapeHtml(title)}"` : ''}
        ${dataAttrsStr}
      >
        ${escapeHtml(icon)}
      </button>
    `;
  }
};

/**
 * Standard empty state component
 */
export function EmptyState({ icon = '📝', message, subtitle = '', action = null }) {
  const actionButton = action 
    ? Buttons.primary({ text: action.text, action: action.action, ...action.dataAttrs || {} })
    : '';
  
  return `
    <div class="empty-state">
      <div class="empty-icon">${escapeHtml(icon)}</div>
      <div class="empty-message">${escapeHtml(message)}</div>
      ${subtitle ? `<div class="empty-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      ${actionButton ? `<div style="margin-top: 20px;">${actionButton}</div>` : ''}
    </div>
  `;
}

/**
 * Standard page header component
 */
export function PageHeader({ title, icon = '', status = '', actions = [] }) {
  const actionsHtml = actions.length > 0
    ? `<div class="page-header-actions">${actions.map(a => {
        if (a.type === 'primary') return Buttons.primary(a);
        if (a.type === 'secondary') return Buttons.secondary(a);
        if (a.type === 'icon') return Buttons.icon(a);
        return '';
      }).join('')}</div>`
    : '';
  
  return `
    <header class="page-header">
      <div class="page-header-title">
        ${icon ? `<div class="page-header-icon">${escapeHtml(icon)}</div>` : ''}
        <span class="page-header-name">${escapeHtml(title)}</span>
      </div>
      <div class="page-header-right">
        ${status ? `<span class="page-header-status">${escapeHtml(status)}</span>` : ''}
        ${actionsHtml}
      </div>
    </header>
  `;
}

/**
 * Standard stat card component
 */
export function StatCard({ label, value, subtitle = '', variant = 1 }) {
  return `
    <div class="stat-card stat-${variant}">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value">${escapeHtml(value)}</div>
      ${subtitle ? `<div class="stat-sub">${escapeHtml(subtitle)}</div>` : ''}
    </div>
  `;
}

/**
 * Standard tabs component
 */
export function Tabs({ tabs, activeTab, containerId = '' }) {
  return `
    <div class="tabs" ${containerId ? `id="${containerId}"` : ''}>
      ${tabs.map(tab => `
        <button 
          class="tab ${tab.id === activeTab ? 'active' : ''}" 
          data-action="switch-tab" 
          data-tab="${escapeHtml(tab.id)}"
        >
          ${escapeHtml(tab.label)}
        </button>
      `).join('')}
    </div>
  `;
}

/**
 * Standard modal component
 */
export function Modal({ id, title, body, footer, onCloseAction = 'close-modal' }) {
  return `
    <div class="modal-backdrop" id="${id}-backdrop" data-action="close-modal-backdrop">
      <div class="modal" id="${id}">
        <div class="modal-head">
          <div class="modal-title">${escapeHtml(title)}</div>
          <button class="modal-close" data-action="${escapeHtml(onCloseAction)}">✕</button>
        </div>
        <div class="modal-body" id="${id}-body">
          ${body}
        </div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Standard form field component
 */
export function FormField({ 
  label, 
  type = 'text', 
  id, 
  name, 
  placeholder = '', 
  value = '', 
  required = false,
  options = [],
  fullWidth = false 
}) {
  const fieldId = id || name;
  const inputClass = `form-input ${fullWidth ? 'full' : ''}`;
  
  let inputElement = '';
  if (type === 'select') {
    inputElement = `
      <select class="${inputClass}" id="${fieldId}" name="${name}" ${required ? 'required' : ''}>
        ${options.map(opt => {
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const selected = value === optValue ? 'selected' : '';
          return `<option value="${escapeHtml(optValue)}" ${selected}>${escapeHtml(optLabel)}</option>`;
        }).join('')}
      </select>
    `;
  } else if (type === 'textarea') {
    inputElement = `
      <textarea 
        class="${inputClass}" 
        id="${fieldId}" 
        name="${name}" 
        placeholder="${escapeHtml(placeholder)}"
        ${required ? 'required' : ''}
      >${escapeHtml(value)}</textarea>
    `;
  } else {
    inputElement = `
      <input 
        type="${escapeHtml(type)}" 
        class="${inputClass}" 
        id="${fieldId}" 
        name="${name}" 
        placeholder="${escapeHtml(placeholder)}"
        value="${escapeHtml(value)}"
        ${required ? 'required' : ''}
      >
    `;
  }
  
  return `
    <div class="form-group ${fullWidth ? 'full' : ''}">
      <label class="form-label" for="${fieldId}">${escapeHtml(label)}</label>
      ${inputElement}
    </div>
  `;
}

/**
 * Standard card component
 * Enhanced with header actions, badges, and flexible patterns
 */
export function Card({ 
  id, 
  title, 
  subtitle = '', 
  content, 
  footer = '', 
  selected = false,
  onClick = null,
  className = '',
  priority = 'med',
  headerActions = [],
  badges = [],
  icon = '',
  variant = 'default' // 'default', 'task', 'project', 'file'
}) {
  const onClickAttr = onClick ? `data-action="${escapeHtml(onClick)}"` : '';
  const dataAttrs = id ? `data-id="${escapeHtml(id)}"` : '';
  
  const headerActionsHtml = headerActions.length > 0
    ? `<div class="card-header-actions">${headerActions.map(action => {
        if (typeof action === 'string') {
          // Simple icon button
          return Buttons.icon({ icon: action, action: 'card-action' });
        }
        return Buttons.icon(action);
      }).join('')}</div>`
    : '';
  
  const badgesHtml = badges.length > 0
    ? `<div class="card-badges">${badges.map(badge => {
        const badgeText = typeof badge === 'string' ? badge : badge.text;
        const badgeClass = typeof badge === 'string' ? '' : badge.class || '';
        return `<span class="card-badge ${badgeClass}">${escapeHtml(badgeText)}</span>`;
      }).join('')}</div>`
    : '';
  
  return `
    <div 
      class="card card-${variant} prio-${priority} ${selected ? 'selected' : ''} ${className}"
      ${dataAttrs}
      ${onClickAttr}
    >
      ${title || icon || headerActionsHtml || badgesHtml ? `
        <div class="card-header">
          <div class="card-header-left">
            ${icon ? `<div class="card-icon">${escapeHtml(icon)}</div>` : ''}
            <div class="card-title-wrap">
              ${title ? `<div class="card-title">${escapeHtml(title)}</div>` : ''}
              ${subtitle ? `<div class="card-subtitle">${escapeHtml(subtitle)}</div>` : ''}
              ${badgesHtml}
            </div>
          </div>
          ${headerActionsHtml}
        </div>
      ` : ''}
      ${content ? `<div class="card-content">${content}</div>` : ''}
      ${footer ? `<div class="card-footer">${footer}</div>` : ''}
    </div>
  `;
}

/**
 * Form utilities for consistent form layouts
 */
export const Forms = {
  /**
   * Create a form row (for side-by-side fields)
   */
  row(fields) {
    return `
      <div class="form-row">
        ${fields.map(field => FormField(field)).join('')}
      </div>
    `;
  },
  
  /**
   * Create form actions (buttons at bottom of form)
   */
  actions({ primary, secondary = [], cancel = null }) {
    const cancelBtn = cancel 
      ? Buttons.secondary({ text: cancel.text || 'Cancel', action: cancel.action || 'cancel' })
      : '';
    const secondaryBtns = secondary.map(btn => Buttons.secondary(btn)).join('');
    const primaryBtn = primary ? Buttons.primary(primary) : '';
    
    return `
      <div class="form-actions">
        ${cancelBtn}
        ${secondaryBtns}
        ${primaryBtn}
      </div>
    `;
  },
  
  /**
   * Create a form card wrapper
   */
  card({ title, subtitle = '', children, className = '' }) {
    return `
      <div class="form-card ${className}">
        ${title ? `<div class="form-title">${escapeHtml(title)}</div>` : ''}
        ${subtitle ? `<div class="form-subtitle">${escapeHtml(subtitle)}</div>` : ''}
        ${children}
      </div>
    `;
  },
  
  /**
   * Create a form group (for grouping related fields)
   */
  group({ label, children, className = '' }) {
    return `
      <div class="form-group-wrapper ${className}">
        ${label ? `<div class="form-group-label">${escapeHtml(label)}</div>` : ''}
        <div class="form-group-fields">
          ${children}
        </div>
      </div>
    `;
  }
};

/**
 * Loading state component
 */
export function LoadingState({ message = 'Loading...', size = 'medium' }) {
  const sizeClass = size === 'small' ? 'loading-small' : size === 'large' ? 'loading-large' : '';
  return `
    <div class="loading-state ${sizeClass}">
      <div class="loading-spinner"></div>
      <div class="loading-message">${escapeHtml(message)}</div>
    </div>
  `;
}

/**
 * Notification/Toast system
 * Usage: Call showNotification() to display a toast
 */
let notificationContainer = null;
let notificationTimeout = null;

function ensureNotificationContainer() {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
  return notificationContainer;
}

/**
 * Show a notification toast
 * @param {Object} options - Notification options
 * @param {string} options.message - Message to display
 * @param {string} options.type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} options.duration - Duration in ms (default: 3000)
 */
export function showNotification({ message, type = 'info', duration = 3000 }) {
  ensureNotificationContainer();
  
  // Clear any existing notification
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">${getNotificationIcon(type)}</div>
      <div class="notification-message">${escapeHtml(message)}</div>
      <button class="notification-close" data-action="close-notification">✕</button>
    </div>
  `;
  
  // Add to container
  notificationContainer.innerHTML = '';
  notificationContainer.appendChild(notification);
  notificationContainer.classList.add('active');
  
  // Auto-dismiss
  notificationTimeout = setTimeout(() => {
    dismissNotification();
  }, duration);
  
  // Close button handler
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', dismissNotification);
  }
  
  // Click anywhere to dismiss
  notification.addEventListener('click', dismissNotification);
}

function dismissNotification() {
  if (notificationContainer) {
    notificationContainer.classList.remove('active');
    setTimeout(() => {
      if (notificationContainer) {
        notificationContainer.innerHTML = '';
      }
    }, 300); // Wait for animation
  }
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }
}

function getNotificationIcon(type) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  return icons[type] || icons.info;
}
