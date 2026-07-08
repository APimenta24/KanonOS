# KanonOS – Decision Log

**Version:** 1.0  
**Status:** Active  
**Last Updated:** 2026-07-08

---

# Purpose

This document records the most important product and architecture decisions.

Every significant decision should be documented with its rationale.

---

| Date | Area | Decision | Reason |
|------|------|----------|--------|
| 2026-07-08 | Product | Coach is the primary user. | Deliver value to coaches before expanding to other roles. |
| 2026-07-08 | Product | Workspace is the application's home screen. | Coaches need a daily operational workspace, not a dashboard. |
| 2026-07-08 | Planning | Planning is the core of KanonOS. | Coach interviews identified planning as the biggest pain point. |
| 2026-07-08 | Planning | MVP includes only Weekly Planning and Training Sessions. | Keep the first version simple while preserving long-term architecture. |
| 2026-07-08 | Training | Training Mode is part of the Training Session. | Simpler workflow and better user experience. |
| 2026-07-08 | Review | Every training session ends with a mandatory review. | Build historical knowledge automatically. |
| 2026-07-08 | Architecture | Information is entered only once. | Avoid duplicated work and inconsistent data. |
| 2026-07-08 | Architecture | All modules follow the Planning → Training → Review workflow. | Maintain consistency across the platform. |
| 2026-07-08 | Product | KanonOS grows through independent modules. | Ensure scalability without increasing complexity. |
| 2026-07-08 | Development | GitHub is the single source of truth. | Documentation and code remain synchronised. |
| 2026-07-08 | Development | Documentation is versioned and frozen after v1.0. | Focus on building the MVP instead of continuously rewriting documents. |

---

# Rules

- Record only important decisions.
- Never delete previous decisions.
- If a decision changes, add a new entry explaining why.
- The latest decision always takes precedence.
