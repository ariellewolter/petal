// ═══════════════════════ DOMAIN SCHEMA ═══════════════════════
// Pure data definitions - no side effects

export const SCHEMA_VERSION = '1.0';

// Workflow Lanes
export const LANES = {
  lab: { id: 'lab', label: '🧪 Wet Lab', color: 'var(--rose)' },
  comp: { id: 'comp', label: '💻 Computational', color: 'var(--sage)' },
  writing: { id: 'writing', label: '📝 Writing', color: 'var(--mauve)' },
  presentation: { id: 'presentation', label: '📊 Presentation', color: 'var(--soon)' },
  personal: { id: 'personal', label: '👤 Personal', color: 'var(--blush)' },
  product: { id: 'product', label: '🚀 Product', color: 'var(--sage)' }
};

// Lane-specific stages (for workflow view)
export const LANE_STAGES = {
  lab: ['Planned', 'Running', 'QC/Repeat', 'Results Ready'],
  comp: ['Planned', 'Building', 'Debugging', 'Output Ready'],
  writing: ['Outline', 'Drafting', 'Figures/Tables', 'Submission Prep'],
  presentation: ['Planning', 'Creating Slides', 'Rehearsing', 'Ready to Present'],
  personal: ['Planning', 'In Progress', 'Review', 'Completed'],
  product: ['Ideation', 'Design', 'Development', 'Testing', 'Launch']
};

// Matrix stages (simplified for project matrix view)
export const MATRIX_STAGES = ['planned', 'doing', 'blocked', 'ready'];

// Matrix lanes (subset for project view)
export const MATRIX_LANES = [
  { id: 'lab', label: '🧪 Wet Lab', color: 'var(--rose)' },
  { id: 'comp', label: '💻 Computational', color: 'var(--sage)' },
  { id: 'writing', label: '📝 Writing', color: 'var(--mauve)' },
  { id: 'personal', label: '👤 Personal', color: 'var(--blush)' },
  { id: 'product', label: '🚀 Product', color: 'var(--sage)' }
];

// Board columns
export const DEFAULT_BOARD_COLUMNS = ['Inbox', 'Backlog', 'Todo', 'Doing', 'Done'];

// Task priorities
export const PRIORITIES = ['low', 'medium', 'high'];

// File statuses
export const FILE_STATUSES = {
  'draft': 'Draft',
  'needs-revision': 'Needs Revision',
  'submitted': 'Submitted',
  'accepted': 'Accepted',
  'archived': 'Archived',
  'raw': 'Raw',
  'analyzed': 'Analyzed',
  'figure-ready': 'Figure Ready',
  'written': 'Written'
};

// Default task shape
export function createDefaultTask() {
  return {
    id: Date.now(),
    title: '',
    notes: '',
    priority: 'medium',
    due: '',
    files: [],
    done: false,
    status: 'Todo',
    projectId: '',
    lane: null,
    stage: null,
    boardOrder: 1024,
    dependsOn: null
  };
}

// Default project shape
export function createDefaultProject() {
  return {
    id: Date.now(),
    name: '',
    desc: '',
    due: '',
    color: 1,
    files: [],
    subtasks: [],
    done: false,
    workflowLanes: null // null = all lanes allowed
  };
}
