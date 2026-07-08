# KanonOS – Domain Model

**Version:** 1.0  
**Status:** Active  
**Last Updated:** 2026-07-08

---

# Purpose

This document defines the core entities of KanonOS and their relationships.

The objective is to ensure every feature is built on a consistent domain model.

---

# Domain Hierarchy

```
Club
└── Season
    └── Team
        ├── Coach
        ├── Player
        ├── Week
        │   └── Training Session
        │       ├── Exercise
        │       └── Training Review
        └── Evaluation
```

---

# Core Entities

## Club

Represents the organisation.

Responsibilities:

- Club information
- Seasons
- Coaches
- Teams

---

## Season

Represents a sports season.

Contains:

- Objectives
- Teams
- Planning
- Historical data

---

## Team

The operational unit of the platform.

Contains:

- Players
- Coaches
- Weekly planning
- Training sessions
- Reviews

---

## Coach

Primary user of KanonOS.

Responsibilities:

- Planning
- Training
- Reviews
- Team management

---

## Player

Represents an athlete.

Stores:

- Personal information
- Team
- Attendance
- Evaluations
- Training history

Future:

- Wellness questionnaires
- Athlete Passport

---

## Week

Represents one planning cycle.

Contains:

- Weekly objective
- Training sessions
- Notes

Every training belongs to one week.

---

## Training Session

The central object of the MVP.

Contains:

- Objective
- Date
- Team
- Planned players
- Exercises
- Materials
- Coach notes

States:

- Draft
- Planned
- In Progress
- Completed

Training Mode is simply the "In Progress" state.

---

## Exercise

Reusable coaching resource.

Contains:

- Name
- Category
- Description
- Duration
- Equipment

Future:

- Tags
- Difficulty
- Video
- Animations

---

## Training Review

Created after every completed session.

Contains:

- Attendance
- Session rating
- Coach reflection
- Improvements
- Notes

Updates the team's history.

---

## Evaluation

Stores player development.

Future versions may include:

- Technical
- Tactical
- Physical
- Mental

Evaluations are linked to players, not training sessions.

---

# Relationships

```
Club
    ↓
Season
    ↓
Team
    ├── Coach
    ├── Players
    └── Weeks
            ↓
      Training Sessions
            ↓
      Exercises
            ↓
      Training Review
```

---

# Data Ownership

Every entity owns its own information.

| Entity | Owns |
|---------|------|
| Club | Club information |
| Season | Season objectives |
| Team | Team data |
| Week | Weekly objective |
| Training Session | Session planning |
| Training Review | Attendance and review |
| Player | Player information |
| Evaluation | Player development |

Information should never exist in two different places.

---

# MVP Scope

Included:

- Club
- Season
- Team
- Coach
- Player
- Week
- Training Session
- Exercise
- Training Review

Future:

- Parent
- Athlete
- Coordinator
- Wellness
- Athlete Passport
- Video Analysis
- External Integrations

---

# Domain Principles

- Every object has a single owner.
- Every relationship should be explicit.
- Information is entered once.
- History is never deleted.
- Planning always precedes execution.
- Reviews enrich future planning.
