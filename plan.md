# Plan — AI Career Guide Real Path Generation

Concept: see `guidem.md` and `roadmap.md`. We are focusing on delivering real-world, AI-generated learning paths that build a student's career toolset using actual web sources (courses, articles, videos, tools) with external links.

---

## Current Status

| Round | Feature | State | Description |
|-------|---------|-------|-------------|
| 1 | Sign-up Personalization | ✅ merged | City/grade/majors + `personality_type` column on `profiles` |
| 2 | Career Goal Mechanic | ✅ merged | Set/clear goal from Search, Career Details, and Guide |
| 3 | Questionnaire Integration | ✅ merged | RIASEC quiz -> persist `personality_type` -> recommend careers |
| 3.1 | Stateful Questionnaire | ✅ merged | Quiz view if not taken, results view + retake option if completed |
| 4 | Unit Guide Foundation | ✅ merged | Two-phase guide structure, specialization choices, mock content |
| 4.1 | Developer Settings | ✅ merged | Reset learning path action relocated to Profile |
| **5** | **Real-world External Links** | **NEXT** | Renders external URLs (Google courses, DevTools docs, etc.) in step UI |
| **6** | **AI Path Generation (LLM)** | **NEXT** | Deploy `generate-unit` Supabase Edge Function using Gemini to create paths |

---

## Round 5 — Real-world External Links (NEXT)

Ensure our frontend steps can display and open external resources in the native web browser or external apps (e.g. YouTube, Google Chrome, LinkedIn).

### 1. Step Payload Schema
We will support optional external link properties in `guide_steps.payload`:
```typescript
export interface GeneratedStep {
  kind: StepKind;
  title: string;
  body: string;
  payload?: {
    externalUrl?: string; // e.g. "https://grow.google/certificates/ux-design"
    linkLabel?: string;   // e.g. "Open Google UX Design Course"
  };
}
```

### 2. UI Updates (`app/(tabs)/index.tsx`)
- Inside the expanded step details drawer, if `step.payload.externalUrl` is present:
  - Render a prominent action button labeled with `step.payload.linkLabel` (or a fallback like "Open Link").
  - Tapping this button opens the link using React Native's `Linking.openURL(url)` to launch it in the device's native browser or respective app (e.g. YouTube or LinkedIn).

---

## Round 6 — AI Path Generation (LLM) (NEXT)

Replace the deterministic mock generator with a live LLM-powered Supabase Edge Function that generates actual, highly targeted learning paths utilizing web resources.

### 1. Supabase Edge Function (`supabase/functions/generate-unit`)
- Create a new Edge Function that receives the `GenerateContext` (or `ChoiceGenerateContext`).
- Instructs Gemini (using system instructions) to design a unit plan building the student's toolset.
- Prompts Gemini to supply real-world URLs for courses, articles, tutorials, DevTools documentation, etc., fitting the career goal and specialization.
- The prompt will use the student's Israel-based location (city), current grade, and majors to contextualize the learning steps.

### 2. Transaction and Error Safety
- Ensure robust database inserts for the Edge Function outputs. Add transaction checks to ensure the unit and steps are committed atomically.
