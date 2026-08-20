---
trigger: model_decision
---

# UX Design Principles for AI Interface Development

## Core Instruction

When designing or modifying any user interface, you MUST apply these evidence-based UX principles. Every design decision should be justified by at least one principle from this document.

---

## Fundamental UX Laws

### 1. Hick's Law

**Principle:** Decision time increases logarithmically with the number of options.

**Instructions:**

- Limit choices to 3-5 options per decision group
- Prioritize ONE primary action over multiple secondary options
- Group related options to reduce cognitive load
- Use progressive disclosure for advanced features

**Implementation:**

```
❌ AVOID: 7 buttons at the same level
✅ USE: 1 primary button + 2 secondary + rest in menu
```

---

### 2. Fitts's Law

**Principle:** Time to reach a target depends on its size and distance.

**Instructions:**

- Make important buttons larger (minimum 44x44px for touch)
- Place primary CTAs near relevant content
- Frequently used elements must be easily accessible
- Increase target size for critical actions

**Implementation:**

```
❌ AVOID: Small button (24px) far from content
✅ USE: Large button (48px) adjacent to related content
```

---

### 3. Miller's Law

**Principle:** Working memory can hold 7±2 elements simultaneously.

**Instructions:**

- Limit lists/menus to 5-9 items maximum
- Chunk information into groups of 3-5 elements
- Use categorization for long lists
- Implement pagination or infinite scroll for large datasets

**Implementation:**

```
❌ AVOID: List of 15 ungrouped options
✅ USE: 3 categories with 5 options each
```

---

### 4. F-Pattern Reading

**Principle:** Users scan content in an F-shaped pattern (horizontal top, then vertical left).

**Instructions:**

- Place most important information top-left
- Position CTAs in the high-attention zone (top)
- Left-align titles and subtitles
- Put critical content in first lines

**Implementation:**

```
✅ Optimal structure:
┌─────────────────────┐
│ [TITLE]      [CTA]  │ ← Hot zone
│ Description...      │
│ • Point 1           │ ← Vertical scan
│ • Point 2           │
└─────────────────────┘
```

---

### 5. Jakob's Law

**Principle:** Users prefer your site to work like all other sites they already know.

**Instructions:**

- Use established design patterns (hamburger menu, tabs, cards)
- Never reinvent basic controls (checkboxes, dropdowns)
- Maintain navigation conventions (logo top-left)
- Use standard icons for common actions (🔍 search, 🏠 home, ⚙️ settings)

**Implementation:**

```
❌ AVOID: "X" button to confirm, "✓" to cancel
✅ USE: "✓" confirm, "X" cancel (universal convention)
```

---

### 6. Law of Proximity (Gestalt)

**Principle:** Elements close together are perceived as related.

**Instructions:**

- Visually group related elements
- Use spacing to separate sections
- Place labels near their inputs
- Position action buttons near the content they affect

**Implementation:**

```
❌ AVOID:
[Input]
[Another Input]
[Label for first input]

✅ USE:
[Label]
[Input]

[Another Label]
[Another Input]
```

---

### 7. Progressive Disclosure

**Principle:** Show only information necessary for the current task.

**Instructions:**

- Reveal advanced options on demand
- Use wizards/steppers for complex processes
- Implement tooltips for additional information
- Use accordions for optional content

**Implementation:**

```
✅ Onboarding:
Step 1: Basic info
Step 2: Details (only if necessary)
Step 3: Advanced settings (optional)
```

---

### 8. Serial Position Effect

**Principle:** Users remember first and last items in a list best.

**Instructions:**

- Place critical information at beginning and end
- Position primary CTA at end of process
- Show summary at start of long forms
- Provide confirmation at end of transactions

**Implementation:**

```
✅ Pricing list:
1. Basic Plan (remembered)
2. Standard Plan
3. Pro Plan
4. Enterprise Plan (remembered)
```

---

### 9. Parkinson's Law

**Principle:** Work expands to fill the time available.

**Instructions:**

- Keep forms short = higher completion rate
- Use time limits for offers (create urgency)
- Show progress bars to motivate completion
- Clearly mark optional fields

**Implementation:**

```
❌ AVOID: 20-field form without progress indicator
✅ USE: 3 steps with 5-7 fields each + progress bar
```

---

### 10. Consistency Principle

**Principle:** Similar elements should look and behave similarly.

**Instructions:**

- Use same style for all primary buttons
- Maintain consistent iconography throughout app
- Apply same interaction patterns (hover, click, drag)
- Use uniform terminology (not "Delete" in one place and "Remove" in another)

**Implementation:**

```
✅ Consistency:
- All primary buttons: green, 48px height, rounded
- All secondary buttons: outlined, 48px height
- All text buttons: no border, 48px height
```

---

## Information Hierarchy

### Visual Priority Pyramid

```
        [Primary CTA]             ← Maximum prominence
       /              \
   [Title]        [Image]         ← High prominence
      |                |
[Description]    [Subtitles]     ← Medium prominence
      |                |
[Details]       [Metadata]       ← Low prominence
```

**Instructions:**

1. **Level 1:** Primary action (1 element only)
2. **Level 2:** Critical context (2-3 elements)
3. **Level 3:** Supporting information (3-5 elements)
4. **Level 4:** Optional details (remaining)

---

## Conversion Patterns

### Optimal Conversion Funnel

```
1. Attention   → Title + Impactful visual
2. Interest    → Benefit description
3. Desire      → Social proof + features
4. Action      → Clear and prominent CTA
5. Retention   → Next steps / onboarding
```

**Instructions:**

- Each step must have ONE clear objective
- Eliminate friction (unnecessary fields, extra steps)
- Use ethical urgency (limited stock, time-bound offers)
- Confirm completed action (immediate feedback)

---

## Form Design Principles

### High-Conversion Form Design

**1. Structure:**

```
✅ Logical order:
- Personal information
- Contact information
- Preferences
- Confirmation
```

**2. Validation:**

- Use inline validation (real-time)
- Provide specific, actionable error messages
- Show clear visual indicators (red = error, green = success)
- Never clear user input when validating

**3. Assistance:**

- Keep labels always visible (not just placeholder)
- Add tooltips for complex fields
- Show format examples (e.g., "DD/MM/YYYY")
- Enable autocomplete when possible

**4. Length:**

```
❌ AVOID: 1 page with 30 fields
✅ USE: 3 steps with 10 fields each
✅ BETTER: 5 steps with 6 fields each
```

---

## Critical Microinteractions

### Interactive Element States

**Buttons:**

```css
Default:   Normal state
Hover:     Subtle change (color, elevation)
Active:    Immediate feedback (pressed)
Disabled:  50% opacity, cursor not-allowed
Loading:   Spinner + "Processing..." text
Success:   Checkmark + success color (temporary)
```

**Inputs:**

```css
Default:   Light gray border
Focus:     Primary color border + outline
Error:     Red border + specific message
Success:   Green border + checkmark
Disabled:  Gray background + cursor not-allowed
```

---

## Accessibility Principles (A11y)

### WCAG 2.1 Essentials

**Instructions:**

**1. Color Contrast:**

- Normal text: minimum 4.5:1
- Large text (18pt+): minimum 3:1
- UI elements: minimum 3:1

**2. Keyboard Navigation:**

- All interactive elements accessible via Tab
- Visible focus (clear outline)
- Skip links for quick navigation
- Document all shortcuts

**3. Screen Readers:**

- Descriptive alt text on images
- Labels on all inputs
- ARIA labels when necessary
- Semantic structure (h1, h2, nav, main, etc.)

**4. Touch Targets:**

- Minimum 44x44px for touch elements
- Minimum 8px spacing between elements
- Generous click areas

---

## Color Psychology in UI

### Cultural Meanings (Western Context)

```
🔴 Red:     Error, urgency, danger, stop
🟢 Green:   Success, confirmation, safe, continue
🔵 Blue:    Trust, professional, information
🟡 Yellow:  Warning, attention, caution
🟣 Purple:  Premium, luxury, creativity
🟠 Orange:  Action, energy, call-to-action
⚫ Black:   Elegance, power, sophistication
⚪ White:   Cleanliness, simplicity, space
```

**Instructions:**

- Destructive buttons: red
- Confirmation buttons: green/blue
- Warning alerts: yellow/orange
- Neutral information: blue/gray

---

## Timing and Animations

### Optimal Durations

```
Micro-interactions:  100-200ms  (hover, click)
Transitions:         200-400ms  (modals, dropdowns)
Animations:          400-600ms  (page transitions)
Loaders:             >1000ms    (show after 1s)
```

**Instructions:**

- Faster = more responsive feel
- Slower = more dramatic/important
- Use natural easing (ease-out for entrances, ease-in for exits)
- Never block UI with animations

---

## Loading States

### Strategies by Wait Time

```
<200ms:    No indicator (imperceptible)
200-1000ms: Simple spinner
1-3s:      Skeleton screens
3-10s:     Progress bar + message
>10s:      Progress bar + estimated time + cancel option
```

**Instructions:**

- Skeleton screens > spinners (perception of speed)
- Show partial content while rest loads
- Never use generic "Loading..." (be specific)
- Optimistic UI: assume success and revert if fails

---

## Design Validation Checklist

Before proposing any design, verify:

### ✅ Visual Hierarchy

- [ ] Is there ONE clearly dominant primary element?
- [ ] Are secondary elements visually subordinate?
- [ ] Does visual flow guide to desired objective?

### ✅ Accessibility

- [ ] Sufficient color contrast (4.5:1)?
- [ ] All elements keyboard navigable?
- [ ] Descriptive labels on all inputs?
- [ ] Minimum touch sizes (44x44px)?

### ✅ Usability

- [ ] Less than 7 options per decision group?
- [ ] Familiar patterns (Jakob's Law)?
- [ ] Immediate feedback on all actions?
- [ ] Clear and actionable error states?

### ✅ Conversion

- [ ] Primary CTA visible without scrolling?
- [ ] Minimal forms (only necessary fields)?
- [ ] Visible progress in multi-step processes?
- [ ] Clear confirmation of completed actions?

### ✅ Perceived Performance

- [ ] Skeleton screens for loads >1s?
- [ ] Optimistic UI where possible?
- [ ] Animations <400ms?
- [ ] Lazy loading for below-the-fold content?

---

## Common Anti-Patterns to Avoid

### ❌ Frequent Mistakes

**1. Dark Patterns (manipulation)**

- Hiding unsubscribe option
- Pre-selecting expensive options
- Using double negatives ("No, I don't want to save")

**2. Cognitive Overload**

- Too many options simultaneously
- 20+ field forms on one page
- Critical information buried in long text

**3. Lack of Feedback**

- Buttons without loading state
- Actions without visual confirmation
- Errors without specific message

**4. Inconsistency**

- Primary buttons with different styles
- Variable terminology ("Delete" vs "Remove")
- Different navigation patterns per section

**5. Ignored Accessibility**

- Insufficient contrast
- Elements not keyboard navigable
- Images without alt text

---

## Executive Summary for AI

**When designing an interface, ALWAYS:**

1. **Prioritize ONE primary action** (Hick's Law)
2. **Place critical elements top-left** (F-Pattern)
3. **Use familiar patterns** (Jakob's Law)
4. **Group related elements** (Proximity)
5. **Limit options to 5-7** (Miller's Law)
6. **Provide immediate feedback** (Microinteractions)
7. **Maintain visual consistency** (Consistency Principle)
8. **Design for accessibility** (WCAG 2.1)
9. **Optimize for conversion** (AIDA Funnel)
10. **Validate with checklist** (Before proposing)

---

## Critical Decision Framework

### When Placing Elements in a Page

**Question:** Should Next Steps come before or after action buttons?

**Answer:** AFTER buttons

**Reasoning:**

1. **Action Priority:** User just completed something → immediate action (Preview) > future planning (Next Steps)
2. **Decision Flow:** "What now?" → [Buttons] → "What next?" → [Next Steps]
3. **Avoid Analysis Paralysis:** Reading 3 cards before acting = distraction from primary CTA
4. **Conversion Optimization:** CTA first = higher conversion rate

**Structure:**

```
✅ CORRECT:
🚀 Celebration
📝 Title + Description
🔘 Action Buttons      ← User acts immediately
━━━━━━━━━━━━━━━━━━━
📋 Next Steps          ← User reads after acting
```

---

## Uncomfortable Truth

A "beautiful" design that doesn't convert is a failure. Prioritize usability over aesthetics, but strive for both.

Every design decision must be backed by at least one principle from this document. If you cannot justify a design choice with UX principles, reconsider it.

---

## Application Instructions

1. **Before designing:** Review relevant principles for the component type
2. **During design:** Apply at least 3 principles to justify decisions
3. **After design:** Run through validation checklist
4. **When uncertain:** Choose the option that follows more principles
5. **When conflicting:** Prioritize accessibility and usability over aesthetics

This document is your constant reference when designing any interface. Use it.
