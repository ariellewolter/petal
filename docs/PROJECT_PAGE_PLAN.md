# Individual Project Page – Improvement Plan

**Context:** When you open a project from the Projects list (“open project” / project name click), the app shows the **workflow-matrix-view**: a single long page with project title, description, and a fixed stack of sections (Today Timeline, Active Protocols, Cell Log, Computational Window, Deadlines Horizon, Tasks, plus a files sidebar). This view is not very useful as a project “home” because it lacks overview, quick actions, and relevance for non-lab projects.

**Goal:** Make the individual project page a useful project dashboard: at-a-glance status, clear next steps, and sections that match the project’s workflow type (lab, computation, etc.).

---

## Workflow-type–based page structure

Project “type” is determined by **`project.workflowLanes`** (array of lane ids: `lab`, `comp`, `writing`, `presentation`, `personal`, `product`). Use it to decide which sections appear on the individual project page.

### Sections common to all projects

These appear on **every** individual project page, regardless of workflow lanes:

| Section | Description |
|--------|-------------|
| **Tasks** | All tasks for this project (with “View all” link to Tasks page filtered by project). |
| **Associated goals** | Goals that list this project in `goal.projectIds` (“Part of: [Goal A]” with links to Goals page). |
| **Today’s timeline** | Project tasks scheduled for today (by time block or protocol); empty state “Nothing today” + Add task. |
| **Associated files** | Project’s linked files (existing sidebar: add file + list). |

### Sections by workflow type

Show these **only** when the project’s workflow lanes indicate that type:

| Workflow type | Condition | Sections to include |
|---------------|-----------|----------------------|
| **Lab** | `project.workflowLanes` includes `'lab'` | **Cell Log** (linked cell lines + entries), **Active Protocols** (protocol tasks with day index, next step). |
| **Computation** | `project.workflowLanes` includes `'comp'` | **Computational Window** (time-window selector + comp tasks). |

- A project can have **both** lab and comp (e.g. `workflowLanes: ['lab', 'comp', 'writing']`); then show both Cell Log + Protocols and Computational Window.
- **Deadlines Horizon** can stay as a common section (or be folded into Today’s timeline / overview) so all projects see upcoming due tasks.
- When `workflowLanes` is `null` or empty, treat as “all lanes” and show all type-specific sections for backward compatibility, or default to only the common sections and let users add lanes in Edit project.

### Suggested order on the page

1. Header (title, due, stats, edit, complete, actions)  
2. Overview (progress, linked goals, next 1–3 tasks)  
3. **Today’s timeline** (common)  
4. **Active Protocols** (lab only)  
5. **Cell Log** (lab only)  
6. **Computational Window** (computation only)  
7. **Deadlines Horizon** (common)  
8. **Tasks** (common)  
9. **Associated goals** (common; can also be in overview)  
10. **Associated files** (common; keep as sidebar)

---

## Current State (Summary)

| Area | What exists today |
|------|-------------------|
| **Header** | Back button, project title (`project-title-display`), description (`project-desc-display`). Optional cell-line chips under title. |
| **Sections (always shown, in order)** | 1) Today Timeline, 2) Active Protocols, 3) Cell Log, 4) Computational Window, 5) Deadlines Horizon, 6) Tasks. |
| **Sidebar** | Project files (add file, list of linked files). |
| **Data available** | Project: `id`, `name`, `desc`, `due`, `color`, `files`, `done`, `workflowLanes`, `linkedCellLines`. Goals link to projects via `goal.projectIds`. Tasks filtered by `projectId`. |

**Problems:**

- No **summary stats** (e.g. X of Y tasks done, due date, progress).
- No **link to linked goal(s)** (goals have `projectIds`; we could show “Part of: Goal X” and link to Goals page).
- No **edit project** (name, due, description) from this page.
- **Lab-specific sections** (Cell Log, Active Protocols, Computational Window) are always visible even when empty or irrelevant.
- No clear **“next action”** or **priority focus**.
- **Due date** is not prominent (schema has `project.due` but it’s not shown in the header).
- No **mark complete** or **project status** control from this view.

---

## Proposed Direction

Turn the individual project view into a **project dashboard** with:

1. **Project header bar** – title, due date, quick stats, edit, and primary actions.
2. **Overview / summary block** – progress, linked goal(s), and “next up” or priority tasks.
3. **Relevant sections only** – show sections when they have content or are explicitly enabled (e.g. hide Cell Log when no cell lines; optionally collapse empty sections).
4. **Clear primary actions** – add task, open workflow/board, view all tasks, mark project complete.

---

## 1. Project Header Bar (new or enhanced)

**Add or expand the top block to include:**

- **Title** (existing) – keep; consider making it editable in-place or via an “Edit” control.
- **Due date** (new in header) – show `project.due` in a clear, readable format (e.g. “Due Mar 15” or “Overdue by 2 days”). If no due date, optional “Set due date” link.
- **Quick stats** (new) – e.g. “12 tasks · 5 done” or “7/12 done” with a minimal progress indicator (bar or percentage).
- **Edit project** (new) – button or link that opens a small modal/sheet to edit name, description, due date (and optionally color, workflow lanes). Reuse or mirror logic from project creation/editing elsewhere.
- **Mark complete** (new) – button to mark project as done (set `project.done = true`), with optional confirmation. When done, show a “Completed” badge and optionally hide or simplify the rest of the page.
- **Primary actions** (grouped) – e.g. “+ Add task”, “View all tasks” (link to Tasks page filtered by this project), “Open in Workflow” (if you have a workflow view that can be scoped to this project).

**Implementation notes:**

- Header lives in `#project-title-container` or a new `#project-header-bar` in `workflow-matrix-view`.
- Stats: derive from `projectTasks` (tasks where `projectId` matches, excluding `deletedAt`).
- Due: use existing `project.due` and date formatting helpers.

---

## 2. Overview / Summary Block (new)

**Add a compact “Overview” or “Summary” section below the header (or as the first card):**

- **Progress** – same stats as header (e.g. “7 of 12 tasks complete”) with optional progress bar.
- **Linked goal(s)** – “Part of: [Goal A], [Goal B]” with links to the Goals page (e.g. `switchView('goals')` and optionally scroll/focus to that goal). If no goals link this project, hide this line or show “Not linked to a goal”.
- **Next up / priority** – 1–3 “next” tasks (e.g. not done, by due date or priority). Each as a one-line clickable row that opens the task drawer. If none, show “No upcoming tasks” or “Add a task”.

This gives a single place to see status and what to do next without scrolling through all sections.

**Implementation notes:**

- Goals: from store, `goals.filter(g => (g.projectIds || []).map(String).includes(String(project.id)))`.
- Next tasks: from `projectTasks` (not done, not deleted), sorted by due/priority, take first 3.

---

## 3. Sections: Workflow-type–based visibility

**Logic:** Use `project.workflowLanes` to decide which sections to show (see **Workflow-type–based page structure** above).

**Common (always show):**

- **Today’s timeline** – Always show; if no tasks scheduled for today, show “Nothing scheduled today” + “Add task” CTA.
- **Tasks** – Always show with “View all” link to Tasks page filtered by this project.
- **Associated goals** – Always show (in overview and/or its own section); hide line if no goals link this project.
- **Associated files** – Always show in sidebar (existing behavior).
- **Deadlines Horizon** – Show for all; if no due tasks, show “No deadlines” or collapse.

**Lab only** (`workflowLanes` includes `'lab'`):

- **Cell Log** – Show; if no linked cell lines yet, show “No cell lines linked” + “Link Cell Line” (current behavior).
- **Active Protocols** – Show; if no protocol tasks, show “No active protocols” or collapse.

**Computation only** (`workflowLanes` includes `'comp'`):

- **Computational Window** – Show (time-window selector + comp tasks).

**Implementation notes:**

- In `renderWorkflowMatrix`, compute `hasLab = (project.workflowLanes || []).includes('lab')` and `hasComp = (project.workflowLanes || []).includes('comp')`. Set `#cell-log-section`, `#active-protocols-section`, and `#comp-window-section` visibility (e.g. `display: none` when not applicable).
- When `workflowLanes` is `null` or empty: either show all type-specific sections (current behavior) or only common sections; document the choice (e.g. “null = show all” for backward compatibility).
- Section order in the DOM can stay as in `tasklist.html`; visibility toggling is enough. Optionally reorder via CSS or by rendering sections in the chosen order in a single container.

---

## 4. Primary Actions (clarify and surface)

**Ensure these are obvious and working:**

- **+ Add task** – Already present in Today Timeline and Tasks; ensure they pass `projectId` and that the add-task flow (modal or inline) assigns the task to this project. Consider one prominent “+ Add task” in the header or overview.
- **View all tasks** – Button/link that goes to Tasks page with a filter for this project (e.g. `boardProjectFilter` or equivalent). Already supported via `project:view-tasks`; ensure it’s visible on the project page (e.g. in header or overview).
- **Open in Workflow** – If the app has a Workflow view that can be filtered by project, add a link/button “Open in Workflow” that switches to Workflow and sets the project filter. If the current matrix view *is* the workflow for the project, consider renaming or adding a “Board” view link if you have a board-style view.
- **Back to Projects** – Keep; already present.

---

## 5. Optional Enhancements (later)

- **Project settings / preferences** – e.g. “Always show Cell Log”, “Default view: Timeline vs Board”, stored on the project object.
- **Recent activity** – “Last task completed 2 days ago”, “Last file added …” (if data is available).
- **Sub-projects or “phases”** – If you introduce sub-projects or phases, show them in the overview or a dedicated section.
- **Empty state** – When a project has no tasks and no protocols/cell log, show a single friendly empty state: “No tasks yet. Add a task or link a goal to get started,” with clear CTAs.

---

## 6. Implementation Order (suggested)

1. **Phase 1 – Header and overview**
   - Add due date and quick stats to the project header.
   - Add “Edit project” and “Mark complete” (with save and re-render).
   - Add Overview block: progress, linked goals, next 1–3 tasks.

2. **Phase 2 – Workflow-type–based section visibility**
   - Use `project.workflowLanes` to show/hide: Cell Log + Active Protocols when `'lab'`; Computational Window when `'comp'`.
   - Keep Today’s timeline, Tasks, Associated goals, Associated files, and Deadlines Horizon for all projects.
   - Collapse or show empty state when a section is visible but has no content (e.g. “No active protocols”).

3. **Phase 3 – Actions and polish**
   - Ensure “View all tasks” and “+ Add task” are prominent and work correctly.
   - Add “Open in Workflow” (or equivalent) if applicable.
   - Empty state when project has no tasks.
   - Any project-level preferences (e.g. show/hide sections) can follow.

---

## 7. Files to Touch (reference)

| File | Changes |
|------|--------|
| `tasklist.html` | Add structure for project header bar (due, stats, edit, complete, actions) and overview block if not dynamic-only. |
| `src/ui/renderWorkflowMatrix.js` | Set header content (due, stats), render overview (goals, next tasks), control section visibility by `workflowLanes` (lab → Cell Log + Protocols, comp → Computational Window); call edit/complete handlers. |
| `src/features/projectOperations.js` (or equivalent) | `updateProject(ctx, projectId, { name, desc, due, done })`; ensure `markProjectComplete` exists or add it. |
| `src/ui/renderProjectViews.js` | Optional: section wrappers that accept “visible” flag or “empty” state. |
| `src/app/delegation.js` (or ProjectsPage) | Handlers for `project:edit`, `project:mark-complete`, `project:view-tasks`, goal links. |
| `src/pages/GoalsPage.js` | No change required if we only link to goals; deep-link to goal id is optional. |

---

## Summary

- **Header:** Title + due + stats + edit + mark complete + primary actions.
- **Overview:** Progress, linked goals, next 1–3 tasks.
- **Common to all:** Tasks, associated goals, today’s timeline, associated files (sidebar), and deadlines horizon.
- **By workflow type:** Lab projects (`workflowLanes` includes `'lab'`) get Cell Log + Active Protocols; computation projects (`workflowLanes` includes `'comp'`) get Computational Window. Projects with both get both sets.
- **Actions:** Prominent “Add task” and “View all tasks”; optional “Open in Workflow”.
- **Order:** Header → overview → Today’s timeline → (Lab: Protocols, Cell Log) → (Comp: Computational Window) → Deadlines → Tasks → goals + files sidebar.

This makes the individual project page a workflow-aware dashboard: everyone sees tasks, goals, today, and files; lab projects also see cell log and protocols; computation projects also see the computational window.
