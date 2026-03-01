# Documentation Organization Guide

This guide helps ensure new markdown files are properly organized and easy to find.

## Directory Structure

```
docs/
├── README.md                    # Documentation index (start here)
├── PROJECT_SUMMARY.md           # Current project status
├── REFACTORING_STATUS.md        # Refactoring progress
├── INTEGRATION_PLANS.md         # Feature integration plans
├── ANALYSIS_INDEX.md            # Analysis documents index
├── DOCUMENTATION_GUIDE.md       # This file
│
├── architecture/                # System architecture docs
│   ├── PAGE_ARCHITECTURE.md
│   ├── VAULT_ARCHITECTURE.md
│   └── ...
│
├── guides/                      # How-to guides
│   ├── USING_SHARED_COMPONENTS.md
│   └── ...
│
├── plans/                       # Future work plans
│   ├── WORKFLOW_INTEGRATION_IMPLEMENTATION_PLAN.md
│   └── ...
│
├── analysis/                    # Code analysis (historical)
│   └── ...
│
├── audit/                       # Audit reports
│   └── ...
│
├── bug-reports/                 # Bug reports
│   └── ...
│
├── fixes/                       # Fix documentation
│   └── ...
│
├── summaries/                   # Session summaries
│   └── ...
│
├── designs/                     # Design documentation
│   └── ...
│
├── improvements/                # Improvement docs
│   └── ...
│
├── mobile/                      # Mobile-specific docs
│   └── ...
│
├── templates/                   # Documentation templates
│   └── ...
│
└── other/                       # Miscellaneous
    └── ...
```

## Where to Put New Files

### ✅ Status/Progress Documents
**Location:** Root of `docs/`
- Project status updates
- Refactoring progress
- Integration status
- **Naming:** `*_STATUS.md`, `*_PROGRESS.md`, `*_SUMMARY.md`

**Examples:**
- `REFACTORING_STATUS.md` ✅
- `PROJECT_SUMMARY.md` ✅
- `INTEGRATION_PLANS.md` ✅

### ✅ Architecture Documentation
**Location:** `docs/architecture/`
- System architecture
- Design patterns
- Technical specifications
- Setup guides

**Examples:**
- `PAGE_ARCHITECTURE.md`
- `VAULT_ARCHITECTURE.md`
- `ELECTRON_SETUP.md`

### ✅ How-To Guides
**Location:** `docs/guides/`
- Usage instructions
- Migration guides
- Best practices
- **Naming:** `USING_*.md`, `MIGRATING_*.md`, `HOW_TO_*.md`

**Examples:**
- `USING_SHARED_COMPONENTS.md`
- `MIGRATING_TO_STANDARD_COMPONENTS.md`

### ✅ Planning Documents
**Location:** `docs/plans/`
- Implementation plans
- Feature roadmaps
- Task lists
- **Naming:** `*_PLAN.md`, `*_ROADMAP.md`, `*_CHECKLIST.md`

**Examples:**
- `WORKFLOW_INTEGRATION_IMPLEMENTATION_PLAN.md`
- `IOS_COMPATIBILITY_PLAN.md`

### ✅ Analysis Documents
**Location:** `docs/analysis/`
- Code analysis
- Refactoring opportunities
- Code quality reports
- **Note:** Many are historical - check if analysis is still relevant

**Examples:**
- `DUPLICATE_ANALYSIS.md`
- `REFACTORING_OPPORTUNITIES.md`

### ✅ Audit Reports
**Location:** `docs/audit/`
- Code audits
- Pre-release checklists
- Verification reports

**Examples:**
- `SUMMARY.md`
- `PRE_RELEASE_CHECKLIST.md`

### ✅ Bug Reports
**Location:** `docs/bug-reports/`
- Bug descriptions
- Issue tracking
- **Naming:** `BUG_*.md`, `ISSUE_*.md`

### ✅ Fix Documentation
**Location:** `docs/fixes/`
- Fix descriptions
- Regression guards
- **Naming:** `*_FIX.md`, `*_PATCH.md`

### ✅ Session Summaries
**Location:** `docs/summaries/`
- Work session summaries
- Progress reports
- **Naming:** `*_SUMMARY.md`, `*_SESSION_*.md`

### ✅ Design Documentation
**Location:** `docs/designs/` or `docs/design/`
- Design decisions
- UX documentation
- Component designs

### ✅ Mobile Documentation
**Location:** `docs/mobile/`
- Mobile-specific guides
- PWA documentation

### ✅ Templates
**Location:** `docs/templates/`
- Documentation templates
- Page templates

### ✅ Miscellaneous
**Location:** `docs/other/`
- Anything that doesn't fit elsewhere
- Temporary documentation

## Naming Conventions

### Use UPPERCASE with underscores
- ✅ `REFACTORING_STATUS.md`
- ✅ `USING_SHARED_COMPONENTS.md`
- ❌ `refactoring-status.md`
- ❌ `usingSharedComponents.md`

### Be Descriptive
- ✅ `PLANNER_TASKS_INTEGRATION_PLAN.md`
- ❌ `integration.md`

### Use Consistent Suffixes
- `*_STATUS.md` - Current status
- `*_PROGRESS.md` - Progress tracking
- `*_SUMMARY.md` - Summary document
- `*_PLAN.md` - Implementation plan
- `*_GUIDE.md` - How-to guide
- `*_ANALYSIS.md` - Analysis document
- `*_AUDIT.md` - Audit report
- `*_FIX.md` - Fix documentation

## Before Creating a New File

### 1. Check if it already exists
- Search existing files for similar content
- Check consolidated documents (`PROJECT_SUMMARY.md`, `REFACTORING_STATUS.md`, etc.)

### 2. Choose the right location
- Use the directory structure above
- If unsure, put in `docs/other/` temporarily

### 3. Update indexes
- Add to `docs/README.md` if it's a main document
- Add to `docs/ANALYSIS_INDEX.md` if it's an analysis document
- Update relevant consolidated documents if applicable

### 4. Follow naming conventions
- Use UPPERCASE with underscores
- Be descriptive
- Use consistent suffixes

## Consolidation Guidelines

### When to Consolidate
- Multiple files tracking the same thing (e.g., multiple progress files)
- Related documents that should be together
- Historical documents that are no longer actively updated

### How to Consolidate
1. Create a single consolidated document
2. Include all relevant information
3. Delete redundant files
4. Update indexes and references

### Examples of Consolidation
- ✅ Multiple refactoring progress files → `REFACTORING_STATUS.md`
- ✅ Multiple summary files → `PROJECT_SUMMARY.md`
- ✅ Multiple integration plans → `INTEGRATION_PLANS.md`

## Quick Reference

| Document Type | Location | Example |
|--------------|----------|---------|
| Status/Progress | `docs/` | `REFACTORING_STATUS.md` |
| Architecture | `docs/architecture/` | `PAGE_ARCHITECTURE.md` |
| How-To Guide | `docs/guides/` | `USING_SHARED_COMPONENTS.md` |
| Plan | `docs/plans/` | `*_PLAN.md` |
| Analysis | `docs/analysis/` | `*_ANALYSIS.md` |
| Audit | `docs/audit/` | `*_AUDIT.md` |
| Bug Report | `docs/bug-reports/` | `BUG_*.md` |
| Fix | `docs/fixes/` | `*_FIX.md` |
| Summary | `docs/summaries/` | `*_SUMMARY.md` |
| Design | `docs/designs/` | `*_DESIGN.md` |
| Mobile | `docs/mobile/` | `MOBILE_*.md` |
| Template | `docs/templates/` | `*_TEMPLATE.md` |
| Other | `docs/other/` | Anything else |

## Validation

Run the validation script to check organization:
```bash
npm run validate-docs
# or
node scripts/validate-docs.js
```

This will:
- Check naming conventions
- Verify files are in correct directories
- Identify potential duplicates
- Suggest consolidations

## Templates

Use the template when creating new documents:
- **[NEW_DOCUMENT_TEMPLATE.md](templates/NEW_DOCUMENT_TEMPLATE.md)** - General template for new docs
- **[NEW_PAGE_TEMPLATE.md](templates/NEW_PAGE_TEMPLATE.md)** - Template for new page documentation

## Questions?

If you're unsure where to put a file:
1. Check this guide
2. Look at similar existing files
3. Put in `docs/other/` temporarily
4. Ask for review in next session

---

**Remember:** Good documentation organization makes it easier for everyone (including AI agents) to find and understand the codebase! 📚
