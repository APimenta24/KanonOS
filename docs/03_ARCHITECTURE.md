# KanonOS – Architecture

**Version:** 1.0  
**Status:** Active  
**Last Updated:** 2026-07-08

---

# Purpose

This document defines the functional architecture of KanonOS.

Its objective is to ensure every new feature follows the same principles, keeping the platform modular, scalable and easy to maintain.

Technology may evolve.

The architecture should remain stable.

---

# Architecture Philosophy

KanonOS is built around the coach's natural workflow.

Information flows from planning to execution and back into planning through evaluation.

Every module must contribute to this continuous cycle.
Planning
↓
Training
↓
Review
↓
History
↓
Better Planning

No module should exist in isolation.

---

# Product Layers

The platform is organised into four logical layers.

## 1. Workspace

The Workspace is the coach's home.

It provides visibility over:

- Today's work
- Upcoming training
- Teams
- Notifications
- Recent activity
- Pending actions

The Workspace does not store information.

It connects the coach to the right place.

---

## 2. Planning

Planning is the core of KanonOS.

Every training session begins with an objective.

Planning follows a hierarchical structure.
Season
↓
Mesocycle
↓
Microcycle
↓
Week
↓
Training Session

The MVP only exposes:

- Week
- Training Session

The remaining levels are already part of the architecture.

---

## 3. Execution

Execution happens during the training session.

Training Mode is not a separate module.

It is a state of the Training Session.

During execution the coach can:

- View exercises
- Follow session timing
- Register attendance
- Take notes
- Adapt the session if necessary

---

## 4. Review

Every completed session generates new information.

The coach records:

- Attendance
- Session quality
- Notes
- Improvements
- General evaluation

The review automatically enriches the team's history.

---

# Information Flow

Information should always move from higher levels to lower levels.

Objectives generate planning.

Planning generates training.

Training generates review.

Review generates historical knowledge.

Information should never be recreated manually.

---

# Single Source of Truth

Every piece of information should have one owner.

Examples:

Season objective → Season

Weekly objective → Week

Training objective → Training Session

Attendance → Training Review

Player information → Player

The same information should never exist in multiple places.

---

# Domain Hierarchy
Club
↓
Season
↓
Team
↓
Week
↓
Training Session
↓
Training Review

Every entity belongs to a higher level.

---

# Module Architecture

Each module must work independently.

Current MVP modules:

- Workspace
- Teams
- Planning
- Training Session
- Review
- History

Future modules:

- Coordinator
- Parents
- Athletes
- AI
- Video
- Reports
- Integrations

Modules communicate through shared data, not duplicated data.

---

# Data Principles

KanonOS follows five data principles.

## Enter Once

Information should only be entered once.

---

## Reuse Everywhere

Existing information should always be reused.

---

## Connected Data

Every entity should know its relationships.

---

## Historical Memory

Nothing should be deleted.

Information becomes history.

---

## Progressive Detail

The platform should reveal complexity only when needed.

Beginners should see simple workflows.

Advanced coaches should unlock deeper planning capabilities.

---

# User Roles

Coach

Primary user.

Owns planning and training.

---

Technical Coordinator

Defines club objectives.

Supports coaches.

Monitors teams.

---

Parents

View selected information only.

Never edit coaching information.

---

Athletes

Respond to questionnaires.

View personal information.

Receive communication.

---

Club Administrator

Manages organisational settings.

---

# AI Position

Artificial Intelligence is an assistant.

AI can:

- Generate suggestions
- Summarise information
- Create reports
- Recommend exercises
- Identify patterns

AI never replaces coaching decisions.

---

# Future Integrations

The architecture is prepared for external integrations.

Examples:

- Hudl
- Spiideo
- Catapult
- Google Calendar
- Outlook
- Federation APIs

Integrations should enrich existing modules.

They should never replace them.

---

# MVP Architecture

The MVP deliberately limits complexity.

Included:

✔ Workspace

✔ Teams

✔ Weekly Planning

✔ Training Session

✔ Training Review

✔ History

Excluded:

✖ Annual Planning

✖ Athlete App

✖ Parent Portal

✖ Coordinator Dashboard

✖ Video Analysis

✖ Advanced Reports

✖ AI Assistant

These modules will be introduced without changing the existing architecture.

---

# Architecture Principles

Every new feature must answer YES to these questions.

- Does it help the coach?
- Does it reduce work?
- Does it avoid duplicated information?
- Does it reuse existing data?
- Does it fit the planning workflow?
- Can it scale naturally?
- Is it simple enough for everyday use?

If the answer is NO to any question, the feature should be reconsidered.
