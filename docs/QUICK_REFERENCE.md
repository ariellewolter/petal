# Documentation Quick Reference

**For AI agents and developers creating new markdown files**

## 🎯 Quick Decision Tree

```
New markdown file?
│
├─ Is it a main status/progress document?
│  └─→ Put in docs/ root (e.g., REFACTORING_STATUS.md)
│
├─ Is it a how-to guide?
│  └─→ Put in docs/guides/ (e.g., USING_*.md)
│
├─ Is it a plan for future work?
│  └─→ Put in docs/plans/ (e.g., *_PLAN.md)
│
├─ Is it about system architecture?
│  └─→ Put in docs/architecture/ (e.g., *_ARCHITECTURE.md)
│
├─ Is it a bug report?
│  └─→ Put in docs/bug-reports/ (e.g., BUG_*.md)
│
├─ Is it about a fix?
│  └─→ Put in docs/fixes/ (e.g., *_FIX.md)
│
├─ Is it a session summary?
│  └─→ Put in docs/summaries/ (e.g., *_SUMMARY.md)
│
├─ Is it code analysis?
│  └─→ Put in docs/analysis/ (e.g., *_ANALYSIS.md)
│
└─ Not sure?
   └─→ Put in docs/other/ (can be moved later)
```

## 📝 Naming Rules

1. **UPPERCASE with underscores**: `REFACTORING_STATUS.md` ✅
2. **Be descriptive**: `PLANNER_TASKS_INTEGRATION_PLAN.md` ✅
3. **Use suffixes**: `*_STATUS.md`, `*_PLAN.md`, `*_GUIDE.md`

## 📁 Common Patterns

| What you're documenting | Location | Naming |
|------------------------|----------|--------|
| Current status | `docs/` | `*_STATUS.md` |
| Progress tracking | `docs/` | `*_PROGRESS.md` |
| How to do something | `docs/guides/` | `USING_*.md` or `HOW_TO_*.md` |
| Implementation plan | `docs/plans/` | `*_PLAN.md` |
| Code analysis | `docs/analysis/` | `*_ANALYSIS.md` |
| Bug description | `docs/bug-reports/` | `BUG_*.md` |
| Fix description | `docs/fixes/` | `*_FIX.md` |
| Session summary | `docs/summaries/` | `*_SUMMARY.md` |

## ✅ Before Creating

1. **Check if it exists**: Search for similar content
2. **Check consolidated docs**: `PROJECT_SUMMARY.md`, `REFACTORING_STATUS.md`, `INTEGRATION_PLANS.md`
3. **Choose location**: Use decision tree above
4. **Validate**: Run `npm run validate-docs`

## 🔍 Validation

```bash
npm run validate-docs
```

Checks:
- ✅ Naming conventions
- ✅ Correct directory placement
- ✅ Potential duplicates
- ✅ Organization suggestions

## 📚 Full Guide

See **[DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md)** for complete details.

## 🎨 Template

Use **[templates/NEW_DOCUMENT_TEMPLATE.md](templates/NEW_DOCUMENT_TEMPLATE.md)** when creating new files.

---

**Remember:** Good organization helps everyone (including AI agents) find information quickly! 🚀
