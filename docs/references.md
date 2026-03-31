## Core Philosophy

Every interface built should feel like it respects the user's time and attention. The goal is not to impress with volume — it's to make the right action obvious and everything else invisible until needed. 

**Three questions to ask before adding ANY element:**
1. **Does the user need this to complete their primary task?** If no, remove it or hide it behind progressive disclosure.
2. **Can this be inferred or defaulted instead of asked?** Smart defaults reduce decisions.
3. **Would a first-time user understand this in under 3 seconds?** If not, simplify.

---

## Foundational Standards

This skill draws from three proven design systems. Do not copy them wholesale — synthesize their shared principles into a coherent approach for each project.

### Apple Human Interface Guidelines
- **Deference:** The UI stays out of the way of content. Chrome, borders, and decorative elements are minimized so the user's focus lands on what matters.
- **Clarity:** Text is legible at every size. Icons are precise and communicative. Every element serves a functional purpose.
- **Depth:** Use layering, translucency, and motion to convey hierarchy and context — not decoration.

### Material Design (Google)
- **Surface hierarchy:** Use elevation (shadows, layering) to signal importance and relationships between elements. Primary actions float above secondary content.
- **Intentional motion:** Transitions communicate cause-and-effect. An element doesn't just appear — it arrives from somewhere meaningful.
- **Density-appropriate design:** Comfortable touch targets (48dp minimum) for mobile, compact information density for desktop. Never apply the same density to both.

### Nielsen Norman Usability Heuristics
These 10 heuristics act as a **checklist** — run every interface through them before considering it complete:
1. **Visibility of system status** — Always show the user what's happening (loading states, progress indicators, confirmation feedback).
2. **Match between system and real world** — Use language and concepts the user already knows. No jargon unless the audience expects it.
3. **User control and freedom** — Provide clear undo, back, cancel, and escape routes. Never trap the user.
4. **Consistency and standards** — Follow platform conventions. A trash icon means delete everywhere, not archive.
5. **Error prevention** — Disable invalid actions. Use smart defaults. Constrain inputs to valid ranges.
6. **Recognition over recall** — Show options rather than requiring the user to remember them. Labels over icons-only.
7. **Flexibility and efficiency** — Support both novice flows (guided) and expert shortcuts (keyboard, batch actions) where appropriate.
8. **Aesthetic and minimalist design** — Every extra element competes with the relevant ones. Reduce to the essentials.
9. **Help users recognize and recover from errors** — Plain-language error messages that say what went wrong AND how to fix it.
10. **Help and documentation** — If the interface needs a manual, the interface has failed. But if help is needed, make it contextual and searchable.

---

## The Reduction Framework

Before laying out any interface, classify every potential element into one of three tiers:

### Tier 1 — Core Actions (always visible)
These are the 1–3 things the user came here to do. They get primary visual weight, prominent placement, and the largest interactive targets. 
* **How to identify:** Ask "If this screen could only have one button, what would it be?" That's Tier 1. Then ask if there's a second action that 80%+ of users need on every visit. That might also be Tier 1. Rarely should more than 3 actions share this tier.

### Tier 2 — Supporting Functions (visible but subdued)
Settings, filters, secondary navigation, metadata. These support the primary task but aren't the reason the user is here. 
* **Execution:** Use lighter visual weight — secondary buttons, smaller type, muted colors, or positioning in less prominent areas.

### Tier 3 — Edge Cases (hidden until needed)
Advanced settings, bulk operations, export options, admin tools. These serve power users or infrequent tasks. 
* **Execution:** Hide them behind overflow menus (⋯), expandable sections, "Advanced" toggles, or contextual menus. 

> **The Rule:** If you can't classify an element into one of these tiers, it probably doesn't belong on this screen at all.

---

## Layout & Spatial Principles

### Information Hierarchy
- Establish a clear visual reading order. On LTR interfaces: primary content top-left, actions top-right or bottom of content flow.
- Use **one** dominant focal point per viewport. If everything is bold, nothing is.
- Group related controls together and separate unrelated groups with whitespace — not lines or borders. Whitespace is the most elegant divider.

### The 80/20 Interface Rule
Design for the 80% use case. The interface should serve the most common user journey with zero friction. The remaining 20% of edge-case functionality should exist but never clutter the primary path. 

**Practical application:**
- Show 5 well-chosen options instead of 20 exhaustive ones.
- Default form fields to the most common value.
- Use progressive disclosure: "Show more options" beats a wall of controls.
- Collapse or tab secondary content rather than stacking it vertically.

### Whitespace as a Feature
Whitespace isn't empty space — it's **active design**. It gives content room to breathe, creates grouping, and signals hierarchy.
- Generous padding inside interactive elements (buttons, cards, inputs) — cramped tap targets feel broken.
- Consistent spacing scale (e.g., 4/8/12/16/24/32/48px) to create rhythm.
- Let key content areas have asymmetric breathing room — not everything needs to be edge-to-edge.

### Responsive Reduction
As viewport shrinks, **remove** rather than compress:
- **Desktop:** Full layout with all three tiers visible in appropriate weight.
- **Tablet:** Tier 3 collapses into menus; Tier 2 moves to secondary panels.
- **Mobile:** Tier 1 only in the main view; Tier 2 behind tabs or bottom sheets; Tier 3 behind settings.
> *Never shrink a desktop layout into mobile. Redesign the information flow for each breakpoint.*

---

## Interaction Design

### Feedback & State
Every interactive element must have clearly distinct states:
- **Default:** Resting state, clearly interactive (affordance).
- **Hover:** Subtle acknowledgment (desktop only; never rely on hover for critical info).
- **Active/Pressed:** Immediate tactile feedback.
- **Disabled:** Visually muted AND communicates why (tooltip or adjacent text).
- **Loading:** Skeleton screens or inline spinners, never a blank void.
- **Success/Error:** Confirmation near the point of action, not in a disconnected banner.

### Empty States
An empty state is a **first impression, not a dead end**. Every empty state should:
- Explain what this area is for.
- Show one clear action to populate it.
- Optionally, show a helpful illustration or example.

### Navigation
- **Flat over deep:** Reduce nesting. If something is 3+ clicks deep, consider surfacing it.
- **Persistent orientation:** The user should always know where they are (breadcrumbs, highlighted nav items, descriptive page titles).
- **Predictable placement:** Primary nav at top or left. Actions contextual to content near that content — not in a distant toolbar.

---

## Typography & Readability
- **Body text:** 16px minimum for web, 14–15px minimum for dense data UIs. Line height 1.4–1.6.
- **Heading hierarchy:** Limit to 3 levels in any single view. If you need a fourth level, the page is too complex — split it.
- **Contrast:** WCAG AA minimum (4.5:1 for body text, 3:1 for large text). This isn't optional — it's a legal and moral baseline.
- **Line length:** 50–75 characters per line for body text. Wider than that and readability drops sharply.
- **Label everything:** Icons without labels are ambiguous. Use icon + text for primary nav. Icon-only is acceptable only for universally understood symbols (close ✕, search 🔍, menu ☰) or when a tooltip is provided.

---

## Color with Purpose
- **Semantic color:** Reserve specific colors for specific meanings. Red = destructive/error. Green = success/positive. Blue = interactive/informational. Yellow/amber = warning. Don't use red for a non-destructive primary button — it will trigger anxiety.
- **Limit the palette:** 1 primary brand color, 1 accent, neutrals for structure. Additional semantic colors as needed. That's it.
- **Accessible contrast:** Test every color combination. A beautiful palette that fails WCAG is a broken palette.
- **Dark mode considerations:** If supporting dark mode, design it intentionally — don't just invert colors. Reduce surface brightness, increase contrast for text, and ensure semantic colors remain distinguishable.

---

## Anti-Patterns to Actively Avoid

Catch and correct these common AI-generated and hastily built interfaces:

| Anti-Pattern | Why It's Harmful | What to Do Instead |
| :--- | :--- | :--- |
| **Card overload** | Every piece of content in its own card creates visual noise and false equivalence. | Use cards sparingly for distinct, actionable items. Use simple list rows or inline groups for related content. |
| **Button bloat** | 5+ buttons in a single view creates decision paralysis. | 1 primary CTA, 1–2 secondary actions, everything else in overflow. |
| **Settings on the surface** | Showing every toggle and option upfront overwhelms new users. | Smart defaults + "Customize" entry point for power users. |
| **Rainbow status indicators** | Using 5+ colors for different statuses creates cognitive overload. | Limit to 3 status colors; use text labels alongside color. |
| **Modal abuse** | Modals that spawn modals, or modals for non-critical info, feel like interruptions. | Reserve modals for confirmations and focused tasks. Use inline expansion or side panels for supplementary content. |
| **Icon-only navigation** | Users guess at meaning, increasing error rate and cognitive load. | Always label primary navigation. Icon-only is for toolbar-density UIs where users have learned the icons. |
| **Infinite scrolling without anchor** | Users lose their place and can't share or return to specific content. | Provide pagination, "back to top", or section anchors for long content. |
| **Decoration masquerading as UI** | Gradients, shapes, and illustrations that look interactive but aren't. | Every visual element should either communicate information or provide interaction. Decoration should never mimic affordance. |

---

## Implementation Checklist

Before considering any interface complete, verify:

- [ ] **Squint test:** Squint at the screen. Can you identify the primary action? If not, the hierarchy has failed.
- [ ] **5-second test:** Could a new user understand the purpose of this screen within 5 seconds?
- [ ] **Tier audit:** Is every visible element classified as Tier 1, 2, or 3? Is Tier 3 properly hidden?
- [ ] **Tap target check:** All interactive elements are at least 44×44px (Apple) / 48×48dp (Material).
- [ ] **State coverage:** Do all interactive elements have default, hover, active, disabled, loading, and error states?
- [ ] **Empty state:** Does every list, table, or dynamic area have a meaningful empty state?
- [ ] **Error recovery:** Can the user undo or recover from every destructive action?
- [ ] **Contrast check:** Does all text meet WCAG AA contrast ratios?
- [ ] **Responsive reduction:** Does the layout gracefully reduce (not just compress) on smaller viewports?
- [ ] **Cognitive load:** Count the number of decisions on screen. If it's more than 5, reduce.