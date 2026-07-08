# KanonOS – AI Guidelines

**Version:** 1.0  
**Status:** Active  
**Last Updated:** 2026-07-08

---

# Purpose

This document defines how AI assistants should contribute to the development of KanonOS.

The objective is to ensure every AI-generated implementation follows the same architecture, product vision and engineering principles.

These guidelines apply to Cursor, ChatGPT, Gemini, Claude and future AI tools.

---

# AI Role

AI is a development assistant.

It helps to:

- Design features
- Generate code
- Improve architecture
- Write documentation
- Detect issues
- Suggest improvements

AI must never redefine the product vision.

Product decisions always follow the Product Book.

---

# Source of Truth

When generating code, AI should always follow this order of priority:

1. Product Book
2. Architecture
3. Domain Model
4. MVP Roadmap
5. Existing codebase

If there is a conflict, the documentation takes precedence over generated code.

---

# Development Principles

Every feature should:

- Solve a real coaching problem.
- Respect the coach workflow.
- Keep the interface simple.
- Avoid duplicated logic.
- Reuse existing components.
- Be modular.
- Be scalable.

---

# Code Principles

AI should:

- Prefer composition over duplication.
- Keep components small.
- Separate business logic from UI.
- Create reusable services.
- Write readable code.
- Avoid premature optimisation.

---

# UX Principles

Every screen should answer one clear question.

Navigation should be obvious.

The coach should never feel overwhelmed.

Avoid unnecessary clicks.

Mobile usability is essential during training sessions.

---

# Data Principles

Information should:

- Be entered once.
- Be reused everywhere.
- Have one clear owner.
- Never be duplicated.

Relationships between entities should always follow the Domain Model.

---

# Planning Principles

Planning is the centre of KanonOS.

Everything starts with an objective.

Objectives generate planning.

Planning generates training.

Training generates review.

Review improves future planning.

No feature should bypass this workflow.

---

# AI Restrictions

AI should never:

- Invent product features.
- Change workflows.
- Modify architecture without justification.
- Create duplicate entities.
- Introduce unnecessary complexity.

When unsure, AI should preserve the existing architecture.

---

# Implementation Strategy

Every new feature should be implemented in this order:

1. Domain
2. Service
3. UI Components
4. Screen
5. Testing
6. Documentation

---

# MVP Focus

The current priority is the Coach Workspace.

The MVP includes only:

- Workspace
- Teams
- Weekly Planning
- Training Session
- Training Review
- History

Future modules should not be implemented unless explicitly requested.

---

# Technology Stack

Current stack:

- React
- TypeScript
- TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Supabase (future)

AI should use existing libraries before introducing new dependencies.

---

# Definition of Good Code

Good code is:

- Simple
- Readable
- Reusable
- Modular
- Consistent
- Documented

The best solution is usually the simplest one.

---

# Final Principle

Every implementation should make KanonOS easier for coaches to use.

If a feature increases complexity without delivering clear value, it should not be implemented.
