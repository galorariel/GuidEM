# GuidEM Project Roadmap

This document outlines future features, deferred modules, and architectural extensions for GuidEM.

---

## 👨&zwj;👩&zwj;👦 Round 5 — Parent Accounts (Deferred)

The parent accounts feature allows parents to view their children's progress without compromising the privacy of the child's raw step-by-step pathway.

### 1. Database Schema (`supabase/migrations/*_parents.sql`)
- **`link_code` on profiles**: A unique, 6-character alphanumeric string generated for each student profile (excluding ambiguous characters like `0, O, 1, I, L`). A helper `ensure_link_code()` (SECURITY DEFINER) retrieves or backfills the code.
- **`parent_links` table**: A junction table mapping `parent_id` to `child_id`. RLS allows SELECT/DELETE only for the parent or child. Linking is locked down to a secure RPC function to prevent forging links.
- **`link_child_by_code(p_code)`**: RPC function (SECURITY DEFINER) that validates a code, checks roles, links parent to child, and returns child metadata.
- **`is_parent_of(child_id)`**: Stable SECURITY DEFINER SQL function that checks if `auth.uid()` is linked to the child. Used for RLS policies to avoid circular recursion.
- **`progress_summaries` table RLS**: Updated to allow SELECT if `auth.uid() = user_id` OR `is_parent_of(user_id)`.

### 2. Parent Services (`services/parents.ts`)
- `ensureLinkCode(userId)` — retrieves or creates the student link code.
- `linkChildByCode(parentId, code)` — links a parent to a child.
- `getLinkedChildren(parentId)` — fetches profiles of children linked to this parent.
- `getChildSummaries(childId)` — fetches progress summaries of a linked child.

---

## 🎨 Interactive Steps & In-App Feedback Loop (Deferred)

These features enhance step detail interactivity inside the app, but are deferred for later consideration:

### 1. Interactive Reflections
- Renders a `<TextInput>` for the student to write their thoughts directly within the step drawer.
- Submitting the reflection saves it in `payload.reflectionText` and marks the step done.
- The AI reads past reflections so subsequent units are shaped by the student's qualitative thoughts.

### 2. Interactive Quizzes
- Quiz steps contain multiple-choice questions in their payload.
- The UI renders selectable options, and the student must pick the correct one to complete the step.

### 3. Clickable Resources (In-App)
- Interactive buttons to open resources in-app or track links clicked within the application frame.

---

## 🎨 Other Future Enhancements

### 1. Nesting Career Specializations
- Multi-tier career hierarchy (e.g. `Software Engineer` → `Frontend Developer` → `React Native Developer`).
- Standardize catalog mappings to allow children to pivot between branches at different parent nodes.

### 2. Parent Push Notifications
- Push notification system via Expo Notifications.
- Alert parents when a child completes a major unit, makes a branching decision, or completes a career milestone.
