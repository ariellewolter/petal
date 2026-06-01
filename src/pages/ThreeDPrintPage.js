// ═══════════════════════ 3D PRINTING PAGE ═══════════════════════
// 3D Printing view page with event delegation
// Replaces fetch/inject pattern with proper module

import { escapeHtml } from '../utils/strings.js';

// State
let prints3d = [];
let currentPrintTab = 'queue';
let selectedPrintId = null;
let stylesInjected = false;
let bound = false;

/**
 * Inject scoped CSS styles (only once)
 */
function injectStyles() {
  if (stylesInjected) return;
  
  const styleId = 'print3d-styles';
  if (document.getElementById(styleId)) {
    stylesInjected = true;
    return;
  }
  
  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    /* ── 3D PRINTING PAGE STYLES ── */
    #view-3d-print{grid-column:2 !important;grid-row:1 !important;position:relative !important;top:0 !important;left:0 !important;margin:0 !important;padding:82px 36px 100px !important;box-sizing:border-box !important;width:100% !important;max-width:100% !important;overflow-x:hidden !important;overflow-y:auto !important;min-width:0 !important;height:100vh !important;padding-top:82px !important;}

    #view-3d-print .print3d-page-header{background:var(--surface);border-bottom:1px solid var(--border);padding:0 28px;height:58px;display:flex;align-items:center;justify-content:space-between;margin:0;position:absolute;top:0;left:0;right:0;z-index:10;}
    #view-3d-print .print3d-page-header-title{display:flex;align-items:baseline;gap:10px;}
    #view-3d-print .print3d-page-header-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:300;font-style:italic;}
    #view-3d-print .print3d-page-header-right{display:flex;align-items:center;gap:14px;}
    #view-3d-print .print3d-page-header-status{font-size:11px;color:var(--text-dim);}
    #view-3d-print .print3d-header{display:flex;align-items:center;justify-content:flex-end;margin-bottom:28px;flex-wrap:wrap;gap:16px;margin-top:74px;}
    #view-3d-print .print3d-title{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:400;color:var(--text);display:flex;align-items:center;gap:12px;}
    #view-3d-print .print3d-title-icon{width:40px;height:40px;background:var(--rose-pale);border:1px solid var(--rose-soft);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--rose);}
    #view-3d-print .print3d-tabs{display:flex;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;flex-wrap:wrap;}
    #view-3d-print .print3d-tab{background:none;border:none;border-radius:7px;color:var(--text-dim);font-family:'Jost',sans-serif;font-size:11px;font-weight:400;letter-spacing:.12em;text-transform:uppercase;padding:6px 16px;cursor:pointer;transition:all .18s;white-space:nowrap;}
    #view-3d-print .print3d-tab.active{background:var(--rose-pale);color:var(--rose);}
    #view-3d-print .print3d-tab:hover:not(.active){color:var(--text);}
    #view-3d-print .print3d-add-btn{background:var(--gradient-accent);border:none;border-radius:8px;color:white;font-family:'Jost',sans-serif;font-size:12px;font-weight:400;letter-spacing:.1em;text-transform:uppercase;padding:8px 18px;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(var(--accent-rgb),.2);}
    #view-3d-print .print3d-add-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(var(--accent-rgb),.3);}

    #view-3d-print .print3d-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px;}
    #view-3d-print .print3d-stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;position:relative;overflow:hidden;}
    #view-3d-print .print3d-stat-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;}
    #view-3d-print .print3d-stat-card.stat-1::after{background:var(--rose);}
    #view-3d-print .print3d-stat-card.stat-2::after{background:var(--sage);}
    #view-3d-print .print3d-stat-card.stat-3::after{background:var(--mauve);}
    #view-3d-print .print3d-stat-card.stat-4::after{background:var(--rose-soft);}
    #view-3d-print .print3d-stat-label{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px;}
    #view-3d-print .print3d-stat-value{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:400;line-height:1;color:var(--text);}
    #view-3d-print .print3d-stat-sub{font-size:10px;color:var(--text-dim);margin-top:4px;}

    #view-3d-print .print3d-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;margin-top:24px;}
    #view-3d-print .print3d-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;animation:fadeSlide .3s ease both;}
    #view-3d-print .print3d-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:16px 0 0 16px;}
    #view-3d-print .print3d-card.prio-high::before{background:var(--rose);}
    #view-3d-print .print3d-card.prio-med::before{background:var(--rose-soft);}
    #view-3d-print .print3d-card.prio-low::before{background:var(--sage);}
    #view-3d-print .print3d-card.prio-done::before{background:var(--sage);}
    #view-3d-print .print3d-card.printing{background:var(--bg2);border-color:var(--rose-soft);box-shadow:0 0 20px var(--accent-08);}
    #view-3d-print .print3d-card:hover{box-shadow:0 4px 24px var(--hover-shadow);transform:translateY(-2px);}
    #view-3d-print .print3d-card.selected{border-color:var(--rose);box-shadow:0 0 0 2px var(--rose-pale),0 4px 24px var(--hover-shadow);}

    #view-3d-print .print3d-card-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;}
    #view-3d-print .print3d-card-icon{width:48px;height:48px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;}
    #view-3d-print .print3d-card-info{flex:1;min-width:0;}
    #view-3d-print .print3d-card-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:400;color:var(--text);line-height:1.3;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    #view-3d-print .print3d-card-category{font-size:10px;color:var(--text-dim);letter-spacing:.06em;margin-bottom:8px;}
    #view-3d-print .print3d-card-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
    #view-3d-print .print3d-tag{font-size:9px;padding:3px 8px;border-radius:4px;letter-spacing:.04em;}
    #view-3d-print .print3d-tag.rose{background:var(--rose-pale);color:var(--rose);border:1px solid var(--rose-soft);}
    #view-3d-print .print3d-tag.sage{background:var(--sage-pale);color:var(--sage);border:1px solid var(--sage);}
    #view-3d-print .print3d-tag.mauve{background:var(--mauve-pale);color:var(--mauve);border:1px solid var(--mauve);}
    #view-3d-print .print3d-tag.gray{background:var(--bg2);color:var(--text-dim);border:1px solid var(--border);}

    #view-3d-print .print3d-specs{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin:12px 0;}
    #view-3d-print .print3d-spec-cell{padding:10px 12px;border-right:1px solid var(--border);display:flex;flex-direction:column;gap:2px;}
    #view-3d-print .print3d-spec-cell:last-child{border-right:none;}
    #view-3d-print .print3d-spec-label{font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim);}
    #view-3d-print .print3d-spec-val{font-size:11px;color:var(--text);}
    #view-3d-print .print3d-spec-val strong{color:var(--text);font-weight:400;}

    #view-3d-print .print3d-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);}
    #view-3d-print .print3d-file-link{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text-dim);text-decoration:none;cursor:pointer;transition:color .15s;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    #view-3d-print .print3d-file-link:hover{color:var(--rose);}
    #view-3d-print .print3d-card-date{font-size:9px;color:var(--text-dim);}

    #view-3d-print .print3d-progress-wrap{margin:12px 0;padding:0;}
    #view-3d-print .print3d-progress-bar{height:5px;background:var(--bg2);border-radius:3px;overflow:hidden;}
    #view-3d-print .print3d-progress-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--rose),var(--rose-soft));transition:width .5s ease;position:relative;overflow:hidden;}
    #view-3d-print .print3d-progress-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);animation:shimmer 1.8s infinite;}
    @keyframes shimmer{from{transform:translateX(-100%);}to{transform:translateX(200%);}}
    #view-3d-print .print3d-progress-label{display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-bottom:5px;}
    #view-3d-print .print3d-printing-badge{display:inline-flex;align-items:center;gap:6px;background:var(--rose-pale);border:1px solid var(--rose-soft);padding:3px 10px;border-radius:12px;font-size:9px;color:var(--rose);letter-spacing:.05em;}
    #view-3d-print .print3d-pulse{width:6px;height:6px;border-radius:50%;background:var(--rose);animation:printpulse 1.2s infinite;}
    @keyframes printpulse{0%,100%{opacity:1;box-shadow:0 0 6px rgba(var(--accent-rgb),.6);}50%{opacity:.4;}}

    #view-3d-print .print3d-detail-panel{position:fixed;right:0;top:58px;width:360px;height:calc(100vh - 58px);background:var(--surface);border-left:1px solid var(--border);z-index:200;display:flex;flex-direction:column;transform:translateX(370px);transition:transform .28s cubic-bezier(.16,1,.3,1);overflow:hidden;box-shadow:-4px 0 20px rgba(0,0,0,.1);}
    #view-3d-print .print3d-detail-panel.open{transform:translateX(0);}
    #view-3d-print .print3d-dp-head{padding:18px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
    #view-3d-print .print3d-dp-icon{width:56px;height:56px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;}
    #view-3d-print .print3d-dp-title-block{flex:1;min-width:0;}
    #view-3d-print .print3d-dp-title{font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--text);line-height:1.3;}
    #view-3d-print .print3d-dp-cat{font-size:11px;color:var(--text-dim);margin-top:4px;}
    #view-3d-print .print3d-dp-close{width:28px;height:28px;border-radius:6px;background:var(--bg2);border:1px solid var(--border);color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;transition:all .15s;}
    #view-3d-print .print3d-dp-close:hover{border-color:var(--rose);color:var(--rose);background:var(--rose-pale);}
    #view-3d-print .print3d-dp-body{flex:1;overflow-y:auto;padding:0;}
    #view-3d-print .print3d-dp-body::-webkit-scrollbar{width:4px;}
    #view-3d-print .print3d-dp-body::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
    #view-3d-print .print3d-dp-section{padding:16px 18px;border-bottom:1px solid var(--border);}
    #view-3d-print .print3d-dp-sec-title{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);margin-bottom:12px;}
    #view-3d-print .print3d-dp-spec-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    #view-3d-print .print3d-dp-spec{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;}
    #view-3d-print .print3d-dp-spec-label{font-size:9px;color:var(--text-dim);margin-bottom:4px;letter-spacing:.05em;}
    #view-3d-print .print3d-dp-spec-val{font-size:13px;color:var(--text);}
    #view-3d-print .print3d-dp-file{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:6px;background:var(--bg2);border:1px solid var(--border);cursor:pointer;transition:all .15s;margin-bottom:8px;text-decoration:none;}
    #view-3d-print .print3d-dp-file:hover{border-color:var(--rose);background:var(--rose-pale);}
    #view-3d-print .print3d-dp-file-icon{width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;background:var(--surface);}
    #view-3d-print .print3d-dp-file-info{flex:1;min-width:0;}
    #view-3d-print .print3d-dp-file-name{font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    #view-3d-print .print3d-dp-file-meta{font-size:10px;color:var(--text-dim);margin-top:2px;}
    #view-3d-print .print3d-dp-notes{font-size:12px;color:var(--text-dim);line-height:1.7;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;white-space:pre-wrap;}

    #view-3d-print .print3d-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:500;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;}
    #view-3d-print .print3d-modal-backdrop.open{opacity:1;pointer-events:all;}
    #view-3d-print .print3d-modal{background:var(--surface);border:1px solid var(--border);border-radius:16px;width:580px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:modalIn .25s ease;}
    @keyframes modalIn{from{opacity:0;transform:scale(.96)translateY(10px);}to{opacity:1;transform:scale(1)translateY(0);}}
    #view-3d-print .print3d-modal-head{padding:20px 24px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
    #view-3d-print .print3d-modal-title{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:400;color:var(--text);}
    #view-3d-print .print3d-modal-close{width:28px;height:28px;border-radius:6px;background:var(--bg2);border:1px solid var(--border);color:var(--text-dim);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .15s;}
    #view-3d-print .print3d-modal-close:hover{border-color:var(--rose);color:var(--rose);background:var(--rose-pale);}
    #view-3d-print .print3d-modal-body{padding:20px 24px;display:flex;flex-direction:column;gap:16px;max-height:70vh;overflow-y:auto;}
    #view-3d-print .print3d-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    #view-3d-print .print3d-form-group{display:flex;flex-direction:column;gap:6px;}
    #view-3d-print .print3d-form-group.full{grid-column:1/3;}
    #view-3d-print .print3d-form-label{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);}
    #view-3d-print .print3d-form-input,#view-3d-print .print3d-form-select{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-family:'Jost',sans-serif;font-size:13px;color:var(--text);outline:none;transition:border-color .15s;width:100%;}
    #view-3d-print .print3d-form-input:focus,#view-3d-print .print3d-form-select:focus{border-color:var(--rose-soft);box-shadow:0 0 0 3px var(--focus-ring);}
    #view-3d-print .print3d-form-input::placeholder{color:var(--text-light);}
    #view-3d-print .print3d-modal-foot{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;}
    #view-3d-print .print3d-mfbtn{padding:8px 18px;border-radius:8px;font-family:'Jost',sans-serif;font-size:12px;cursor:pointer;transition:all .15s;}
    #view-3d-print .print3d-mfbtn.cancel{background:var(--bg2);border:1px solid var(--border);color:var(--text);}
    #view-3d-print .print3d-mfbtn.cancel:hover{border-color:var(--border2);background:var(--bg);}
    #view-3d-print .print3d-mfbtn.save{background:var(--gradient-accent);border:none;color:white;box-shadow:0 2px 8px rgba(var(--accent-rgb),.2);}
    #view-3d-print .print3d-mfbtn.save:hover{box-shadow:0 4px 12px rgba(var(--accent-rgb),.3);transform:translateY(-1px);}

    @media(max-width:768px){
      #view-3d-print .print3d-grid{grid-template-columns:1fr;}
      #view-3d-print .print3d-stats{grid-template-columns:repeat(2,1fr);}
      #view-3d-print .print3d-detail-panel{width:100%;transform:translateX(100%);}
      #view-3d-print .print3d-detail-panel.open{transform:translateX(0);}
    }
  `;
  document.head.appendChild(styleEl);
  stylesInjected = true;
}

/**
 * Get HTML template for 3D Print page
 */
function getHTMLTemplate() {
  return `
    <div class="print3d-header">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div class="print3d-tabs">
          <button class="print3d-tab active" data-action="switch-tab" data-tab="queue">Queue</button>
          <button class="print3d-tab" data-action="switch-tab" data-tab="printed">Printed</button>
          <button class="print3d-tab" data-action="switch-tab" data-tab="all">All</button>
        </div>
        <button class="print3d-add-btn" data-action="open-modal">+ Add Print</button>
      </div>
    </div>

    <div class="print3d-stats">
      <div class="print3d-stat-card stat-1">
        <div class="print3d-stat-label">Print Queue</div>
        <div class="print3d-stat-value" id="stat-queue">0</div>
        <div class="print3d-stat-sub">items waiting</div>
      </div>
      <div class="print3d-stat-card stat-2">
        <div class="print3d-stat-label">Completed</div>
        <div class="print3d-stat-value" id="stat-completed">0</div>
        <div class="print3d-stat-sub">all time</div>
      </div>
      <div class="print3d-stat-card stat-3">
        <div class="print3d-stat-label">Filament Used</div>
        <div class="print3d-stat-value" id="stat-filament">0<span style="font-size:16px">g</span></div>
        <div class="print3d-stat-sub">across all prints</div>
      </div>
      <div class="print3d-stat-card stat-4">
        <div class="print3d-stat-label">Currently</div>
        <div class="print3d-stat-value" id="stat-current" style="font-size:14px;display:flex;align-items:center;gap:8px;margin-top:6px">
          <span>Idle</span>
        </div>
        <div class="print3d-stat-sub" id="stat-current-sub">No active prints</div>
      </div>
    </div>

    <div class="print3d-grid" id="print3d-grid">
      <!-- Print cards will be rendered here -->
    </div>
  `;
}

/**
 * Get HTML template for detail panel
 */
function getDetailPanelTemplate() {
  return `
    <div class="print3d-detail-panel" id="print3d-detail-panel">
      <div class="print3d-dp-head">
        <div class="print3d-dp-icon" id="print3d-dp-icon">🖨</div>
        <div class="print3d-dp-title-block">
          <div class="print3d-dp-title" id="print3d-dp-title">–</div>
          <div class="print3d-dp-cat" id="print3d-dp-cat">–</div>
        </div>
        <button class="print3d-dp-close" data-action="close-detail">✕</button>
      </div>
      <div class="print3d-dp-body" id="print3d-dp-body"></div>
    </div>
  `;
}

/**
 * Get HTML template for add print modal
 */
function getModalTemplate() {
  return `
    <div class="print3d-modal-backdrop" id="print3d-modal-backdrop" data-action="close-modal-backdrop">
      <div class="print3d-modal" id="print3d-modal">
        <div class="print3d-modal-head">
          <div class="print3d-modal-title">Add New Print</div>
          <button class="print3d-modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="print3d-modal-body">
          <div class="print3d-form-row">
            <div class="print3d-form-group full">
              <label class="print3d-form-label">Print Name</label>
              <input class="print3d-form-input" type="text" id="print-name" placeholder="e.g. Pipette Rack 200µL">
            </div>
          </div>
          <div class="print3d-form-row">
            <div class="print3d-form-group">
              <label class="print3d-form-label">Category</label>
              <select class="print3d-form-select" id="print-category">
                <option>Lab Equipment</option>
                <option>Personal</option>
                <option>Workshop</option>
                <option>Other</option>
              </select>
            </div>
            <div class="print3d-form-group">
              <label class="print3d-form-label">Priority</label>
              <select class="print3d-form-select" id="print-priority">
                <option value="high">High</option>
                <option value="med">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div class="print3d-form-row">
            <div class="print3d-form-group">
              <label class="print3d-form-label">Filament Type</label>
              <select class="print3d-form-select" id="print-filament">
                <option>PLA+</option>
                <option>PETG</option>
                <option>ABS</option>
                <option>ASA</option>
                <option>TPU</option>
                <option>Silk PLA</option>
                <option>Resin</option>
                <option>Other</option>
              </select>
            </div>
            <div class="print3d-form-group">
              <label class="print3d-form-label">Filament Colour</label>
              <input class="print3d-form-input" type="text" id="print-color" placeholder="e.g. Black, White, Clear">
            </div>
          </div>
          <div class="print3d-form-row">
            <div class="print3d-form-group">
              <label class="print3d-form-label">Nozzle Size</label>
              <select class="print3d-form-select" id="print-nozzle">
                <option>0.2 mm</option>
                <option>0.4 mm</option>
                <option>0.6 mm</option>
                <option>0.8 mm</option>
                <option>1.0 mm</option>
              </select>
            </div>
            <div class="print3d-form-group">
              <label class="print3d-form-label">Est. Filament Use</label>
              <input class="print3d-form-input" type="text" id="print-est-use" placeholder="e.g. 34 g / 11 m">
            </div>
          </div>
          <div class="print3d-form-row">
            <div class="print3d-form-group full">
              <label class="print3d-form-label">Source URL</label>
              <input class="print3d-form-input" type="url" id="print-url" placeholder="https://www.printables.com/model/…">
            </div>
          </div>
          <div class="print3d-form-row">
            <div class="print3d-form-group full">
              <label class="print3d-form-label">Linked Files</label>
              <div id="print3d-files-container" style="margin-top:8px;"></div>
              <button class="btn-add-file" data-action="add-file" data-container="print3d-files-container" data-prefix="print3d" style="width:100%;margin-top:8px;">＋ Choose file</button>
              <div id="print3d-file-hint" style="font-size:9px;color:var(--text-light);margin-top:4px;display:none;">Files in OneDrive will work across all devices</div>
            </div>
          </div>
          <div class="print3d-form-row">
            <div class="print3d-form-group full">
              <label class="print3d-form-label">Notes</label>
              <textarea class="print3d-form-input" id="print-notes" placeholder="Slicer settings, infill, supports, etc." style="min-height:80px;resize:vertical;"></textarea>
            </div>
          </div>
        </div>
        <div class="print3d-modal-foot">
          <button class="print3d-mfbtn cancel" data-action="close-modal">Cancel</button>
          <button class="print3d-mfbtn save" data-action="add-print">Add to Queue</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize prints3d from store
 */
function init3DPrints() {
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    prints3d = state.prints3d || [];
    // Ensure prints3d exists in store if it doesn't
    if (!state.prints3d) {
      window.Petal.store.setState({ prints3d: [] });
    }
  } else {
    prints3d = [];
  }
}

/**
 * Render 3D prints
 */
function render3DPrints() {
  init3DPrints();
  const grid = document.getElementById('print3d-grid');
  if (!grid) return;
  
  let filtered = prints3d;
  if (currentPrintTab === 'queue') {
    filtered = prints3d.filter(p => p.status === 'queued' || p.status === 'printing');
  } else if (currentPrintTab === 'printed') {
    filtered = prints3d.filter(p => p.status === 'done' || p.status === 'failed');
  }
  
  // Update stats
  const queueCount = prints3d.filter(p => p.status === 'queued').length;
  const completedCount = prints3d.filter(p => p.status === 'done').length;
  const totalFilament = prints3d.reduce((sum, p) => {
    const match = (p.estUse || '').match(/(\d+)\s*g/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);
  const printing = prints3d.find(p => p.status === 'printing');
  
  const statQueue = document.getElementById('stat-queue');
  const statCompleted = document.getElementById('stat-completed');
  const statFilament = document.getElementById('stat-filament');
  const statCurrent = document.getElementById('stat-current');
  const statCurrentSub = document.getElementById('stat-current-sub');
  
  if (statQueue) statQueue.textContent = queueCount;
  if (statCompleted) statCompleted.textContent = completedCount;
  if (statFilament) statFilament.innerHTML = totalFilament + '<span style="font-size:16px">g</span>';
  
  if (printing && statCurrent && statCurrentSub) {
    const progress = printing.progress || 0;
    statCurrent.innerHTML = '<div class="print3d-pulse"></div> Printing';
    statCurrentSub.textContent = `${printing.name} — ${progress}%`;
  } else {
    if (statCurrent) statCurrent.innerHTML = '<span>Idle</span>';
    if (statCurrentSub) statCurrentSub.textContent = 'No active prints';
  }
  
  if (filtered.length === 0) {
    const emptyMessage = currentPrintTab === 'queue' 
      ? 'No prints in queue. Click "+ Add Print" to get started!'
      : currentPrintTab === 'printed'
      ? 'No completed prints yet.'
      : 'No prints found. Click "+ Add Print" to add your first print!';
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim);">
      <div style="font-size:48px;margin-bottom:16px;opacity:0.3;">🖨</div>
      <div style="font-size:14px;margin-bottom:8px;">${emptyMessage}</div>
      ${currentPrintTab === 'queue' || currentPrintTab === 'all' ? '<button class="print3d-add-btn" data-action="open-modal" style="margin-top:16px;">+ Add Your First Print</button>' : ''}
    </div>`;
    return;
  }
  
  grid.innerHTML = filtered.map(print => {
    const priority = print.priority || 'med';
    const isPrinting = print.status === 'printing';
    const isSelected = selectedPrintId === print.id;
    
    let progressHtml = '';
    if (isPrinting && print.progress !== undefined) {
      progressHtml = `
        <div class="print3d-progress-wrap">
          <div class="print3d-progress-label">
            <span>Layer ${print.currentLayer || 0} / ${print.totalLayers || 0}</span>
            <span>~${print.timeRemaining || '?'} remaining</span>
          </div>
          <div class="print3d-progress-bar">
            <div class="print3d-progress-fill" style="width:${print.progress}%"></div>
          </div>
          <div class="print3d-progress-label" style="margin-top:4px;">
            <span style="color:var(--rose)">${print.progress}% complete</span>
            <span>Est. done ${print.estDone || ''}</span>
          </div>
        </div>
      `;
    }
    
    const fileLink = print.files && print.files.length > 0 ? print.files[0] : null;
    const fileName = fileLink ? (fileLink.label || fileLink.name || 'File') : null;
    
    return `
      <div class="print3d-card prio-${priority} ${isPrinting ? 'printing' : ''} ${isSelected ? 'selected' : ''}" data-action="open-detail" data-print-id="${print.id}">
        <div class="print3d-card-top">
          <div class="print3d-card-icon">${print.icon || '🖨'}</div>
          <div class="print3d-card-info">
            <div class="print3d-card-name">${escapeHtml(print.name)}</div>
            <div class="print3d-card-category">${escapeHtml(print.category || '')}</div>
            <div class="print3d-card-tags">
              ${isPrinting ? '<span class="print3d-printing-badge"><div class="print3d-pulse"></div>Printing now</span>' : ''}
              ${print.status === 'done' ? '<span class="print3d-tag sage">✓ Printed</span>' : ''}
              ${print.status === 'failed' ? '<span class="print3d-tag rose">Failed</span>' : ''}
              ${print.priority === 'high' ? '<span class="print3d-tag rose">High priority</span>' : ''}
              ${print.priority === 'med' ? '<span class="print3d-tag mauve">Medium</span>' : ''}
              ${print.priority === 'low' ? '<span class="print3d-tag gray">Low priority</span>' : ''}
              ${print.filament ? `<span class="print3d-tag sage">${escapeHtml(print.filament)}</span>` : ''}
            </div>
          </div>
        </div>
        ${progressHtml}
        <div class="print3d-specs">
          <div class="print3d-spec-cell">
            <div class="print3d-spec-label">Filament</div>
            <div class="print3d-spec-val"><strong>${escapeHtml(print.filament || '')}</strong> · ${escapeHtml(print.color || '')}</div>
          </div>
          <div class="print3d-spec-cell">
            <div class="print3d-spec-label">Nozzle</div>
            <div class="print3d-spec-val"><strong>${escapeHtml(print.nozzle || '')}</strong></div>
          </div>
          <div class="print3d-spec-cell">
            <div class="print3d-spec-label">Est. Use</div>
            <div class="print3d-spec-val"><strong>${escapeHtml(print.estUse || '')}</strong></div>
          </div>
        </div>
        <div class="print3d-card-footer">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
            ${print.url ? `<a class="print3d-file-link" href="${escapeHtml(print.url)}" target="_blank" onclick="event.stopPropagation()">🔗 ${escapeHtml((print.urlDisplay || print.url).substring(0, 30))}${(print.urlDisplay || print.url).length > 30 ? '…' : ''}</a>` : ''}
            ${fileName ? `<span class="print3d-file-link" onclick="event.stopPropagation()">📁 ${escapeHtml(fileName)}</span>` : ''}
          </div>
          <div class="print3d-card-date">${print.dateAdded || ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Switch print tab
 */
function switchPrintTab(tab) {
  currentPrintTab = tab;
  document.querySelectorAll('#view-3d-print .print3d-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`#view-3d-print .print3d-tab[data-tab="${tab}"]`).forEach(b => b.classList.add('active'));
  render3DPrints();
}

/**
 * Open print detail panel
 */
function openPrintDetail(id) {
  const print = prints3d.find(p => p.id === id);
  if (!print) return;
  
  selectedPrintId = id;
  document.querySelectorAll('#view-3d-print .print3d-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`#view-3d-print .print3d-card[data-print-id="${id}"]`);
  if (card) card.classList.add('selected');
  
  const iconEl = document.getElementById('print3d-dp-icon');
  const titleEl = document.getElementById('print3d-dp-title');
  const catEl = document.getElementById('print3d-dp-cat');
  const bodyEl = document.getElementById('print3d-dp-body');
  
  if (!iconEl || !titleEl || !catEl || !bodyEl) return;
  
  iconEl.textContent = print.icon || '🖨';
  titleEl.textContent = print.name;
  catEl.textContent = print.category || '';
  
  const statusLabels = {
    printing: 'Printing now',
    queued: 'Queued',
    done: 'Printed',
    failed: 'Failed'
  };
  
  const statusColors = {
    printing: 'var(--rose)',
    queued: 'var(--mauve)',
    done: 'var(--sage)',
    failed: 'var(--rose)'
  };
  
  let filesHtml = '';
  if (print.files && print.files.length > 0) {
    filesHtml = print.files.map(file => {
      const fileName = file.label || file.name || 'File';
      const filePath = file.onedrive_rel || file.abs_path || file.url || '';
      const fileJson = escapeHtml(JSON.stringify(file));
      return `
        <a class="print3d-dp-file" href="#" data-action="open-file" data-file='${fileJson}'>
          <div class="print3d-dp-file-icon">📁</div>
          <div class="print3d-dp-file-info">
            <div class="print3d-dp-file-name">${escapeHtml(fileName)}</div>
            <div class="print3d-dp-file-meta">${file.type || 'File'} · ${filePath.substring(0, 40)}${filePath.length > 40 ? '…' : ''}</div>
          </div>
        </a>
      `;
    }).join('');
  } else {
    filesHtml = '<div style="font-size:11px;color:var(--text-dim);">No files linked</div>';
  }
  
  bodyEl.innerHTML = `
    <div class="print3d-dp-section">
      <div class="print3d-dp-sec-title">Status</div>
      <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:20px;background:var(--bg2);border:1px solid var(--border);font-size:11px;color:${statusColors[print.status] || 'var(--text-dim)'}">
        ${print.status === 'printing' ? '●' : print.status === 'done' ? '✓' : print.status === 'failed' ? '✕' : '○'} ${statusLabels[print.status] || 'Unknown'}
      </div>
    </div>
    <div class="print3d-dp-section">
      <div class="print3d-dp-sec-title">Print Specs</div>
      <div class="print3d-dp-spec-grid">
        <div class="print3d-dp-spec">
          <div class="print3d-dp-spec-label">Filament Type</div>
          <div class="print3d-dp-spec-val">${escapeHtml(print.filament || '')}</div>
        </div>
        <div class="print3d-dp-spec">
          <div class="print3d-dp-spec-label">Colour</div>
          <div class="print3d-dp-spec-val">${escapeHtml(print.color || '')}</div>
        </div>
        <div class="print3d-dp-spec">
          <div class="print3d-dp-spec-label">Nozzle Size</div>
          <div class="print3d-dp-spec-val">${escapeHtml(print.nozzle || '')}</div>
        </div>
        <div class="print3d-dp-spec">
          <div class="print3d-dp-spec-label">Filament Used</div>
          <div class="print3d-dp-spec-val">${escapeHtml(print.estUse || '')}</div>
        </div>
      </div>
    </div>
    ${print.url ? `
    <div class="print3d-dp-section">
      <div class="print3d-dp-sec-title">Source</div>
      <a class="print3d-dp-file" href="${escapeHtml(print.url)}" target="_blank">
        <div class="print3d-dp-file-icon">🔗</div>
        <div class="print3d-dp-file-info">
          <div class="print3d-dp-file-name">${escapeHtml(print.urlDisplay || print.url)}</div>
        </div>
      </a>
    </div>
    ` : ''}
    <div class="print3d-dp-section">
      <div class="print3d-dp-sec-title">Linked Files</div>
      ${filesHtml}
    </div>
    <div class="print3d-dp-section">
      <div class="print3d-dp-sec-title">Notes</div>
      <div class="print3d-dp-notes">${escapeHtml(print.notes || '—')}</div>
    </div>
  `;
  
  const panel = document.getElementById('print3d-detail-panel');
  if (panel) panel.classList.add('open');
}

/**
 * Close print detail panel
 */
function closePrintDetail() {
  const panel = document.getElementById('print3d-detail-panel');
  if (panel) panel.classList.remove('open');
  selectedPrintId = null;
  document.querySelectorAll('#view-3d-print .print3d-card').forEach(c => c.classList.remove('selected'));
}

/**
 * Open print file
 */
function openPrintFile(fileJson) {
  try {
    const file = JSON.parse(fileJson);
    if (window.electronAPI && window.electronAPI.openFile) {
      window.electronAPI.openFile(file);
    } else if (file.share_url) {
      window.open(file.share_url, '_blank');
    } else if (file.abs_path) {
      alert('File: ' + file.abs_path);
    }
  } catch (e) {
    console.error('Error opening file:', e);
  }
}

/**
 * Open print modal
 */
function openPrintModal() {
  const backdrop = document.getElementById('print3d-modal-backdrop');
  if (backdrop) backdrop.classList.add('open');
  
  // Clear form
  const nameInput = document.getElementById('print-name');
  const categorySelect = document.getElementById('print-category');
  const prioritySelect = document.getElementById('print-priority');
  const filamentSelect = document.getElementById('print-filament');
  const colorInput = document.getElementById('print-color');
  const nozzleSelect = document.getElementById('print-nozzle');
  const estUseInput = document.getElementById('print-est-use');
  const urlInput = document.getElementById('print-url');
  const notesTextarea = document.getElementById('print-notes');
  const filesContainer = document.getElementById('print3d-files-container');
  
  if (nameInput) nameInput.value = '';
  if (categorySelect) categorySelect.value = 'Lab Equipment';
  if (prioritySelect) prioritySelect.value = 'high';
  if (filamentSelect) filamentSelect.value = 'PLA+';
  if (colorInput) colorInput.value = '';
  if (nozzleSelect) nozzleSelect.value = '0.4 mm';
  if (estUseInput) estUseInput.value = '';
  if (urlInput) urlInput.value = '';
  if (notesTextarea) notesTextarea.value = '';
  if (filesContainer) filesContainer.innerHTML = '';
}

/**
 * Close print modal
 */
function closePrintModal() {
  const backdrop = document.getElementById('print3d-modal-backdrop');
  if (backdrop) backdrop.classList.remove('open');
}

/**
 * Handle backdrop click
 */
function handlePrintBackdropClick(e) {
  if (e.target === e.currentTarget) closePrintModal();
}

/**
 * Add print
 */
async function addPrint() {
  const nameInput = document.getElementById('print-name');
  if (!nameInput) return;
  
  const name = nameInput.value.trim();
  if (!name) {
    alert('Please enter a print name');
    return;
  }
  
  // Get files using the same system as tasks/projects
  let files = [];
  const filesContainer = document.getElementById('print3d-files-container');
  if (filesContainer) {
    if (window.electronAPI && window.electronAPI.chooseFile) {
      if (window.getFileLinksNormalized) {
        files = await window.getFileLinksNormalized('print3d-files-container', 'print3d');
      } else if (window.Petal?.features?.fileOperations?.getFileLinksNormalized) {
        files = await window.Petal.features.fileOperations.getFileLinksNormalized('print3d-files-container', 'print3d');
      }
    } else {
      if (window.getFileLinks) {
        files = window.getFileLinks('print3d-files-container', 'print3d');
      } else if (window.Petal?.features?.fileOperations?.getFileLinks) {
        files = window.Petal.features.fileOperations.getFileLinks('print3d-files-container', 'print3d');
      }
    }
  }
  
  const categorySelect = document.getElementById('print-category');
  const prioritySelect = document.getElementById('print-priority');
  const filamentSelect = document.getElementById('print-filament');
  const colorInput = document.getElementById('print-color');
  const nozzleSelect = document.getElementById('print-nozzle');
  const estUseInput = document.getElementById('print-est-use');
  const urlInput = document.getElementById('print-url');
  const notesTextarea = document.getElementById('print-notes');
  
  const print = {
    id: Date.now(),
    name,
    category: categorySelect?.value || 'Lab Equipment',
    priority: prioritySelect?.value || 'high',
    filament: filamentSelect?.value || 'PLA+',
    color: colorInput?.value || '',
    nozzle: nozzleSelect?.value || '0.4 mm',
    estUse: estUseInput?.value || '',
    url: urlInput?.value || '',
    urlDisplay: urlInput?.value || '',
    notes: notesTextarea?.value || '',
    files: files,
    status: 'queued',
    dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    icon: '🖨'
  };
  
  prints3d.push(print);
  
  // Save to store
  if (window.Petal?.store) {
    window.Petal.store.setState({ prints3d });
    if (window.Petal?.persistence?.flush) {
      await window.Petal.persistence.flush();
    }
  }
  
  closePrintModal();
  render3DPrints();
  
  // Update sidebar if function exists
  if (window.renderGlobalSidebar && window.Petal?.store) {
    window.renderGlobalSidebar(window.Petal.store.getState());
  }
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
        if (tab) switchPrintTab(tab);
        break;
        
      case 'open-modal':
        openPrintModal();
        break;
        
      case 'close-modal':
      case 'close-modal-backdrop':
        if (action === 'close-modal-backdrop' && e.target !== e.currentTarget) return;
        closePrintModal();
        break;
        
      case 'open-detail':
        const printId = parseInt(btn.dataset.printId);
        if (printId) openPrintDetail(printId);
        break;
        
      case 'close-detail':
        closePrintDetail();
        break;
        
      case 'add-print':
        addPrint();
        break;
        
      case 'open-file':
        const fileJson = btn.dataset.file;
        if (fileJson) openPrintFile(fileJson);
        break;
        
      case 'add-file':
        const containerId = btn.dataset.container;
        const prefix = btn.dataset.prefix;
        if (containerId && prefix && window.addFileRow) {
          window.addFileRow(containerId, prefix);
        }
        break;
    }
  });
  
  bound = true;
}

/**
 * Render 3D Print page
 * @param {HTMLElement} container - Container element (#view-3d-print)
 * @param {Object} state - Current app state
 * @param {Object} features - Features/handlers
 */
export async function renderThreeDPrintPage(container, state, features) {
  if (!container) {
    console.error('❌ renderThreeDPrintPage: Container not provided');
    return;
  }
  
  // Inject styles (only once)
  injectStyles();
  
  // Calculate 3D print stats
  init3DPrints();
  const queueCount = prints3d.filter(p => p.status === 'queued').length;
  const printingCount = prints3d.filter(p => p.status === 'printing').length;
  const completedCount = prints3d.filter(p => p.status === 'done').length;
  
  // Render main content first
  container.innerHTML = getHTMLTemplate();
  
  // Create or find header - must be first element (after innerHTML)
  let print3dPageHeader = container.querySelector('.print3d-page-header');
  if (!print3dPageHeader) {
    print3dPageHeader = document.createElement('header');
    print3dPageHeader.className = 'print3d-page-header';
    // Insert at the very beginning of the container
    container.insertBefore(print3dPageHeader, container.firstChild);
  }
  
  // Render header
  print3dPageHeader.innerHTML = `
    <div class="print3d-page-header-title">
      <span class="print3d-page-header-name">3D Printing</span>
    </div>
    <div class="print3d-page-header-right">
      <div style="display:flex;align-items:center;gap:6px">
        <span class="print3d-page-header-status">${queueCount} queued${queueCount !== 1 ? '' : ''} · ${printingCount} printing · ${completedCount} completed</span>
      </div>
    </div>
  `;
  
  // Render detail panel and modal (append to body if not already there)
  let detailPanel = document.getElementById('print3d-detail-panel');
  if (!detailPanel) {
    const detailPanelHTML = getDetailPanelTemplate();
    container.insertAdjacentHTML('beforeend', detailPanelHTML);
    detailPanel = document.getElementById('print3d-detail-panel');
  }
  
  let modal = document.getElementById('print3d-modal-backdrop');
  if (!modal) {
    const modalHTML = getModalTemplate();
    container.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('print3d-modal-backdrop');
    
    // Update file hint
    const printFileHint = document.getElementById('print3d-file-hint');
    const printFileBtn = document.querySelector('#print3d-files-container')?.nextElementSibling;
    if (printFileHint && window.electronAPI && window.electronAPI.chooseFile) {
      printFileHint.style.display = 'block';
    }
    if (printFileBtn && window.electronAPI && window.electronAPI.chooseFile) {
      printFileBtn.textContent = '＋ Choose file';
    } else if (printFileBtn) {
      printFileBtn.textContent = '＋ Attach a file link';
    }
  }
  
  // Bind event handlers (only once)
  bind(container);
  
  // Initialize and render
  init3DPrints();
  render3DPrints();
}

/**
 * Cleanup (optional - for when page is unmounted)
 */
export function cleanupThreeDPrintPage() {
  bound = false;
  // Note: We don't remove styles as they're scoped and may be needed if page is re-rendered
}
