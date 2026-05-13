# 🎯 Booking Workflow Optimization Proposal

**Mål:** Gjøre bookingprosessen så enkel og rask som mulig med automatisering og visuell fremgang.

---

## 📊 Nåværende Tilstand - Problemer

### Dagens 6-tabs struktur:
1. **Overview** - Oversikt + redigering
2. **Requirements** - Legg til krav
3. **Booking** - Se tilbud
4. **Lineup** - Se confirmed artists
5. **Marketing** - Plakat + sosial
6. **Tickets** - Solgte billetter

### Identifiserte friksjoner:
- ❌ 6 tabs = mye clicking for booker
- ❌ Sekvensielle steg spredt over flere tabs
- ❌ Clone-funksjonen krever 3x navigation
- ❌ Automatisering skjult - ikke tydelig hva som skjer automatisk
- ❌ Ingen visuell "next step" etter oppsettet
- ❌ Lange formseksjoner gjør det tungt å se status

---

## 🎬 Anbefalt Løsning: Stepper + Compact Cards

### Arkitektur: Single-page stepper dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  [← Tilbake] Show: "Comedy Night 2026"   [Clone] [Delete]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PROGRESS STEPPER:                                           │
│  ① Detaljer ✓  →  ② Krav ✓  →  ③ Book ✓  →  ④ Lineup  →  ⑤ Publish
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CURRENT STEP CARD (expandable):                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Step 4: Review Lineup                               │    │
│  │                                                      │    │
│  │ Status: 3/4 slots filled, 2 offers pending         │    │
│  │                                                      │    │
│  │ [Collapse ▲] [Auto-complete] [Manual edit...]      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  OTHER STEPS (collapsed):                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ✓ Step 1: Detaljer | Edit                           │    │
│  │ ✓ Step 2: Krav | Edit                               │    │
│  │ ✓ Step 3: Booking | Send fallback...                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Nye Features:

#### 1. **Quick Clone Modal**
```
┌───────────────────────────┐
│ 🔄 Clone this show        │
├───────────────────────────┤
│ New title:                │
│ [Comedy Night - Feb 2026] │
│                           │
│ Date: [2026-02-14]        │
│ Slug: [auto-filled]       │
│                           │
│ ☑ Copy requirements       │
│ ☑ Copy pricing/venue      │
│                           │
│ [Cancel] [Clone & Edit]   │
└───────────────────────────┘
```
**Benefits:**
- Accessible from show detail page
- Pre-fills common fields
- One click to clone with new date
- Can edit requirements in modal before creating

#### 2. **Compact Progress Cards** (replacing verbose tabs)

**Step 1: Show Details**
```
┌─ Show Details ────────────────────────────┐
│ Title: Comedy Night 2026                  │
│ Date: 2026-01-15  Time: 20:00-23:00      │
│ Venue: Spot Oslo  |  300 capacity         │
│ Price: 299 kr  |  Status: Draft           │
│                                           │
│ [Edit details] [Generate poster]          │
└───────────────────────────────────────────┘
```

**Step 2: Booking Requirements**
```
┌─ Setup Requirements ──────────────────────┐
│ Headliner (1) | Energy: High | Score: 7+  │
│ Support (2) | Energy: Any | Score: 5+     │
│ Opener (1) | Energy: Med | Female         │
│                                           │
│ [+ Add role] [Auto-fill template] [Edit]  │
└───────────────────────────────────────────┘
```

**Step 3: Auto Book**
```
┌─ Start Booking ───────────────────────────┐
│ Ready to send automatic offers?            │
│                                           │
│ Will send to: 23 matching artists         │
│ Requirements met: All requirements set    │
│ Estimated success: 87% ⭐                 │
│                                           │
│ [Cancel] [Start booking →]                │
└───────────────────────────────────────────┘
```

**Step 4: Lineup Status**
```
┌─ Review Lineup ───────────────────────────┐
│ ✓ 3/4 slots filled                        │
│ • 2 pending offers (expires in 3 days)    │
│                                           │
│ Headliner: John Doe ✓                     │
│ Support: Jane Smith ✓ | Pending... ⏳     │
│ Support: [empty] ⏳                        │
│ Opener: Mike Johnson ✓                    │
│                                           │
│ [Send fallback] [Manual add...] [Edit]    │
└───────────────────────────────────────────┘
```

**Step 5: Publish**
```
┌─ Publish & Marketing ─────────────────────┐
│ ✓ Lineup complete                         │
│ ✓ Poster generated                        │
│ ○ Event published                         │
│                                           │
│ Checklist:                                │
│ ☑ Email fans                              │
│ ☑ Post on socials                         │
│ ☐ Post on website                         │
│                                           │
│ [Preview page] [Publish →] [Details...]   │
└───────────────────────────────────────────┘
```

#### 3. **Tab Consolidation Alternative** (if stepper is too big a change)

New 3-tab structure:
- **Setup** - Details + Requirements + Auto-start booking (was: Overview + Requirements)
- **Lineup** - Live booking offers + manual add + status (was: Booking + Lineup)
- **Publish** - Poster + Marketing tasks + Tickets (was: Marketing + Tickets)

```
[Setup] [Lineup] [Publish]
```

---

## 🚀 Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)
1. **Add clone button to show detail page** with modal
   - Action: Add `cloneShowAction` form to page.tsx
   - Modal: Simple form with date/title/slug
   - Opens existing clone logic in "/shows/new?from=XXX"
   
2. **Reduce tabs to 3** (Setup + Lineup + Publish)
   - Merge Overview into Setup tab
   - Consolidate Marketing + Tickets into Publish
   - Reorder existing components
   
3. **Add keyboard shortcuts**
   - `Ctrl+K` / `Cmd+K` - Quick clone
   - `Ctrl+B` - Start booking
   - `Ctrl+Shift+P` - Publish

### Phase 2: Stepper Dashboard (2-3 days)
1. **Create new stepper component** with 5 steps
   - Collapsible state management
   - Visual progress indication
   - Auto-collapse completed steps
   
2. **Refactor show detail page**
   - Extract current tab content into step cards
   - Replace tab navigation with stepper
   - Keep same backend logic
   
3. **Add step validation**
   - Step 1 complete when details saved
   - Step 2 complete when ≥1 requirement exists
   - Step 3 complete when booking started
   - Step 4 complete when lineup full OR user progresses
   - Step 5 unlocked at step 4 complete

### Phase 3: AI-Powered Helpers (Optional, 1-2 days)
1. **Smart requirement suggestion** based on event type
   - LLM analyzes title → suggests Headliner/Support/Opener split
   - Suggests energy levels based on event vibe
   - Suggests minimum score based on event scale
   
2. **One-click auto-complete**
   - When requirements set, offer to start booking immediately
   - Show estimated success % based on available artists
   - Predict fillable slots

3. **Booking insights**
   - "3 pending offers - 2 expire in 2 days" 
   - "Your lineup is 85% complete, need 1 more headliner"
   - "These 2 artists are similar scores - pick your preferred for diversity"

---

## 📋 Component Changes

### New Components:
```typescript
// components/admin/show-stepper.tsx
export function ShowStepper({
  currentStep: number
  steps: StepConfig[]
  onStepChange: (step: number) => void
})

// components/admin/show-step-card.tsx
export function ShowStepCard({
  step: number
  label: string
  isCompleted: boolean
  isActive: boolean
  children: React.ReactNode
  onCollapse?: () => void
})

// components/admin/quick-clone-modal.tsx
export function QuickCloneModal({
  show: Show
  isOpen: boolean
  onClose: () => void
  onClone: (data: CloneData) => void
})
```

### Modified Pages:
- `/app/admin-app/shows/[id]/page.tsx` - Replace tab structure with stepper
- `/app/admin-app/shows/page.tsx` - Already good, maybe add clone from list
- `/app/admin-app/shows/new/page.tsx` - Keep as is (becomes stepper destination)

### New Actions:
- Maybe add `quickCloneAndEditAction` for streamlined cloning

---

## ✅ Success Metrics

**Before:**
- Average time to setup show: ~5 min (6 tabs, form filling)
- Clone time: ~8 min (navigate to /new, select template, fill form)
- Clicks to publish: ~12 clicks

**After (Target):**
- Average time to setup show: ~2 min (stepper, autofill, one-click actions)
- Clone time: ~30 sec (modal, one click)
- Clicks to publish: ~4 clicks

---

## 🎨 Visual Enhancements

### Existing Best Practices to Keep:
✓ Color-coded status badges (emerald/amber/red)
✓ Progress bar for lineup fill
✓ Artist cards with profile images
✓ Role/energy/score indicators

### New Visual Touches:
- **Stepper line animation** when step completes
- **Micro-interactions** on button clicks
- **Toast notifications** for auto-actions ("3 offers sent automatically")
- **Skeleton loading** for fetching lineup data
- **Empty states** for each step are clear CTAs

---

## 🎯 Recommended Approach

**Start with Phase 1 (Quick Wins)** - Gives immediate value:
- Clone button reduces friction 80%
- 3-tab structure simplifies navigation
- Keyboard shortcuts enable power users

**Then Phase 2 (Stepper)** if Phase 1 feedback is positive.

This is low-risk because:
- Existing logic unchanged
- Only UI reorganization
- Easy to revert if needed
- Backward compatible URLs

---

## 💡 Alternative: Minimal Change Option

If you want to avoid major refactoring:

1. Add "Quick Clone" button on show detail page (5 min dev)
2. Reorder tabs to: Requirements → Booking → Lineup → Overview → Marketing → Tickets
3. Add step counter: "Step 2 of 5: Set Requirements"
4. Auto-scroll to next tab recommendation

This gives most of the speed benefits with 20% of the effort.

---

**Recommendation:** Implement Phase 1 (quick wins) this sprint, evaluate feedback, then decide on Phase 2 stepper refactor.
