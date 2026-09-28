# Horizons Design System

## Design Principles

1. **Trust before decoration** — every visual decision should increase confidence.
2. **Clarity over density** — school users need fast decisions, not noise.
3. **Role-first navigation** — each user type gets a focused path.
4. **Mobile-first operations** — parents and teachers often use phones.
5. **Accessible by default** — readable typography, contrast, focus states and large touch targets.

## Typography System

| Token | Use |
| --- | --- |
| `.ds-display` | Homepage hero and major campaign headings |
| `.ds-page-title` | App page titles |
| `.ds-section-title` | Section headings |
| `.ds-card-title` | Card headings |
| `.ds-label` | Labels, metadata, table headers |
| `.ds-body` | Main body copy |
| `.ds-caption` | Supporting notes and captions |

## Color System

| Token | Purpose |
| --- | --- |
| `--ds-primary` | Primary actions and active states |
| `--ds-secondary` | Secondary brand support |
| `--ds-accent` | Premium accents and highlights |
| `--ds-success` | Positive system state |
| `--ds-warning` | Attention or pending state |
| `--ds-error` | Destructive or risk state |
| `--ds-ink` | Primary text |
| `--ds-muted` | Secondary text |
| `--ds-surface` | Card backgrounds |
| `--ds-border` | Dividers and outlines |

## Component Standards

### Buttons

- Primary button: one per section where possible.
- Secondary button: lower emphasis.
- Minimum touch size: 44px height.
- Visible focus state required.

### Forms

- Every input needs a label.
- Error message must be human-readable.
- Use smart defaults where possible.
- Never clear user input after validation failure.

### Cards

- Each card should answer one question.
- Avoid mixing unrelated metrics.
- Card title + supporting text + action when relevant.

### Tables

- Use for comparison and data scanning.
- On mobile, tables should scroll horizontally or become cards.
- Important actions must remain visible.

### Navigation

- Primary navigation should reflect user jobs.
- Use command palette for expert/returning users.
- Keep mobile navigation simple.

## Layout System

| Token | Value |
| --- | --- |
| Container max | 1180px–1240px depending on page |
| Section padding desktop | 88px–120px |
| Section padding mobile | 56px–72px |
| Card radius | 24px–32px |
| Grid gap | 16px–28px |

## Accessibility Requirements

- Text contrast must meet WCAG AA.
- Keyboard focus visible.
- Buttons and links must be distinguishable.
- Avoid color-only status communication.
- Inputs must have labels.
- Motion should be subtle and non-essential.

## Production UI Checklist

Before shipping any screen:

- Loading state exists.
- Empty state exists.
- Error state exists.
- Mobile layout tested.
- Keyboard navigation tested.
- Primary action is clear.
- Copy uses user language, not internal jargon.
