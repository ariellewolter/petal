# New Page Integration Template

This guide provides a complete template for creating a new integrated page in the app, following the established patterns and architecture.

## Overview

Each page in the app follows a consistent structure:
- **Page Module** (`src/pages/YourPage.js`) - Contains the page logic and rendering
- **Page Registry** (`src/app/pages.js`) - Registers the page renderer
- **View Container** (`tasklist.html`) - HTML container for the page
- **Sidebar Navigation** (`src/app/viewManager.js`) - Adds navigation link
- **CSS Styling** (`src/styles/main.css`) - Base styles for view containers

---

## Step 1: Create the Page Module

Create a new file: `src/pages/YourPage.js`

### Basic Structure

```javascript
// ═══════════════════════ YOUR PAGE ═══════════════════════
// Your page description with event delegation

import { escapeHtml } from '../utils/strings.js';

// State
let yourData = [];
let currentTab = 'default';
let selectedItemId = null;
let stylesInjected = false;
let bound = false;

/**
 * Inject scoped CSS styles (only once)
 */
function injectStyles() {
  if (stylesInjected) return;
  
  const styleId = 'your-page-styles';
  if (document.getElementById(styleId)) {
    stylesInjected = true;
    return;
  }
  
  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    /* ── YOUR PAGE STYLES ── */
    #view-your-page {
      grid-column: 2 !important;
      grid-row: 1 !important;
      position: relative !important;
      top: 0 !important;
      left: 0 !important;
      margin: 0 !important;
      padding: 82px 36px 100px !important;
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      min-width: 0 !important;
      height: 100vh !important;
      padding-top: 82px !important;
    }

    /* Page Header */
    #view-your-page .your-page-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 0 28px;
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10;
    }
    #view-your-page .your-page-header-title {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    #view-your-page .your-page-header-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      font-weight: 300;
      font-style: italic;
    }
    #view-your-page .your-page-header-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    #view-your-page .your-page-header-status {
      font-size: 11px;
      color: var(--text-dim);
    }

    /* Main Content Area */
    #view-your-page .your-content {
      margin-top: 74px;
    }
    #view-your-page .your-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 32px;
      font-weight: 400;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }
    #view-your-page .your-title-icon {
      width: 40px;
      height: 40px;
      background: var(--rose-pale);
      border: 1px solid var(--rose-soft);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: var(--rose);
    }

    /* Tabs */
    #view-your-page .your-tabs {
      display: flex;
      gap: 2px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 4px;
      flex-wrap: wrap;
      margin-bottom: 28px;
    }
    #view-your-page .your-tab {
      background: none;
      border: none;
      border-radius: 7px;
      color: var(--text-dim);
      font-family: 'Jost', sans-serif;
      font-size: 11px;
      font-weight: 400;
      letter-spacing: .12em;
      text-transform: uppercase;
      padding: 6px 16px;
      cursor: pointer;
      transition: all .18s;
      white-space: nowrap;
    }
    #view-your-page .your-tab.active {
      background: var(--rose-pale);
      color: var(--rose);
    }
    #view-your-page .your-tab:hover:not(.active) {
      color: var(--text);
    }

    /* Action Button */
    #view-your-page .your-add-btn {
      background: linear-gradient(135deg, #d4a0a0 0%, #c98b8b 100%);
      border: none;
      border-radius: 8px;
      color: white;
      font-family: 'Jost', sans-serif;
      font-size: 12px;
      font-weight: 400;
      letter-spacing: .1em;
      text-transform: uppercase;
      padding: 8px 18px;
      cursor: pointer;
      transition: all .2s;
      box-shadow: 0 2px 8px rgba(201, 139, 139, .2);
    }
    #view-your-page .your-add-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(201, 139, 139, .3);
    }

    /* Stats Cards */
    #view-your-page .your-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    #view-your-page .your-stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
      position: relative;
      overflow: hidden;
    }
    #view-your-page .your-stat-card::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
    }
    #view-your-page .your-stat-card.stat-1::after { background: var(--rose); }
    #view-your-page .your-stat-card.stat-2::after { background: var(--sage); }
    #view-your-page .your-stat-card.stat-3::after { background: var(--mauve); }
    #view-your-page .your-stat-label {
      font-size: 9px;
      letter-spacing: .14em;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-bottom: 8px;
    }
    #view-your-page .your-stat-value {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      font-weight: 400;
      line-height: 1;
      color: var(--text);
    }
    #view-your-page .your-stat-sub {
      font-size: 10px;
      color: var(--text-dim);
      margin-top: 4px;
    }

    /* Grid Layout */
    #view-your-page .your-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 24px;
    }
    #view-your-page .your-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      cursor: pointer;
      transition: all .2s;
      position: relative;
      overflow: hidden;
      animation: fadeSlide .3s ease both;
    }
    #view-your-page .your-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 16px 0 0 16px;
    }
    #view-your-page .your-card.prio-high::before { background: var(--rose); }
    #view-your-page .your-card.prio-med::before { background: var(--rose-soft); }
    #view-your-page .your-card.prio-low::before { background: var(--sage); }
    #view-your-page .your-card:hover {
      box-shadow: 0 4px 24px rgba(160, 110, 100, .1);
      transform: translateY(-2px);
    }
    #view-your-page .your-card.selected {
      border-color: var(--rose);
      box-shadow: 0 0 0 2px var(--rose-pale), 0 4px 24px rgba(160, 110, 100, .15);
    }

    /* Modal Styles */
    #view-your-page .your-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(90, 79, 74, .6);
      backdrop-filter: blur(4px);
      z-index: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s;
    }
    #view-your-page .your-modal-backdrop.open {
      opacity: 1;
      pointer-events: all;
    }
    #view-your-page .your-modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      width: 580px;
      max-width: 95vw;
      box-shadow: 0 20px 60px rgba(0, 0, 0, .3);
      animation: modalIn .25s ease;
    }
    @keyframes modalIn {
      from { opacity: 0; transform: scale(.96) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    #view-your-page .your-modal-head {
      padding: 20px 24px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #view-your-page .your-modal-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 20px;
      font-weight: 400;
      color: var(--text);
    }
    #view-your-page .your-modal-close {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--bg2);
      border: 1px solid var(--border);
      color: var(--text-dim);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all .15s;
    }
    #view-your-page .your-modal-close:hover {
      border-color: var(--rose);
      color: var(--rose);
      background: var(--rose-pale);
    }
    #view-your-page .your-modal-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 70vh;
      overflow-y: auto;
    }
    #view-your-page .your-form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    #view-your-page .your-form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #view-your-page .your-form-group.full {
      grid-column: 1 / 3;
    }
    #view-your-page .your-form-label {
      font-size: 9px;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--text-dim);
    }
    #view-your-page .your-form-input,
    #view-your-page .your-form-select {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 12px;
      font-family: 'Jost', sans-serif;
      font-size: 13px;
      color: var(--text);
      outline: none;
      transition: border-color .15s;
      width: 100%;
    }
    #view-your-page .your-form-input:focus,
    #view-your-page .your-form-select:focus {
      border-color: var(--rose-soft);
      box-shadow: 0 0 0 3px rgba(201, 139, 139, .08);
    }
    #view-your-page .your-form-input::placeholder {
      color: var(--text-light);
    }
    #view-your-page .your-modal-foot {
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    #view-your-page .your-mfbtn {
      padding: 8px 18px;
      border-radius: 8px;
      font-family: 'Jost', sans-serif;
      font-size: 12px;
      cursor: pointer;
      transition: all .15s;
    }
    #view-your-page .your-mfbtn.cancel {
      background: var(--bg2);
      border: 1px solid var(--border);
      color: var(--text);
    }
    #view-your-page .your-mfbtn.cancel:hover {
      border-color: var(--border2);
      background: var(--bg);
    }
    #view-your-page .your-mfbtn.save {
      background: linear-gradient(135deg, #d4a0a0 0%, #c98b8b 100%);
      border: none;
      color: white;
      box-shadow: 0 2px 8px rgba(201, 139, 139, .2);
    }
    #view-your-page .your-mfbtn.save:hover {
      box-shadow: 0 4px 12px rgba(201, 139, 139, .3);
      transform: translateY(-1px);
    }

    @media (max-width: 768px) {
      #view-your-page .your-grid {
        grid-template-columns: 1fr;
      }
      #view-your-page .your-stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `;
  document.head.appendChild(styleEl);
  stylesInjected = true;
}

/**
 * Get HTML template for main content
 */
function getHTMLTemplate() {
  return `
    <div class="your-content">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 28px;">
        <div class="your-tabs">
          <button class="your-tab active" data-action="switch-tab" data-tab="all">All</button>
          <button class="your-tab" data-action="switch-tab" data-tab="active">Active</button>
          <button class="your-tab" data-action="switch-tab" data-tab="archived">Archived</button>
        </div>
        <button class="your-add-btn" data-action="open-modal">+ Add Item</button>
      </div>

      <div class="your-stats">
        <div class="your-stat-card stat-1">
          <div class="your-stat-label">Total Items</div>
          <div class="your-stat-value" id="stat-total">0</div>
          <div class="your-stat-sub">all items</div>
        </div>
        <div class="your-stat-card stat-2">
          <div class="your-stat-label">Active</div>
          <div class="your-stat-value" id="stat-active">0</div>
          <div class="your-stat-sub">currently active</div>
        </div>
        <div class="your-stat-card stat-3">
          <div class="your-stat-label">Completed</div>
          <div class="your-stat-value" id="stat-completed">0</div>
          <div class="your-stat-sub">all time</div>
        </div>
      </div>

      <div class="your-grid" id="your-grid">
        <!-- Items will be rendered here -->
      </div>
    </div>
  `;
}

/**
 * Get HTML template for modal
 */
function getModalTemplate() {
  return `
    <div class="your-modal-backdrop" id="your-modal-backdrop" data-action="close-modal-backdrop">
      <div class="your-modal" id="your-modal">
        <div class="your-modal-head">
          <div class="your-modal-title">Add New Item</div>
          <button class="your-modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="your-modal-body">
          <div class="your-form-row">
            <div class="your-form-group full">
              <label class="your-form-label">Item Name</label>
              <input class="your-form-input" type="text" id="item-name" placeholder="Enter item name">
            </div>
          </div>
          <div class="your-form-row">
            <div class="your-form-group">
              <label class="your-form-label">Category</label>
              <select class="your-form-select" id="item-category">
                <option>Category 1</option>
                <option>Category 2</option>
                <option>Category 3</option>
              </select>
            </div>
            <div class="your-form-group">
              <label class="your-form-label">Priority</label>
              <select class="your-form-select" id="item-priority">
                <option value="high">High</option>
                <option value="med">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div class="your-form-row">
            <div class="your-form-group full">
              <label class="your-form-label">Notes</label>
              <textarea class="your-form-input" id="item-notes" placeholder="Add notes..." style="min-height: 80px; resize: vertical;"></textarea>
            </div>
          </div>
        </div>
        <div class="your-modal-foot">
          <button class="your-mfbtn cancel" data-action="close-modal">Cancel</button>
          <button class="your-mfbtn save" data-action="add-item">Add Item</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize data from store
 */
function initData() {
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    yourData = state.yourData || [];
    // Ensure yourData exists in store if it doesn't
    if (!state.yourData) {
      window.Petal.store.setState({ yourData: [] });
    }
  } else {
    yourData = [];
  }
}

/**
 * Render items
 */
function renderItems() {
  initData();
  const grid = document.getElementById('your-grid');
  if (!grid) return;
  
  let filtered = yourData;
  if (currentTab === 'active') {
    filtered = yourData.filter(item => item.status === 'active');
  } else if (currentTab === 'archived') {
    filtered = yourData.filter(item => item.status === 'archived');
  }
  
  // Update stats
  const totalCount = yourData.length;
  const activeCount = yourData.filter(item => item.status === 'active').length;
  const completedCount = yourData.filter(item => item.status === 'completed').length;
  
  const statTotal = document.getElementById('stat-total');
  const statActive = document.getElementById('stat-active');
  const statCompleted = document.getElementById('stat-completed');
  
  if (statTotal) statTotal.textContent = totalCount;
  if (statActive) statActive.textContent = activeCount;
  if (statCompleted) statCompleted.textContent = completedCount;
  
  if (filtered.length === 0) {
    const emptyMessage = currentTab === 'active' 
      ? 'No active items. Click "+ Add Item" to get started!'
      : currentTab === 'archived'
      ? 'No archived items yet.'
      : 'No items found. Click "+ Add Item" to add your first item!';
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-dim);">
      <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">📝</div>
      <div style="font-size: 14px; margin-bottom: 8px;">${emptyMessage}</div>
      ${currentTab === 'all' || currentTab === 'active' ? '<button class="your-add-btn" data-action="open-modal" style="margin-top: 16px;">+ Add Your First Item</button>' : ''}
    </div>`;
    return;
  }
  
  grid.innerHTML = filtered.map(item => {
    const priority = item.priority || 'med';
    const isSelected = selectedItemId === item.id;
    
    return `
      <div class="your-card prio-${priority} ${isSelected ? 'selected' : ''}" data-action="select-item" data-item-id="${item.id}">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg2); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;">
            ${item.icon || '📝'}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: var(--text); line-height: 1.3; margin-bottom: 4px;">
              ${escapeHtml(item.name)}
            </div>
            <div style="font-size: 10px; color: var(--text-dim); letter-spacing: .06em; margin-bottom: 8px;">
              ${escapeHtml(item.category || '')}
            </div>
          </div>
        </div>
        ${item.notes ? `<div style="font-size: 12px; color: var(--text-dim); line-height: 1.6; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
          ${escapeHtml(item.notes)}
        </div>` : ''}
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
          <div style="font-size: 9px; color: var(--text-dim);">
            ${item.dateAdded || ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Switch tab
 */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('#view-your-page .your-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`#view-your-page .your-tab[data-tab="${tab}"]`).forEach(b => b.classList.add('active'));
  renderItems();
}

/**
 * Open modal
 */
function openModal() {
  const backdrop = document.getElementById('your-modal-backdrop');
  if (backdrop) backdrop.classList.add('open');
  
  // Clear form
  const nameInput = document.getElementById('item-name');
  const categorySelect = document.getElementById('item-category');
  const prioritySelect = document.getElementById('item-priority');
  const notesTextarea = document.getElementById('item-notes');
  
  if (nameInput) nameInput.value = '';
  if (categorySelect) categorySelect.value = 'Category 1';
  if (prioritySelect) prioritySelect.value = 'high';
  if (notesTextarea) notesTextarea.value = '';
}

/**
 * Close modal
 */
function closeModal() {
  const backdrop = document.getElementById('your-modal-backdrop');
  if (backdrop) backdrop.classList.remove('open');
}

/**
 * Handle backdrop click
 */
function handleBackdropClick(e) {
  if (e.target === e.currentTarget) closeModal();
}

/**
 * Add item
 */
async function addItem() {
  const nameInput = document.getElementById('item-name');
  if (!nameInput) return;
  
  const name = nameInput.value.trim();
  if (!name) {
    alert('Please enter an item name');
    return;
  }
  
  const categorySelect = document.getElementById('item-category');
  const prioritySelect = document.getElementById('item-priority');
  const notesTextarea = document.getElementById('item-notes');
  
  const item = {
    id: Date.now(),
    name,
    category: categorySelect?.value || 'Category 1',
    priority: prioritySelect?.value || 'high',
    notes: notesTextarea?.value || '',
    status: 'active',
    dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    icon: '📝'
  };
  
  yourData.push(item);
  
  // Save to store
  if (window.Petal?.store) {
    window.Petal.store.setState({ yourData });
    if (window.Petal?.persistence?.flush) {
      await window.Petal.persistence.flush();
    }
  }
  
  closeModal();
  renderItems();
  
  // Update sidebar if function exists
  if (window.renderGlobalSidebar && window.Petal?.store) {
    window.renderGlobalSidebar(window.Petal.store.getState());
  }
}

/**
 * Select item
 */
function selectItem(id) {
  selectedItemId = id;
  document.querySelectorAll('#view-your-page .your-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`#view-your-page .your-card[data-item-id="${id}"]`);
  if (card) card.classList.add('selected');
}

/**
 * Bind event handlers using event delegation
 */
function bind(container) {
  if (bound) return;
  
  // Click delegation for all actions
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    e.stopPropagation();
    
    switch (action) {
      case 'switch-tab':
        const tab = btn.dataset.tab;
        if (tab) switchTab(tab);
        break;
        
      case 'open-modal':
        openModal();
        break;
        
      case 'close-modal':
      case 'close-modal-backdrop':
        if (action === 'close-modal-backdrop' && e.target !== e.currentTarget) return;
        closeModal();
        break;
        
      case 'add-item':
        addItem();
        break;
        
      case 'select-item':
        const itemId = parseInt(btn.dataset.itemId);
        if (itemId) selectItem(itemId);
        break;
    }
  });
  
  bound = true;
}

/**
 * Render Your Page
 * @param {HTMLElement} container - Container element (#view-your-page)
 * @param {Object} state - Current app state
 * @param {Object} features - Features/handlers
 */
export async function renderYourPage(container, state, features) {
  if (!container) {
    console.error('❌ renderYourPage: Container not provided');
    return;
  }
  
  // Inject styles (only once)
  injectStyles();
  
  // Initialize data
  initData();
  const totalCount = yourData.length;
  const activeCount = yourData.filter(item => item.status === 'active').length;
  
  // Render main content first
  container.innerHTML = getHTMLTemplate();
  
  // Create or find header - must be first element (after innerHTML)
  let pageHeader = container.querySelector('.your-page-header');
  if (!pageHeader) {
    pageHeader = document.createElement('header');
    pageHeader.className = 'your-page-header';
    // Insert at the very beginning of the container
    container.insertBefore(pageHeader, container.firstChild);
  }
  
  // Render header
  pageHeader.innerHTML = `
    <div class="your-page-header-title">
      <span class="your-page-header-name">Your Page Name</span>
    </div>
    <div class="your-page-header-right">
      <div style="display: flex; align-items: center; gap: 6px">
        <span class="your-page-header-status">${totalCount} total · ${activeCount} active</span>
      </div>
    </div>
  `;
  
  // Render modal (append to container if not already there)
  let modal = document.getElementById('your-modal-backdrop');
  if (!modal) {
    const modalHTML = getModalTemplate();
    container.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('your-modal-backdrop');
  }
  
  // Bind event handlers (only once)
  bind(container);
  
  // Initialize and render
  initData();
  renderItems();
}

/**
 * Cleanup (optional - for when page is unmounted)
 */
export function cleanupYourPage() {
  bound = false;
  // Note: We don't remove styles as they're scoped and may be needed if page is re-rendered
}
```

---

## Step 2: Register the Page

Add to `src/app/pages.js`:

```javascript
import { renderYourPage } from '../pages/YourPage.js';

export const PAGES = {
  // ... existing pages
  'your-page': renderYourPage,
};
```

---

## Step 3: Add View Container to HTML

Add to `tasklist.html` (around line 60-120, with other view containers):

```html
<!-- ═══════════════════════════════════ YOUR PAGE VIEW ═══ -->
<div id="view-your-page" style="display:none;"></div>
```

---

## Step 4: Add CSS for View Container

Add to `src/styles/main.css` (around line 76, with other view styles):

```css
#view-your-page {
  grid-column: 2 !important;
  grid-row: 1 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  padding: 82px 36px 100px !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  min-width: 0 !important;
  height: 100vh !important;
  margin: 0 !important;
  padding-top: 82px !important;
  top: 0 !important;
  align-self: start !important;
  justify-self: start !important;
  position: relative !important;
  transform: translateY(0) !important;
  scroll-behavior: auto !important;
  z-index: 1 !important;
}

#view-your-page > *:first-child {
  margin-top: 0 !important;
  padding-top: 0 !important;
}
```

---

## Step 5: Add Sidebar Navigation

Add to `src/app/viewManager.js` in the `renderGlobalSidebar` function, inside the `navEl.innerHTML` template (around line 58-100):

```javascript
// Add to appropriate section (Workspace, Research, or Workshop)
<a class="global-sidebar-nav-item ${currentView === 'your-page' ? 'active' : ''}" href="#" data-nav="your-page">
  <span class="global-sidebar-nav-icon">📝</span> Your Page Name
  ${(() => {
    const items = state.yourData || [];
    const activeCount = items.filter(item => item.status === 'active').length;
    return activeCount > 0 ? `<span class="global-sidebar-nav-badge">${activeCount}</span>` : '';
  })()}
</a>
```

---

## Step 6: Add State Initialization (Optional)

If your page needs initial state, add to `src/app/initState.js` in the `initStateInternal` function:

```javascript
// Initialize yourData if it doesn't exist
if (!state.yourData) {
  state.yourData = [];
}
```

---

## Key Patterns to Follow

### 1. **Event Delegation**
- Use `data-action` attributes on interactive elements
- Bind a single click handler to the container
- Use `e.target.closest('[data-action]')` to find the action element
- Prevent duplicate binding with a `bound` flag

### 2. **State Management**
- Store data in `window.Petal.store` state
- Use `window.Petal.store.setState()` to update
- Use `window.Petal.persistence.flush()` to persist changes
- Initialize from store in `initData()` function

### 3. **CSS Scoping**
- All styles should be scoped to `#view-your-page`
- Use CSS variables from `main.css` (`--rose`, `--text`, etc.)
- Inject styles only once using a flag
- Use `!important` for layout properties to override defaults

### 4. **HTML Structure**
- Page header (fixed at top)
- Main content area (with padding-top to account for header)
- Modal/overlay components (if needed)
- All HTML generated via template functions

### 5. **Naming Conventions**
- CSS classes: `your-*` (replace `your` with your page name)
- IDs: `your-*` (same)
- Functions: `yourFunctionName` or `renderYourPage`
- State key: `yourData` (in store)

### 6. **Accessibility**
- Use semantic HTML
- Provide keyboard navigation where appropriate
- Use ARIA labels if needed
- Ensure color contrast meets WCAG standards

---

## Testing Checklist

- [ ] Page renders without errors
- [ ] Sidebar navigation link works
- [ ] Page header displays correctly
- [ ] Tabs/buttons respond to clicks
- [ ] Modal opens and closes properly
- [ ] Data persists after page reload
- [ ] Stats update correctly
- [ ] Grid layout is responsive
- [ ] Styles match app design system
- [ ] No console errors

---

## Example: Complete Integration

Here's a minimal example for a "Notes" page:

1. **File**: `src/pages/YourPage.js` (use template above, replace `your` with your page name)
2. **Registry**: Add `'your-page': renderYourPage` to `PAGES` object in `src/app/pages.js`
3. **HTML**: Add `<div id="view-your-page" style="display:none;"></div>` to `tasklist.html`
4. **CSS**: Add `#view-your-page { ... }` styles to `src/styles/main.css`
5. **Sidebar**: Add navigation link with icon and badge
6. **State**: Add `notes: []` to initial state

---

## Notes

- Always use `escapeHtml()` from `../utils/strings.js` when rendering user content
- Follow the existing color scheme (rose, sage, mauve)
- Use the same typography (Cormorant Garamond for titles, Jost for body)
- Keep animations subtle and consistent
- Test on different screen sizes
- Ensure the page works with the existing sidebar and layout system
