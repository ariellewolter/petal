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
  priority = 'med'
}) {
  const onClickAttr = onClick ? `data-action="${escapeHtml(onClick)}"` : '';
  const dataAttrs = id ? `data-id="${escapeHtml(id)}"` : '';
  
  return `
    <div 
      class="card prio-${priority} ${selected ? 'selected' : ''} ${className}"
      ${dataAttrs}
      ${onClickAttr}
    >
      ${title ? `
        <div class="card-header">
          <div class="card-title">${escapeHtml(title)}</div>
          ${subtitle ? `<div class="card-subtitle">${escapeHtml(subtitle)}</div>` : ''}
        </div>
      ` : ''}
      ${content ? `<div class="card-content">${content}</div>` : ''}
      ${footer ? `<div class="card-footer">${footer}</div>` : ''}
    </div>
  `;
}
