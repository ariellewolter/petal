// ═══════════════════════ HABITS PAGE ═══════════════════════
// Habits tracking page with monthly/yearly views and goals

import { escapeHtml } from '../utils/strings.js';
import { EmptyState, Buttons, PageHeader, StatCard } from '../ui/components.js';

// Constants
const COLORS = ['#c98b8b', '#b8a0c9', '#8ab4c9', '#8ac9a0', '#c9b88a', '#c98ab4', '#a0b8c9', '#c9a08a'];
// Emojis for habit icons (pick from grid when adding/editing a habit)
const HABIT_EMOJIS = [
  '📝', '🌿', '💪', '🏃', '🧘', '😴', '💧', '🥗', '📚', '🎯',
  '✨', '🔥', '🌟', '💡', '🎨', '🎵', '📖', '☀️', '🌙', '🌅',
  '🧠', '💆', '🚴', '🏋️', '⛹️', '🧘‍♀️', '💊', '🍎', '🥑', '☕',
  '🛏️', '🧹', '📱', '💻', '✍️', '🎓', '🔬', '🏠', '🌱', '🌸',
  '🐕', '🐈', '🕯️', '📿', '🧴', '🪥', '🧺', '🛒', '💰', '❤️',
  '🧩', '🎮', '🖼️', '📷', '🌍', '⏰', '✅', '◎', '✦', '◆'
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// State
let habits = [];
let completions = {}; // { habitId: { 'YYYY-MM-DD': true } }
let currentTab = 'monthly';
let selectedHabitId = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let viewYear = new Date().getFullYear();
let stylesInjected = false;

/**
 * Inject scoped CSS styles (only once)
 */
function injectStyles() {
  if (stylesInjected) return;
  
  const styleId = 'habits-styles';
  if (document.getElementById(styleId)) {
    stylesInjected = true;
    return;
  }
  
  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    /* ── HABITS PAGE STYLES ── */
    /* Note: Container padding and layout are handled by main.css */
    /* This file only contains Habits-specific component styles */

    /* Stats */
    #view-habits .habits-stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 28px;
    }
    @media (max-width: 700px) {
      #view-habits .habits-stats-row {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    #view-habits .habits-stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 20px;
      position: relative;
      overflow: hidden;
    }
    #view-habits .habits-stat-card::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
    }
    #view-habits .habits-stat-card.s1::after { background: var(--rose); }
    #view-habits .habits-stat-card.s2::after { background: var(--sage); }
    #view-habits .habits-stat-card.s3::after { background: var(--mauve); }
    #view-habits .habits-stat-card.s4::after { background: linear-gradient(90deg, var(--rose), var(--mauve)); }
    #view-habits .habits-stat-label {
      font-size: 9px;
      letter-spacing: .14em;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-bottom: 8px;
    }
    #view-habits .habits-stat-value {
      font-family: 'Cormorant Garamond', serif;
      font-size: 32px;
      font-weight: 400;
      line-height: 1;
      color: var(--text);
    }
    #view-habits .habits-stat-sub {
      font-size: 10px;
      color: var(--text-dim);
      margin-top: 5px;
    }

    /* Toolbar */
    #view-habits .habits-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 28px;
    }
    #view-habits .habits-tabs {
      display: flex;
      gap: 2px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 11px;
      padding: 4px;
    }
    #view-habits .habits-tab {
      background: none;
      border: none;
      border-radius: 8px;
      color: var(--text-dim);
      font-family: 'Jost', sans-serif;
      font-size: 11px;
      font-weight: 400;
      letter-spacing: .12em;
      text-transform: uppercase;
      padding: 7px 18px;
      cursor: pointer;
      transition: all .18s;
      white-space: nowrap;
    }
    #view-habits .habits-tab.active {
      background: var(--rose-pale);
      color: var(--rose);
    }
    #view-habits .habits-tab:hover:not(.active) {
      color: var(--text);
    }
    #view-habits .habits-btn-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    #view-habits .habits-btn-primary {
      background: linear-gradient(135deg, #d4a0a0 0%, #c98b8b 100%);
      border: none;
      border-radius: 9px;
      color: white;
      font-family: 'Jost', sans-serif;
      font-size: 12px;
      letter-spacing: .1em;
      text-transform: uppercase;
      padding: 9px 20px;
      cursor: pointer;
      transition: all .2s;
      box-shadow: 0 2px 8px rgba(201, 139, 139, .25);
    }
    #view-habits .habits-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(201, 139, 139, .35);
    }
    #view-habits .habits-btn-ghost {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 9px;
      color: var(--text);
      font-family: 'Jost', sans-serif;
      font-size: 12px;
      letter-spacing: .1em;
      text-transform: uppercase;
      padding: 9px 18px;
      cursor: pointer;
      transition: all .2s;
    }
    #view-habits .habits-btn-ghost:hover {
      border-color: var(--rose-soft);
      color: var(--rose);
    }
    #view-habits .habits-btn-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-dim);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all .15s;
      line-height: 1;
    }
    #view-habits .habits-btn-icon:hover {
      border-color: var(--rose-soft);
      color: var(--rose);
      background: var(--rose-pale);
    }

    /* Monthly Layout */
    #view-habits .habits-monthly-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 22px;
      align-items: start;
    }
    @media (max-width: 860px) {
      #view-habits .habits-monthly-layout {
        grid-template-columns: 1fr;
      }
    }
    #view-habits .habits-habit-list-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
    }
    #view-habits .habits-habit-list-head {
      padding: 14px 18px 12px;
      border-bottom: 1px solid var(--border);
      font-family: 'Cormorant Garamond', serif;
      font-size: 14px;
      font-style: italic;
      color: var(--text-dim);
    }
    #view-habits .habits-habit-list-item {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 13px 18px;
      cursor: pointer;
      transition: all .15s;
      border-bottom: 1px solid var(--border);
      position: relative;
      user-select: none;
    }
    #view-habits .habits-habit-list-item:last-child {
      border-bottom: none;
    }
    #view-habits .habits-habit-list-item:hover {
      background: var(--bg2);
    }
    #view-habits .habits-habit-list-item.active {
      background: var(--rose-pale);
    }
    #view-habits .habits-habit-list-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--rose);
      border-radius: 0 2px 2px 0;
    }
    #view-habits .habits-habit-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    #view-habits .habits-habit-list-name {
      font-size: 13px;
      font-weight: 400;
      color: var(--text);
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #view-habits .habits-habit-list-streak {
      font-size: 11px;
      color: var(--text-dim);
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 2px 8px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    #view-habits .habits-habit-list-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    #view-habits .habits-habit-list-actions button {
      background: none;
      border: none;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      color: var(--text-dim);
      cursor: pointer;
      transition: color 0.13s, background 0.13s;
    }
    #view-habits .habits-habit-list-actions button:hover {
      color: var(--text);
      background: var(--bg2);
    }
    #view-habits .habits-habit-list-actions button.habits-btn-delete:hover {
      color: var(--overdue);
      background: var(--rose-pale);
    }

    /* Calendar */
    #view-habits .habits-calendar-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
    }
    #view-habits .habits-calendar-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 22px;
      border-bottom: 1px solid var(--border);
    }
    #view-habits .habits-calendar-month-label {
      font-family: 'Cormorant Garamond', serif;
      font-size: 21px;
      font-weight: 400;
      color: var(--text);
    }
    #view-habits .habits-cal-nav-btns {
      display: flex;
      gap: 8px;
    }
    #view-habits .habits-calendar-body {
      padding: 18px 22px 22px;
    }
    #view-habits .habits-cal-habit-info {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }
    #view-habits .habits-cal-habit-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
    }
    #view-habits .habits-cal-habit-actions button {
      background: none;
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      color: var(--text-dim);
      cursor: pointer;
      transition: color 0.13s, background 0.13s, border-color 0.13s;
    }
    #view-habits .habits-cal-habit-actions button:hover {
      color: var(--text);
      background: var(--bg2);
      border-color: var(--border2);
    }
    #view-habits .habits-cal-habit-actions button.habits-btn-delete:hover {
      color: var(--overdue);
      border-color: var(--rose);
      background: var(--rose-pale);
    }
    #view-habits .habits-cal-habit-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      color: var(--text);
    }
    #view-habits .habits-cal-dow-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin-bottom: 8px;
    }
    #view-habits .habits-cal-dow {
      text-align: center;
      font-size: 9px;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--text-dim);
      padding: 4px 0;
    }
    #view-habits .habits-cal-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
    }
    #view-habits .habits-cal-day {
      aspect-ratio: 1;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      font-size: 12px;
      transition: all .15s;
      position: relative;
      user-select: none;
      border: 1px solid transparent;
    }
    #view-habits .habits-cal-day.empty {
      visibility: hidden;
    }
    #view-habits .habits-cal-day.future {
      color: var(--text-light);
      cursor: default;
    }
    #view-habits .habits-cal-day.past {
      cursor: pointer;
    }
    #view-habits .habits-cal-day.past:hover {
      background: var(--bg2);
      border-color: var(--border);
    }
    #view-habits .habits-cal-day.today {
      border-color: var(--rose-soft) !important;
    }
    #view-habits .habits-cal-day.done {
      background: var(--rose-pale);
      border-color: var(--rose-soft) !important;
      color: var(--rose);
    }
    #view-habits .habits-cal-day.done:hover {
      background: #f0e0e0;
    }
    #view-habits .habits-cal-day-num {
      line-height: 1;
      font-weight: 400;
    }
    #view-habits .habits-cal-day-tick {
      font-size: 8px;
      margin-top: 2px;
      opacity: 0;
      transition: opacity .1s;
    }
    #view-habits .habits-cal-day.done .habits-cal-day-tick {
      opacity: 1;
    }
    @keyframes habitsPop {
      0% { transform: scale(1); }
      50% { transform: scale(1.18); }
      100% { transform: scale(1); }
    }
    #view-habits .habits-cal-day.popped {
      animation: habitsPop .25s ease;
    }

    /* Streak Banner */
    #view-habits .habits-streak-banner {
      display: flex;
      align-items: center;
      gap: 18px;
      background: var(--rose-pale);
      border: 1px solid var(--rose-soft);
      border-radius: 13px;
      padding: 16px 22px;
      margin-top: 16px;
    }
    #view-habits .habits-streak-flame {
      font-size: 30px;
    }
    #view-habits .habits-streak-info {
      flex: 1;
    }
    #view-habits .habits-streak-num {
      font-family: 'Cormorant Garamond', serif;
      font-size: 30px;
      font-weight: 400;
      color: var(--rose);
      line-height: 1;
    }
    #view-habits .habits-streak-lbl {
      font-size: 9px;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-top: 2px;
    }
    #view-habits .habits-streak-right {
      text-align: right;
    }

    /* Yearly Layout */
    #view-habits .habits-yearly-layout {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    #view-habits .habits-yearly-habit-block {
      animation: habitsFadeUp .3s ease both;
    }
    @keyframes habitsFadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #view-habits .habits-yearly-habit-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    #view-habits .habits-yearly-habit-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 19px;
      font-weight: 400;
      color: var(--text);
    }
    #view-habits .habits-yearly-rate {
      font-size: 11px;
      color: var(--text-dim);
      margin-left: auto;
    }
    #view-habits .habits-yearly-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 22px;
      overflow-x: auto;
    }
    #view-habits .habits-yearly-month-row {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 6px;
      min-width: 580px;
    }
    #view-habits .habits-yearly-month-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    #view-habits .habits-yearly-month-lbl {
      font-size: 9px;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: var(--text-dim);
      text-align: center;
      margin-bottom: 6px;
    }
    #view-habits .habits-yearly-week-rows {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    #view-habits .habits-yearly-week {
      display: flex;
      gap: 2px;
    }
    #view-habits .habits-ycell {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      flex-shrink: 0;
      transition: all .15s;
    }
    #view-habits .habits-ycell.empty-pad {
      background: transparent;
    }
    #view-habits .habits-ycell.future {
      background: var(--bg2);
      opacity: .4;
    }
    #view-habits .habits-ycell.missed {
      background: var(--bg2);
    }
    #view-habits .habits-ycell.done {
      background: var(--rose-soft);
    }
    #view-habits .habits-ycell:not(.empty-pad):not(.future):hover {
      transform: scale(1.3);
      cursor: default;
    }
    #view-habits .habits-yearly-progress-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 14px;
    }
    #view-habits .habits-progress-track {
      flex: 1;
      height: 5px;
      border-radius: 3px;
      background: var(--bg2);
      overflow: hidden;
    }
    #view-habits .habits-progress-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, var(--rose-soft), var(--rose));
      transition: width .8s ease;
    }
    #view-habits .habits-progress-lbl {
      font-size: 11px;
      color: var(--text-dim);
      white-space: nowrap;
    }

    /* Goals Layout */
    #view-habits .habits-goals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    #view-habits .habits-goal-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 22px;
      position: relative;
      overflow: hidden;
      transition: all .2s;
      cursor: default;
      animation: habitsFadeUp .3s ease both;
    }
    #view-habits .habits-goal-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      border-radius: 18px 0 0 18px;
    }
    #view-habits .habits-goal-card.cat-health::before { background: #8ab89a; }
    #view-habits .habits-goal-card.cat-mind::before { background: var(--mauve); }
    #view-habits .habits-goal-card.cat-body::before { background: var(--rose); }
    #view-habits .habits-goal-card.cat-social::before { background: #8ab0c8; }
    #view-habits .habits-goal-card.cat-creative::before { background: #c8b88a; }
    #view-habits .habits-goal-card:hover {
      box-shadow: 0 6px 28px rgba(90, 70, 60, .08);
      transform: translateY(-2px);
    }
    #view-habits .habits-goal-head {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 18px;
    }
    #view-habits .habits-goal-icon {
      width: 46px;
      height: 46px;
      border-radius: 13px;
      background: var(--bg2);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 23px;
      flex-shrink: 0;
    }
    #view-habits .habits-goal-title-wrap {
      flex: 1;
    }
    #view-habits .habits-goal-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 19px;
      font-weight: 400;
      color: var(--text);
      line-height: 1.3;
    }
    #view-habits .habits-goal-cat {
      font-size: 9px;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-top: 4px;
    }
    #view-habits .habits-goal-progress-nums {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 9px;
    }
    #view-habits .habits-goal-current {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      font-weight: 400;
      color: var(--text);
      line-height: 1;
    }
    #view-habits .habits-goal-target {
      font-size: 11px;
      color: var(--text-dim);
    }
    #view-habits .habits-goal-track {
      height: 8px;
      background: var(--bg2);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    #view-habits .habits-goal-fill {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, var(--rose-soft), var(--rose));
      transition: width .8s ease;
    }
    #view-habits .habits-goal-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    #view-habits .habits-goal-chip {
      font-size: 10px;
      color: var(--text-dim);
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 3px 11px;
    }
    #view-habits .habits-goal-chip.done {
      color: var(--rose);
      border-color: var(--rose-soft);
      background: var(--rose-pale);
    }
    #view-habits .habits-goal-actions {
      position: absolute;
      top: 14px;
      right: 14px;
      display: flex;
      gap: 6px;
      opacity: 0;
      transition: opacity .15s;
    }
    #view-habits .habits-goal-card:hover .habits-goal-actions {
      opacity: 1;
    }
    #view-habits .habits-action-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text-dim);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: all .15s;
    }
    #view-habits .habits-action-btn:hover {
      border-color: var(--rose-soft);
      color: var(--rose);
      background: var(--rose-pale);
    }

    /* Empty State */
    #view-habits .habits-empty-state {
      text-align: center;
      padding: 70px 20px;
      color: var(--text-dim);
      grid-column: 1 / -1;
    }
    #view-habits .habits-empty-icon {
      font-size: 52px;
      margin-bottom: 16px;
      opacity: .25;
    }
    #view-habits .habits-empty-msg {
      font-size: 14px;
      margin-bottom: 20px;
      line-height: 1.6;
    }

    /* Modal */
    #view-habits .habits-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(80, 65, 58, .55);
      backdrop-filter: blur(5px);
      z-index: 400;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s;
    }
    #view-habits .habits-modal-backdrop.open {
      opacity: 1;
      pointer-events: all;
    }
    #view-habits .habits-modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      width: 520px;
      max-width: 95vw;
      box-shadow: 0 24px 64px rgba(0, 0, 0, .25);
      animation: habitsModalIn .25s ease;
    }
    @keyframes habitsModalIn {
      from { opacity: 0; transform: scale(.95) translateY(14px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    #view-habits .habits-modal-head {
      padding: 22px 26px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #view-habits .habits-modal-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 21px;
      font-weight: 400;
      color: var(--text);
    }
    #view-habits .habits-modal-close {
      width: 30px;
      height: 30px;
      border-radius: 7px;
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
    #view-habits .habits-modal-close:hover {
      border-color: var(--rose);
      color: var(--rose);
      background: var(--rose-pale);
    }
    #view-habits .habits-modal-body {
      padding: 22px 26px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-height: 65vh;
      overflow-y: auto;
    }
    #view-habits .habits-modal-foot {
      padding: 16px 26px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    #view-habits .habits-form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    #view-habits .habits-form-group {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    #view-habits .habits-form-group.full {
      grid-column: 1 / -1;
    }
    #view-habits .habits-form-label {
      font-size: 9px;
      letter-spacing: .13em;
      text-transform: uppercase;
      color: var(--text-dim);
    }
    #view-habits .habits-form-input,
    #view-habits .habits-form-select {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 10px 13px;
      font-family: 'Jost', sans-serif;
      font-size: 13px;
      color: var(--text);
      outline: none;
      transition: border-color .15s;
      width: 100%;
    }
    #view-habits .habits-form-input:focus,
    #view-habits .habits-form-select:focus {
      border-color: var(--rose-soft);
      box-shadow: 0 0 0 3px rgba(201, 139, 139, .09);
    }
    #view-habits .habits-form-input::placeholder {
      color: var(--text-light);
    }
    #view-habits .habits-form-hint {
      display: block;
      font-size: 10px;
      color: var(--text-dim);
      margin-top: 4px;
    }
    #view-habits .habits-mfbtn {
      padding: 9px 20px;
      border-radius: 9px;
      font-family: 'Jost', sans-serif;
      font-size: 12px;
      cursor: pointer;
      transition: all .15s;
    }
    #view-habits .habits-mfbtn.cancel {
      background: var(--bg2);
      border: 1px solid var(--border);
      color: var(--text);
    }
    #view-habits .habits-mfbtn.cancel:hover {
      border-color: var(--border2);
    }
    #view-habits .habits-mfbtn.save {
      background: linear-gradient(135deg, #d4a0a0 0%, #c98b8b 100%);
      border: none;
      color: white;
      box-shadow: 0 2px 8px rgba(201, 139, 139, .2);
    }
    #view-habits .habits-mfbtn.save:hover {
      box-shadow: 0 4px 12px rgba(201, 139, 139, .3);
      transform: translateY(-1px);
    }
    #view-habits .habits-color-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }
    #view-habits .habits-cswatch {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      transition: all .15s;
      border: 2.5px solid transparent;
      flex-shrink: 0;
    }
    #view-habits .habits-cswatch.sel {
      border-color: var(--text);
      transform: scale(1.15);
    }
    #view-habits .habits-emoji-grid {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      max-height: 140px;
      overflow-y: auto;
      padding: 10px;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    #view-habits .habits-emoji-grid::-webkit-scrollbar { width: 4px; }
    #view-habits .habits-emoji-grid::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    #view-habits .habits-epick {
      font-size: 20px;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
      border: 1.5px solid transparent;
      transition: all .11s;
      background: none;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      min-height: 36px;
      flex-shrink: 0;
    }
    #view-habits .habits-epick:hover {
      background: var(--surface);
      border-color: var(--border);
    }
    #view-habits .habits-epick.on {
      border-color: var(--rose-soft);
      background: var(--rose-pale);
    }
    #view-habits .habits-freq-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    #view-habits .habits-fpill {
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-family: 'Jost', sans-serif;
      border: 1px solid var(--border);
      background: var(--bg2);
      color: var(--text-dim);
      cursor: pointer;
      transition: all .15s;
    }
    #view-habits .habits-fpill.sel {
      background: var(--rose-pale);
      border-color: var(--rose-soft);
      color: var(--rose);
    }
    #view-habits .habits-goal-update-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 12px;
    }
    #view-habits .habits-goal-update-row input {
      width: 70px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 10px;
      font-family: 'Jost', sans-serif;
      font-size: 13px;
      color: var(--text);
      outline: none;
    }
    #view-habits .habits-goal-update-row input:focus {
      border-color: var(--rose-soft);
    }
    #view-habits .habits-btn-small {
      padding: 6px 14px;
      border-radius: 7px;
      font-size: 11px;
      background: linear-gradient(135deg, #d4a0a0 0%, #c98b8b 100%);
      border: none;
      color: white;
      cursor: pointer;
      font-family: 'Jost', sans-serif;
      transition: all .15s;
    }
    #view-habits .habits-btn-small:hover {
      transform: translateY(-1px);
    }

    @media (max-width: 600px) {
      #view-habits .habits-main {
        padding: 20px 16px 60px;
      }
      #view-habits .habits-form-row {
        grid-template-columns: 1fr;
      }
      #view-habits .habits-form-group.full {
        grid-column: 1;
      }
    }
  `;
  document.head.appendChild(styleEl);
  stylesInjected = true;
}

/**
 * Helper functions
 */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateStr(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function getStreak(habitId) {
  const comp = completions[habitId] || {};
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (comp[key]) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function getCompletionRate(habitId, year) {
  const comp = completions[habitId] || {};
  const today = new Date();
  let total = 0, done = 0;
  for (let m = 0; m < 12; m++) {
    if (year === today.getFullYear() && m > today.getMonth()) break;
    const days = daysInMonth(year, m);
    for (let d = 1; d <= days; d++) {
      if (year === today.getFullYear() && m === today.getMonth() && d > today.getDate()) break;
      total++;
      if (comp[dateStr(year, m, d)]) done++;
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/**
 * Initialize data from store
 */
function initData() {
  if (window.Petal?.store) {
    const state = window.Petal.store.getState();
    habits = state.habits || [];
    completions = state.habitCheckins || {};
    
    // Ensure data exists in store if it doesn't
    if (!state.habits) {
      window.Petal.store.setState({ habits: [] });
    }
    if (!state.habitCheckins) {
      window.Petal.store.setState({ habitCheckins: {} });
    }
  } else {
    habits = [];
    completions = {};
  }
  
  // Ensure currentTab is valid (default to monthly if it was 'goals')
  if (currentTab === 'goals') {
    currentTab = 'monthly';
  }
}

/**
 * Save data to store
 */
async function saveData() {
  if (window.Petal?.store) {
    window.Petal.store.setState({
      habits,
      habitCheckins: completions
    });
    if (window.Petal?.persistence?.flush) {
      await window.Petal.persistence.flush();
    }
  }
}

/**
 * Render stats using standard StatCard component
 */
function renderStats() {
  const today = todayStr();
  const totalH = habits.length;
  const doneToday = habits.filter(h => (completions[h.id] || {})[today]).length;
  const bestStreak = habits.reduce((mx, h) => Math.max(mx, getStreak(h.id)), 0);
  const totalCompletions = Object.values(completions).reduce((sum, comp) => sum + Object.keys(comp).length, 0);

  const statsRow = document.getElementById('habits-stats-row');
  if (!statsRow) return;

  // Use standard StatCard component like other pages
  statsRow.innerHTML = `
    ${StatCard({
      label: 'Habits',
      value: String(totalH),
      subtitle: 'being tracked',
      variant: 1
    })}
    ${StatCard({
      label: 'Today',
      value: `${doneToday}/${totalH}`,
      subtitle: 'completed',
      variant: 2
    })}
    ${StatCard({
      label: 'Best Streak',
      value: String(bestStreak),
      subtitle: 'days in a row',
      variant: 3
    })}
    ${StatCard({
      label: 'Total',
      value: String(totalCompletions),
      subtitle: 'completions',
      variant: 4
    })}
  `;

  // Update header status if it exists
  const navStatus = document.getElementById('habits-nav-status');
  if (navStatus) {
    navStatus.textContent = `${doneToday} / ${totalH} today`;
  }
  
  // Also update page header status
  const container = document.getElementById('view-habits');
  const pageHeaderStatus = container?.querySelector('.page-header .page-header-status');
  if (pageHeaderStatus) {
    pageHeaderStatus.textContent = `${doneToday} / ${totalH} today`;
  }
}

/**
 * Render monthly view
 */
function renderMonthly() {
  const viewArea = document.getElementById('habits-view-area');
  if (!viewArea) return;

  if (habits.length === 0) {
    viewArea.innerHTML = EmptyState({
      icon: '🌱',
      message: 'No habits yet',
      subtitle: 'Add your first habit to start tracking!',
      action: { text: '+ Add Habit', action: 'open-modal', dataAttrs: { modalType: 'habit' } }
    });
    return;
  }

  const selId = selectedHabitId || habits[0].id;
  selectedHabitId = selId;
  const habit = habits.find(h => h.id === selId) || habits[0];
  const comp = completions[habit.id] || {};
  const yr = currentYear;
  const mo = currentMonth;
  const today = new Date();
  const numDays = daysInMonth(yr, mo);
  const firstDow = new Date(yr, mo, 1).getDay();

  // Build calendar
  let cells = '';
  for (let i = 0; i < firstDow; i++) {
    cells += `<div class="habits-cal-day empty"></div>`;
  }
  for (let d = 1; d <= numDays; d++) {
    const key = dateStr(yr, mo, d);
    const cellDate = new Date(yr, mo, d);
    const isFuture = cellDate > today;
    const isToday = (today.getFullYear() === yr && today.getMonth() === mo && today.getDate() === d);
    const isDone = !!comp[key];
    const cls = ['habits-cal-day', isFuture ? 'future' : 'past', isDone ? 'done' : '', isToday ? 'today' : ''].filter(Boolean).join(' ');
    cells += `<div class="${cls}" data-date="${key}" data-hid="${habit.id}">
      <div class="habits-cal-day-num">${d}</div>
      <div class="habits-cal-day-tick">✓</div>
    </div>`;
  }

  // Streak
  const streak = getStreak(habit.id);
  const monthDone = Object.keys(comp).filter(k => k.startsWith(`${yr}-${pad(mo + 1)}`)).length;

  // Habit list
  const listItems = habits.map(h => {
    const s = getStreak(h.id);
    const hidEsc = escapeHtml(String(h.id));
    return `<div class="habits-habit-list-item ${h.id === selId ? 'active' : ''}" data-action="select-habit" data-hid="${hidEsc}">
      <div class="habits-habit-dot" style="background:${h.color || COLORS[0]}"></div>
      <div class="habits-habit-list-name">${escapeHtml(h.icon || '📝')} ${escapeHtml(h.name)}${(h.durationMin != null && h.durationMin > 0) ? ` · ${h.durationMin} min` : ''}</div>
      ${s > 0 ? `<div class="habits-habit-list-streak">🔥 ${s}</div>` : ''}
      <div class="habits-habit-list-actions">
        <button type="button" data-action="edit-habit" data-hid="${hidEsc}" title="Edit habit">Edit</button>
        <button type="button" data-action="delete-habit" data-hid="${hidEsc}" class="habits-btn-delete" title="Delete habit">Delete</button>
      </div>
    </div>`;
  }).join('');

  viewArea.innerHTML = `
    <div class="habits-monthly-layout">
      <div class="habits-habit-list-panel">
        <div class="habits-habit-list-head">My Habits</div>
        ${listItems}
      </div>
      <div>
        <div class="habits-calendar-panel">
          <div class="habits-calendar-nav">
            <div class="habits-calendar-month-label">${MONTHS_FULL[mo]} ${yr}</div>
            <div class="habits-cal-nav-btns">
              <button class="habits-btn-icon" data-action="prev-month">‹</button>
              <button class="habits-btn-icon" data-action="next-month">›</button>
            </div>
          </div>
          <div class="habits-calendar-body">
            <div class="habits-cal-habit-info">
              <div class="habits-habit-dot" style="background:${habit.color || COLORS[0]};width:12px;height:12px;"></div>
              <div class="habits-cal-habit-name">${escapeHtml(habit.icon || '📝')} ${escapeHtml(habit.name)}${habit.timeOfDay ? ` · ${escapeHtml(habit.timeOfDay)}` : ''}${(habit.durationMin != null && habit.durationMin > 0) ? ` · ${habit.durationMin} min` : ''}</div>
              ${habit.freq ? `<div style="font-size:10px;color:var(--text-dim);margin-left:8px;background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:2px 9px;">${escapeHtml(habit.freq)}</div>` : ''}
              <div class="habits-cal-habit-actions">
                <button type="button" data-action="edit-habit" data-hid="${escapeHtml(String(habit.id))}" title="Edit habit">Edit</button>
                <button type="button" data-action="delete-habit" data-hid="${escapeHtml(String(habit.id))}" class="habits-btn-delete" title="Delete habit">Delete</button>
              </div>
            </div>
            <div class="habits-cal-dow-row">${DAYS_OF_WEEK.map(d => `<div class="habits-cal-dow">${d}</div>`).join('')}</div>
            <div class="habits-cal-days">${cells}</div>
          </div>
        </div>
        <div class="habits-streak-banner">
          <div class="habits-streak-flame">🔥</div>
          <div class="habits-streak-info">
            <div class="habits-streak-num">${streak}</div>
            <div class="habits-streak-lbl">current streak</div>
          </div>
          <div class="habits-streak-right">
            <div class="habits-streak-num" style="font-size:22px;">${monthDone}</div>
            <div class="habits-streak-lbl">this month</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render yearly view
 */
function renderYearly() {
  const viewArea = document.getElementById('habits-view-area');
  if (!viewArea) return;

  if (habits.length === 0) {
    viewArea.innerHTML = EmptyState({
      icon: '📅',
      message: 'Add habits to see your yearly overview!',
      action: { text: '+ Add Habit', action: 'open-modal', dataAttrs: { modalType: 'habit' } }
    });
    return;
  }

  const yr = viewYear;
  const today = new Date();

  const blocks = habits.map((habit, idx) => {
    const comp = completions[habit.id] || {};
    const rate = getCompletionRate(habit.id, yr);
    const streak = getStreak(habit.id);

    // Build month columns
    const monthCols = MONTHS_SHORT.map((mlbl, mi) => {
      const numDays = daysInMonth(yr, mi);
      const firstDow = new Date(yr, mi, 1).getDay();
      let allCells = [];
      for (let i = 0; i < firstDow; i++) allCells.push('empty-pad');
      for (let d = 1; d <= numDays; d++) {
        const key = dateStr(yr, mi, d);
        const cellDate = new Date(yr, mi, d);
        const isFuture = cellDate > today;
        if (isFuture) allCells.push('future');
        else allCells.push(comp[key] ? 'done' : 'missed');
      }
      let weeks = [];
      for (let i = 0; i < allCells.length; i += 7) weeks.push(allCells.slice(i, i + 7));
      while (weeks[weeks.length - 1] && weeks[weeks.length - 1].length < 7)
        weeks[weeks.length - 1].push('empty-pad');

      const weeksHTML = weeks.map(wk =>
        `<div class="habits-yearly-week">${wk.map(c => `<div class="habits-ycell ${c}"></div>`).join('')}</div>`
      ).join('');

      return `<div class="habits-yearly-month-col">
        <div class="habits-yearly-month-lbl">${mlbl}</div>
        <div class="habits-yearly-week-rows">${weeksHTML}</div>
      </div>`;
    }).join('');

    return `<div class="habits-yearly-habit-block" style="animation-delay:${idx * .07}s">
      <div class="habits-yearly-habit-header">
        <div class="habits-habit-dot" style="background:${habit.color || COLORS[0]};width:12px;height:12px;"></div>
        <div class="habits-yearly-habit-name">${escapeHtml(habit.icon || '📝')} ${escapeHtml(habit.name)}${habit.timeOfDay ? ` · ${escapeHtml(habit.timeOfDay)}` : ''}${(habit.durationMin != null && habit.durationMin > 0) ? ` · ${habit.durationMin} min` : ''}</div>
        ${streak > 0 ? `<div class="habits-habit-list-streak">🔥 ${streak} day streak</div>` : ''}
        <div class="habits-yearly-rate">${rate}% this year</div>
      </div>
      <div class="habits-yearly-panel">
        <div class="habits-yearly-month-row">${monthCols}</div>
        <div class="habits-yearly-progress-row">
          <div class="habits-progress-track"><div class="habits-progress-fill" style="width:${rate}%"></div></div>
          <div class="habits-progress-lbl">${rate}% completion</div>
        </div>
      </div>
    </div>`;
  }).join('');

  viewArea.innerHTML = `<div class="habits-yearly-layout">${blocks}</div>`;
}


/**
 * Render all views
 */
function renderAll() {
  renderStats();
  
  const toolbarBtns = document.getElementById('habits-toolbar-btns');
  if (toolbarBtns) {
    toolbarBtns.innerHTML = `<button class="habits-btn-ghost" data-action="open-modal" data-modal-type="habit">+ Add Habit</button>`;
  }

  const yearNav = document.getElementById('habits-year-nav');
  if (yearNav) {
    if (currentTab === 'yearly') {
      yearNav.style.display = 'flex';
      const yearLabel = document.getElementById('habits-year-label');
      if (yearLabel) yearLabel.textContent = viewYear;
    } else {
      yearNav.style.display = 'none';
    }
  }

  if (currentTab === 'monthly') renderMonthly();
  else if (currentTab === 'yearly') renderYearly();
  else renderMonthly(); // Default to monthly if invalid tab
}

/**
 * Get modal template
 */
function getModalTemplate(mode) {
  // Only habit mode is supported now (goals have their own page)
  return `
    <div class="habits-form-row">
      <div class="habits-form-group full">
        <label class="habits-form-label">Habit Name</label>
        <input class="habits-form-input" id="habits-m-name" placeholder="e.g. Morning meditation" autofocus>
      </div>
    </div>
    <div class="habits-form-row">
      <div class="habits-form-group full">
        <label class="habits-form-label">Emoji Icon</label>
        <div class="habits-emoji-grid" id="habits-emoji-grid">
          ${HABIT_EMOJIS.map((e, i) => `<button type="button" class="habits-epick ${i === 0 ? 'on' : ''}" data-e="${escapeHtml(e)}">${escapeHtml(e)}</button>`).join('')}
        </div>
      </div>
      <div class="habits-form-group">
        <label class="habits-form-label">Color</label>
        <div class="habits-color-row" id="habits-color-row">
          ${COLORS.map((c, i) => `<div class="habits-cswatch ${i === 0 ? 'sel' : ''}" style="background:${c}" data-c="${c}"></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="habits-form-row">
      <div class="habits-form-group full">
        <label class="habits-form-label">Frequency</label>
        <div class="habits-freq-row">
          <div class="habits-fpill sel" data-f="daily">Daily</div>
          <div class="habits-fpill" data-f="weekdays">Weekdays</div>
          <div class="habits-fpill" data-f="weekends">Weekends</div>
          <div class="habits-fpill" data-f="3× / week">3× / week</div>
        </div>
      </div>
    </div>
    <div class="habits-form-row">
      <div class="habits-form-group">
        <label class="habits-form-label">Set time (optional)</label>
        <input class="habits-form-input" id="habits-m-time" type="time" title="Preferred time of day for this habit">
      </div>
      <div class="habits-form-group">
        <label class="habits-form-label">Time to complete</label>
        <input class="habits-form-input" id="habits-m-duration" type="number" min="1" max="480" placeholder="e.g. 15" title="Minutes (used when you drag this habit onto the calendar)">
        <span class="habits-form-hint">minutes — used when scheduling on calendar</span>
      </div>
    </div>
    <div class="habits-form-row">
      <div class="habits-form-group full">
        <label class="habits-form-label">Notes (optional)</label>
        <textarea class="habits-form-input" id="habits-m-notes" placeholder="Why this habit matters…" style="min-height:68px;resize:vertical;"></textarea>
      </div>
    </div>
  `;
}

/**
 * Open modal (optionally for editing a habit)
 * @param {string} mode - 'habit' etc.
 * @param {string|number} [habitId] - If provided, open in edit mode with form pre-filled
 */
let editingHabitId = null;
let modalMode = 'habit';
let selectedColor = COLORS[0];
let selectedFreq = 'daily';

function openModal(mode, habitId) {
  modalMode = mode;
  editingHabitId = habitId != null ? habitId : null;
  const habit = editingHabitId != null ? habits.find(h => String(h.id) === String(editingHabitId)) : null;
  
  selectedColor = (habit && habit.color) ? habit.color : COLORS[0];
  selectedFreq = (habit && habit.freq) ? habit.freq : 'daily';
  
  // Find modal in the container (should always exist after render)
  const container = document.getElementById('view-habits');
  if (!container) {
    console.error('❌ Habits container not found');
    return;
  }
  
  // Ensure only one modal exists (safety check - should never be needed)
  const allModals = container.querySelectorAll('#habits-modal-backdrop');
  if (allModals.length > 1) {
    console.warn(`⚠️ Found ${allModals.length} modals, removing duplicates`);
    for (let i = 1; i < allModals.length; i++) {
      allModals[i].remove();
    }
  }
  
  let modalBackdrop = container.querySelector('#habits-modal-backdrop');
  let modalTitle = container.querySelector('#habits-modal-title');
  let modalSave = container.querySelector('#habits-modal-save');
  let modalBody = container.querySelector('#habits-modal-body');
  
  if (!modalTitle || !modalSave || !modalBody || !modalBackdrop) {
    console.error('❌ Habits modal elements not found:', {
      modalTitle: !!modalTitle,
      modalSave: !!modalSave,
      modalBody: !!modalBody,
      modalBackdrop: !!modalBackdrop
    });
    return;
  }
  
  modalTitle.textContent = editingHabitId ? 'Edit Habit' : 'Add Habit';
  modalSave.textContent = editingHabitId ? 'Save' : 'Add Habit';
  modalBody.innerHTML = getModalTemplate(mode);
  modalBackdrop.classList.add('open');
  
  // Pre-fill form when editing
  if (habit) {
    const nameInput = document.getElementById('habits-m-name');
    if (nameInput) nameInput.value = habit.name || '';
    const durationInput = document.getElementById('habits-m-duration');
    if (durationInput && habit.durationMin != null) durationInput.value = String(habit.durationMin);
    const timeInput = document.getElementById('habits-m-time');
    if (timeInput && habit.timeOfDay) timeInput.value = habit.timeOfDay;
    const notesInput = document.getElementById('habits-m-notes');
    if (notesInput) notesInput.value = habit.notes || '';
    const colorRow = document.getElementById('habits-color-row');
    if (colorRow) {
      const swatch = colorRow.querySelector(`[data-c="${habit.color || COLORS[0]}"]`);
      colorRow.querySelectorAll('.habits-cswatch').forEach(x => x.classList.remove('sel'));
      if (swatch) swatch.classList.add('sel');
    }
    const freqPill = modalBody.querySelector(`.habits-fpill[data-f="${habit.freq || 'daily'}"]`);
    modalBody.querySelectorAll('.habits-fpill').forEach(x => x.classList.remove('sel'));
    if (freqPill) freqPill.classList.add('sel');
    const emojiBtn = modalBody.querySelector(`.habits-epick[data-e="${habit.icon || '📝'}"]`);
    modalBody.querySelectorAll('.habits-epick').forEach(b => b.classList.remove('on'));
    if (emojiBtn) emojiBtn.classList.add('on');
    else if (modalBody.querySelector('.habits-epick')) modalBody.querySelector('.habits-epick').classList.add('on');
  }
  
  setTimeout(() => {
    const inp = document.getElementById('habits-m-name');
    if (inp) inp.focus();
  }, 120);
  
  // Bind color + freq + emoji pickers for habits
  if (mode === 'habit') {
    const colorRow = document.getElementById('habits-color-row');
    if (colorRow) {
      colorRow.querySelectorAll('.habits-cswatch').forEach(s => {
        s.addEventListener('click', () => {
          selectedColor = s.dataset.c;
          colorRow.querySelectorAll('.habits-cswatch').forEach(x => x.classList.remove('sel'));
          s.classList.add('sel');
        });
      });
    }
    
    modalBody.querySelectorAll('.habits-fpill').forEach(p => {
      p.addEventListener('click', () => {
        selectedFreq = p.dataset.f;
        modalBody.querySelectorAll('.habits-fpill').forEach(x => x.classList.remove('sel'));
        p.classList.add('sel');
      });
    });
    
    modalBody.querySelectorAll('.habits-epick').forEach(btn => {
      btn.addEventListener('click', () => {
        modalBody.querySelectorAll('.habits-epick').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
      });
    });
  }
}

/**
 * Close modal
 */
function closeModal() {
  const modalBackdrop = document.getElementById('habits-modal-backdrop');
  if (modalBackdrop) modalBackdrop.classList.remove('open');
}

/**
 * Save modal
 */
async function saveModal() {
  const nameInput = document.getElementById('habits-m-name');
  if (!nameInput) return;
  
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  
  const modalBody = document.getElementById('view-habits')?.querySelector('#habits-modal-body');
  const selectedEmojiBtn = modalBody?.querySelector('.habits-epick.on');
  const icon = selectedEmojiBtn?.getAttribute('data-e') || HABIT_EMOJIS[0] || '📝';
  
  const durationInput = document.getElementById('habits-m-duration');
  const durationMin = durationInput?.value ? Math.max(1, Math.min(480, parseInt(durationInput.value, 10) || 0)) : null;
  
  const timeInput = document.getElementById('habits-m-time');
  const timeValue = timeInput?.value?.trim();
  const timeOfDay = timeValue && /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : undefined;
  
  const notesInput = document.getElementById('habits-m-notes');
  const notes = notesInput?.value || '';
  
  if (editingHabitId != null) {
    const idx = habits.findIndex(h => String(h.id) === String(editingHabitId));
    if (idx !== -1) {
      habits[idx] = {
        ...habits[idx],
        name,
        icon,
        color: selectedColor,
        freq: selectedFreq,
        durationMin: durationMin || undefined,
        timeOfDay,
        notes
      };
    }
    editingHabitId = null;
  } else {
    habits.push({
      id: Date.now(),
      name,
      icon,
      color: selectedColor,
      freq: selectedFreq,
      durationMin: durationMin || undefined,
      timeOfDay,
      notes
    });
  }
  if (!selectedHabitId && habits.length > 0) {
    selectedHabitId = habits[0].id;
  }
  
  await saveData();
  closeModal();
  renderAll();
  
  // Update sidebar if function exists
  if (window.renderGlobalSidebar && window.Petal?.store) {
    window.renderGlobalSidebar(window.Petal.store.getState());
  }
}


/**
 * Bind event handlers using event delegation
 */
function bind(container) {
  // Remove old listener if exists (by cloning the container to remove all listeners)
  // Actually, we'll just check if already bound and skip, but ensure it's bound to the right container
  if (container.__habitsBound) {
    console.log('⚠️ Habits page already bound, skipping');
    return;
  }
  container.__habitsBound = true;
  console.log('✅ Binding habits page event listeners');
  
  container.addEventListener('click', (e) => {
    // Try to find the button - check the target and its parents
    let btn = e.target.closest('[data-action]');
    
    // If not found, check if the target itself has data-action
    if (!btn && e.target.hasAttribute && e.target.hasAttribute('data-action')) {
      btn = e.target;
    }
    
    if (!btn) return;
    
    const action = btn.dataset.action || btn.getAttribute('data-action');
    if (!action) return;
    
    console.log('🔍 Habits click detected:', action, btn);
    e.stopPropagation();
    e.preventDefault();
    
    switch (action) {
      case 'switch-tab':
        const tab = btn.dataset.tab;
        if (tab) {
          currentTab = tab;
          document.querySelectorAll('#view-habits .habits-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll(`#view-habits .habits-tab[data-tab="${tab}"]`).forEach(t => t.classList.add('active'));
          saveData();
          renderAll();
        }
        break;
        
      case 'open-modal':
        // Only habit mode is supported (goals have their own page)
        openModal('habit');
        break;
        
      case 'close-modal':
      case 'close-modal-backdrop':
        if (action === 'close-modal-backdrop' && e.target !== e.currentTarget) return;
        closeModal();
        break;
        
      case 'save-modal':
        saveModal();
        break;
        
      case 'select-habit':
        const hid = btn.dataset.hid;
        if (hid !== undefined) {
          const habit = habits.find(h => String(h.id) === String(hid));
          selectedHabitId = habit ? habit.id : (parseInt(hid, 10) || hid);
          saveData();
          renderMonthly();
          renderStats();
        }
        break;
        
      case 'edit-habit':
        const editHid = btn.dataset.hid;
        if (editHid !== undefined) {
          openModal('habit', editHid);
        }
        break;
        
      case 'delete-habit':
        const delHid = btn.dataset.hid;
        if (delHid !== undefined && confirm('Delete this habit? Its completion history will be removed.')) {
          const habitToDelete = habits.find(h => String(h.id) === String(delHid));
          if (habitToDelete) {
            habits = habits.filter(h => String(h.id) !== String(delHid));
            delete completions[habitToDelete.id];
            if (selectedHabitId != null && String(selectedHabitId) === String(delHid)) {
              selectedHabitId = habits.length > 0 ? habits[0].id : null;
            }
            saveData();
            renderAll();
            if (window.renderGlobalSidebar && window.Petal?.store) {
              window.renderGlobalSidebar(window.Petal.store.getState());
            }
          }
        }
        break;
        
      case 'toggle-day':
        const date = btn.dataset.date;
        const habitId = parseInt(btn.dataset.hid);
        if (date && habitId) {
          if (!completions[habitId]) completions[habitId] = {};
          if (completions[habitId][date]) {
            delete completions[habitId][date];
            btn.classList.remove('done', 'popped');
          } else {
            completions[habitId][date] = true;
            btn.classList.add('done', 'popped');
            setTimeout(() => btn.classList.remove('popped'), 300);
          }
          saveData();
          renderStats();
          // Update streak banner
          const s = getStreak(habitId);
          const monthDone2 = Object.keys(completions[habitId] || {}).filter(k => k.startsWith(`${currentYear}-${pad(currentMonth + 1)}`)).length;
          const numEls = document.querySelectorAll('#view-habits .habits-streak-num');
          if (numEls[0]) numEls[0].textContent = s;
          if (numEls[1]) numEls[1].textContent = monthDone2;
        }
        break;
        
      case 'prev-month':
        if (currentMonth === 0) {
          currentMonth = 11;
          currentYear--;
        } else {
          currentMonth--;
        }
        saveData();
        renderMonthly();
        break;
        
      case 'next-month':
        if (currentMonth === 11) {
          currentMonth = 0;
          currentYear++;
        } else {
          currentMonth++;
        }
        saveData();
        renderMonthly();
        break;
        
      case 'prev-year':
        viewYear--;
        saveData();
        renderYearly();
        const yearLabel = document.getElementById('habits-year-label');
        if (yearLabel) yearLabel.textContent = viewYear;
        break;
        
      case 'next-year':
        viewYear++;
        saveData();
        renderYearly();
        const yearLabel2 = document.getElementById('habits-year-label');
        if (yearLabel2) yearLabel2.textContent = viewYear;
        break;
    }
  });
  
  // Handle calendar day clicks (delegated)
  container.addEventListener('click', (e) => {
    const day = e.target.closest('.habits-cal-day.past');
    if (!day) return;
    
    const date = day.dataset.date;
    const habitId = parseInt(day.dataset.hid);
    if (!date || !habitId) return;
    
    if (!completions[habitId]) completions[habitId] = {};
    if (completions[habitId][date]) {
      delete completions[habitId][date];
      day.classList.remove('done', 'popped');
    } else {
      completions[habitId][date] = true;
      day.classList.add('done', 'popped');
      setTimeout(() => day.classList.remove('popped'), 300);
    }
    saveData();
    renderStats();
    
    // Update streak banner
    const s = getStreak(habitId);
    const monthDone2 = Object.keys(completions[habitId] || {}).filter(k => k.startsWith(`${currentYear}-${pad(currentMonth + 1)}`)).length;
    const numEls = document.querySelectorAll('#view-habits .habits-streak-num');
    if (numEls[0]) numEls[0].textContent = s;
    if (numEls[1]) numEls[1].textContent = monthDone2;
  });
  
  // Handle escape key to close modal (only bind once globally)
  if (!window.__habitsEscapeBound) {
    window.__habitsEscapeBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modalBackdrop = document.getElementById('habits-modal-backdrop');
        if (modalBackdrop && modalBackdrop.classList.contains('open')) {
          closeModal();
        }
      }
    });
  }
}

/**
 * Get HTML template (header is added separately using PageHeader component)
 */
function getHTMLTemplate() {
  return `
    <!-- Stats -->
    <div class="habits-stats-row" id="habits-stats-row" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 20px 28px 0; background: var(--surface);"></div>

    <!-- Toolbar -->
    <div class="habits-toolbar" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin: 20px 28px 28px;">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div class="habits-tabs">
          <button class="habits-tab ${currentTab === 'monthly' ? 'active' : ''}" data-action="switch-tab" data-tab="monthly">Monthly</button>
          <button class="habits-tab ${currentTab === 'yearly' ? 'active' : ''}" data-action="switch-tab" data-tab="yearly">Yearly</button>
        </div>
        <div id="habits-year-nav" style="display:none;align-items:center;gap:8px;">
          <button class="habits-btn-icon" data-action="prev-year">‹</button>
          <span id="habits-year-label" style="font-family:'Cormorant Garamond',serif;font-size:19px;"></span>
          <button class="habits-btn-icon" data-action="next-year">›</button>
        </div>
      </div>
      <div class="habits-btn-row" id="habits-toolbar-btns"></div>
    </div>

    <!-- View Area -->
    <div id="habits-view-area" style="padding: 0 28px;"></div>

    <!-- Modal (single instance) -->
    <div class="habits-modal-backdrop" id="habits-modal-backdrop" data-action="close-modal-backdrop">
      <div class="habits-modal">
        <div class="habits-modal-head">
          <div class="habits-modal-title" id="habits-modal-title">Add Habit</div>
          <button class="habits-modal-close" data-action="close-modal">✕</button>
        </div>
        <div class="habits-modal-body" id="habits-modal-body"></div>
        <div class="habits-modal-foot">
          <button class="habits-mfbtn cancel" data-action="close-modal">Cancel</button>
          <button class="habits-mfbtn save" id="habits-modal-save" data-action="save-modal">Save</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Habits Page
 * @param {HTMLElement} container - Container element (#view-habits)
 * @param {Object} state - Current app state
 * @param {Object} features - Features/handlers
 */
export async function renderHabitsPage(container, state, features) {
  if (!container) {
    console.error('❌ renderHabitsPage: Container not provided');
    return;
  }
  
  // Inject styles (only once)
  injectStyles();
  
  // Initialize data
  initData();
  
  // Calculate status for header
  const today = todayStr();
  const totalH = habits.length;
  const doneToday = habits.filter(h => (completions[h.id] || {})[today]).length;
  
  // Clear container
  container.innerHTML = '';
  
  // Create header using standard PageHeader component (like other pages)
  const header = document.createElement('header');
  header.className = 'page-header';
  header.innerHTML = PageHeader({
    title: 'Habits',
    icon: '🌿',
    status: `${doneToday} / ${totalH} today`,
    actions: []
  });
  container.appendChild(header);
  
  // Render main content (template includes modal - single instance)
  container.insertAdjacentHTML('beforeend', getHTMLTemplate());
  
  // Ensure only one modal exists (safety check)
  const allModals = container.querySelectorAll('#habits-modal-backdrop');
  if (allModals.length > 1) {
    console.warn(`⚠️ Found ${allModals.length} modals, removing duplicates`);
    for (let i = 1; i < allModals.length; i++) {
      allModals[i].remove();
    }
  }
  
  // Initialize and render content
  initData();
  renderAll();
  
  // Bind event handlers (only once per container instance)
  bind(container);
}

/**
 * Cleanup (optional - for when page is unmounted)
 */
export function cleanupHabitsPage() {
  // Note: We don't remove event listeners as they're scoped to the container
  // and will be cleaned up when the container is removed
  const container = document.getElementById('view-habits');
  if (container) {
    container.__habitsBound = false;
  }
}
