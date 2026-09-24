# REVIEW PLAN ENGINE — EXPLORATION REPORT

## 1. Current Architecture
The Quranic Plan Engine (QRMS Engine) is designed as a modular, decoupled, and event-driven architecture that manages the planning, scheduling, progress tracking, and dynamic recalculation of a student's memorization and revision syllabus. The core code resides within the `src/quran` directory, keeping business logic entirely separate from database engines and view templates. 

The application architecture consists of six vital subsystems:
1. **The Representation Layer (TypeScript Types & Entities):** Defined in `src/quran/types/plan.ts` and `src/quran/types/index.ts`. It provides standard interfaces for student plans (`StudentQuranPlan`), plan versions (`PlanVersionRecord`), daily items (`DailyPlanItem`), and recalculation details (`RecalculationEvent`).
2. **The View & Orchestration Layer (React UI Modals):** `src/components/quran/StudentQuranPlanModal.tsx` serves as the form controller where teachers and supervisors set initial parameters and view the generated outputs. It interacts with the state via `AppContext.tsx`.
3. **The Logical Plan Bridge (Creation & Seeding):** `src/quran/services/studentPlanBridge.ts` takes student records from the PostgreSQL `students` table, normalizes surah spelling, maps grade stages to academic configurations, and invokes the planning engine to generate a fresh, personalized plan.
4. **The Core Planning Engine (Memorization Engine):** `src/quran/services/memorizationEngine.ts` coordinates academic calendars, working days, holidays, and target configurations to output a detailed, daily-partitioned calendar of tasks.
5. **The Structural Coordinate Partitioning Module (Range Calculator):** `src/quran/services/rangeCalculator.ts` contains raw mathematical and textual lookup algorithms. It splits absolute Quran ranges (Fatiha to Nas) into discrete, balanced pieces based on the requested unit type (lines, pages, halves, or verses).
6. **The Dynamic Progression & Locking Engine (Recalculation Service):** `src/quran/services/recalculationService.ts` reacts to daily attendance and recitation outcomes (such as completed, partial, or absent). It locks past days as non-editable historical records (`isHistorical: true`) and dynamically reschedules the remaining future syllabus.

---

## 2. Current Plan Creation Flow
When a teacher or supervisor decides to create a plan for a student, the system executes the following steps sequence:
1. **Form Input Collection:** In `StudentQuranPlanModal.tsx`, the user enters target start/end surahs, the daily amount, direction, unit types, working days, and daily revision amount.
2. **Stage Config Integration:** The system checks `stageConfig` matching the student's grade (e.g., *Baraem*, *Ashbal*) to extract default working days, term length, and default target surahs.
3. **Triggering the Bridge:** The form handler invokes `createRealStudentPlan` in `studentPlanBridge.ts`.
4. **Input Normalization & Parsing:** `convertStudentToQuranPosition` maps the student's typed Arabic current surah and ayah (from PostgreSQL) into formal coordinates (`QuranPosition`).
5. **Engine Dispatching:** The bridge passes these parameters down to `QuranMemorizationPlanningEngine.createPlan()`.
6. **Timeline & Academic Mapping:** The engine aligns the plan start and end dates with the operational weeks and filters out inactive academic holiday dates using `academic_years` tables.
7. **Daily Grid Synthesis:** The range calculator splits the range into a chronological grid.
8. **Summary Reconstruction:** Once the raw grid is generated, `rebuildSummaries()` categorizes progress into weekly, monthly, and seasonal performance indicators.
9. **Persistence:** The final plan structure is converted to a JSON block and committed to the `quran_plans` table via `saveQuranPlanToDb()` in `src/lib/dbService.ts`.

---

## 3. Current Review Engine
The current review planning mechanics are embedded directly inside the Range Calculator (`src/quran/services/rangeCalculator.ts`) through a sliding-window algorithm. It does not exist as a separate static database record but is computed dynamically on the fly during grid generation.

The core function is `computeRollingRevision` (lines `586-677`). It operates by:
- Creating a unique ordered array of all pages covered by the student's accumulated memorized verses.
- Measuring the target pages to review daily (`revisionDailyPages`).
- Sliding an index offset (`revisionWindowOffset`) across this ordered page array.
- Grouping the verses matching the active offset pages and generating an descriptive Arabic display string (e.g., `"مراجعة: من الفجر (1) إلى البلد (20)"`).
- Computing the next starting offset (`nextOffset`) using a circular modulo function, which wraps around the entire memorized repertoire.

---

## 4. Current Memorization Engine
The memorization engine in `src/quran/services/memorizationEngine.ts` plans daily assignments using the following rules:
- **Strict Surah Boundaries:** A single day's memorization assignment never crosses the boundary between two surahs.
- **Surah-Isolated Cumulative Pace:** To guarantee solid memorization, when a student is within a Surah, their daily target starts from Ayah 1 of that Surah and extends to the newly assigned end checkpoint. This provides continuous reinforcement of the active Surah.
- **Pacing Control:** Pacing is defined by `dailyAmount` (e.g., 3 verses, 1 page, 1 half-page) and the unit of measure (`unitType`).
- **Recalculation Integrity:** The engine preserves all previous marked items (such as "completed" or "partial") as immutable historical entities, while shifting unrecited portions and recalculating the future days list.

---

## 5. Existing Repeat-3 Logic
The system implements a robust **3-Day Consolidation Cycle** upon the completion of any Surah:
- **Location:** Managed in `src/quran/services/rangeCalculator.ts` inside `partitionSurahsWithCumulativePaceAndConsolidation` (lines `534-575`).
- **Mechanism:** When the engine reaches the final Ayah of a Surah (e.g., Ayah 40 of Surah An-Naba), it halts further forward progression.
- **Insertion:** It injects exactly 3 consecutive working days into the calendar specifically flagged as `isConsolidation: true` with a day index (`1/3`, `2/3`, `3/3`).
- **Activity Labeling:** The labels are formatted as: `"تثبيت سورة [الاسم] كاملة (1 - [عدد الآيات]) [اليوم c/3]"`.
- **Review Continuity:** During these 3 days, the rolling revision sliding window continues to operate normally, shifting the offset each day.
- **Syllabus Progression:** Only after these 3 consolidation days are fully scheduled does the engine proceed to Ayah 1 of the next Surah in the sequence.

---

## 6. Current Direction Logic
The direction logic determines the order in which surahs and chapters are processed:
- **Values:** The direction is typed as `PlanDirection` in `plan.ts` and can be either `'forward'` (progressive: Fatiha to Nas) or `'backward'` (regressive: Nas to Fatiha).
- **Metadata Sorter:** `getSurahsInRangeByDirection()` (imported from `utils/quranMetadata.ts`) takes the boundary surah numbers and sorts the list according to the active direction.
- **Impact on Indexing:** In `'backward'` direction, the array of surahs starts with larger numbers (e.g., 114, 113, 112) and decreases.
- **Direction Flip:** To derive the opposite direction, the system simply swaps the values:
  ```typescript
  const oppositeDirection = currentDirection === 'forward' ? 'backward' : 'forward';
  ```

---

## 7. Current Review Start/End/Amount Logic
- **`reviewStart` & `reviewEnd`:** In the current codebase, these are **not** saved as absolute, static, user-inputted coordinates. Instead, they are computed dynamically. The UI fields are purely representations or fallback values. The engine computes the actual active revision start and end pages on each day's entry using `computeRollingRevision`.
- **`reviewAmount` (or `revisionDailyPages`):** This is a mandatory, user-defined parameter representing the number of pages the student must review per day. It is highly active in calculations, determining how many pages are extracted from the unique pages array during the sliding window slicing.
- **Usage of End Field:** The `reviewEnd` field in the modal UI acts as a bounding fallback for custom static ranges. However, in the core sliding engine, the upper bound is naturally bounded by the student's maximum accumulated memorization position.

---

## 8. Current Progress Source
The current "Source of Truth" for student progress across the codebase is:
1. **The Primary Database Source:** The columns `current_surah` and `current_ayah` on the `students` table in PostgreSQL.
2. **The Active Runtime Source:** The `currentPosition` field on the active `StudentQuranPlan` object.
3. **The Chronological Ledger:** The sequential array of locked days (`isLocked: true`, `isHistorical: true`) within `generatedPlan.dailyPlans` in `StudentQuranPlan`.

---

## 9. Proposed Auto Minor Revision Logic
The "Auto Minor Revision" mode automatically computes the rolling revision boundaries based on the student's historical and real-time accumulated memorization, rather than requiring teachers to manually specify static start and end chapters.

### Mathematical Algorithm:
1. When generating or recalculating a plan, if `autoMinorRevisionMode` is `ON`:
2. The system queries the database to find the student's historical starting point (the verses memorized prior to the start of the current plan).
3. The engine populates the `memorizedVersesAccumulator` array with these historical verses first (**Pre-Hydration**).
4. As the student progresses day-by-day in the current plan, newly memorized verses are appended to the accumulator array.
5. The sliding window size is bounded by `revisionDailyPages`.
6. The engine shifts the `revisionWindowOffset` forward on each active day, sliding the revision range seamlessly across both historical and newly acquired verses.

---

## 10. ON vs OFF Behavior
- **MODE A — Auto Minor Revision = ON (Default):**
  - **`reviewStart`:** Computed dynamically as the current page corresponding to the `revisionWindowOffset` index of the accumulated verses.
  - **`reviewEnd`:** Bounded by `reviewStart` + `revisionDailyPages`.
  - **`reviewAmount`:** Configured manually by the teacher/supervisor in pages.
  - **User Experience:** The fields for manual start and end selection are disabled/hidden in the setup form, reducing cognitive load.
- **MODE B — Auto Minor Revision = OFF (Legacy Fallback):**
  - **`reviewStart`:** Manually entered by the teacher in the setup form (e.g., starting from Surah Al-Mulk).
  - **`reviewEnd`:** Manually entered by the teacher or defaults to the start of the current plan's memorization range.
  - **`reviewAmount`:** Configured manually by the teacher in pages.
  - **User Experience:** Manual selection dropdowns for revision start and end are shown. The sliding window is constrained strictly within this designated range.

---

## 11. Dynamic Recalculation Point
To avoid the revision window freezing or getting out of sync when a student's progress changes, the revision range must be recalculated in real-time.
- **The Event Trigger:** The completion of a daily recitation recorded via `recordDailyAchievement` in `PlanRecalculationService` (triggered when status is marked as `'completed'`, `'overachieved'`, or `'partial'`).
- **Recalculation Logic:**
  - Upon recording a successful achievement, `planClone.currentPosition` is updated.
  - The service triggers a rebuild of the future daily plans starting from the day after the achievement date (`effectiveFromDate`).
  - The range calculator is invoked with the updated `currentPosition`, which appends the newly completed verses to the accumulator and slides the `revisionWindowOffset` forward. This ensures the revision syllabus dynamically rolls forward in perfect synchronization with actual classroom performance.

---

## 12. Cycle Behavior
The sliding revision cycle works as follows:
1. **The Scope:** The total number of unique pages of memorized Quran text, $P$, sorted chronologically.
2. **The Window:** A sub-array of pages of size $W$ (defined by `revisionDailyPages`).
3. **The Index Pointer:** `revisionWindowOffset` ($O$), which tracks the current position in the page array.
4. **Day-to-Day Transition:** On day $d$, the pages reviewed are:
   $$\text{Pages} = \{ \text{uniquePages}[(O + i) \bmod P] \quad \text{for} \quad i \in [0, W-1] \}$$
5. **The Modulo Wrap-Around:** Once the offset $O$ plus window size $W$ exceeds the total number of pages $P$, the modulo operator $(\bmod \ P)$ automatically wraps the index back to $0$.
6. **Cycle Reset:** This returns the revision back to the student's earliest memorized chapters, starting a fresh cycle of revision without any manual adjustment.

---

## 13. UI Changes Required
All modifications are constrained to **`src/components/quran/StudentQuranPlanModal.tsx`**:
- **New State Variable:**
  ```typescript
  const [setupAutoMinorRevision, setSetupAutoMinorRevision] = useState<boolean>(true);
  ```
- **New Switch UI Component:** Add a toggle switch/checkbox labeled "البدء بالمراجعة الصغرى تلقائيًا" (Start minor revision automatically) at the top of the "إعدادات المراجعة" (Revision Settings) card section.
- **Conditional Visibility:**
  - If `setupAutoMinorRevision` is `true` (ON): Disable or hide the select dropdowns for `setupRevisionStartSurah` / `setupRevisionStartAyah` and `setupRevisionEndSurah` / `setupRevisionEndAyah`. Keep `setupRevisionDailyPages` (مقدار المراجعة اليومية) fully visible and editable.
  - If `setupAutoMinorRevision` is `false` (OFF): Display the start and end surah/ayah select dropdowns to allow manual range configuration.

---

## 14. API Changes Required
No structural modifications are needed for the network routing paths or controllers. The existing endpoints (`GET /api/quran_plans` and `POST /api/quran_plans`) are designed to pass general JSON bodies.
- **Payload update:** Ensure the frontend payload submitted to the POST endpoint includes the new boolean property:
  ```json
  {
    "plan_data": {
      "autoMinorRevisionMode": true
    }
  }
  ```

---

## 15. Database Changes Required
The database schema handles the plan configuration within a flexible `JSONB` column.
- **Target Table:** `quran_plans`
- **Target Column:** `plan_data` (JSONB)
- **New Field Added to JSON Schema:**
  * **Key:** `autoMinorRevisionMode`
  * **Type:** `BOOLEAN`
  * **Default:** `TRUE`
  * **Nullable:** `YES` (if missing, it defaults to `true` to ensure backward compatibility)
- **No SQL DDL migrations are required**, as PostgreSQL natively supports arbitrary key additions within JSONB fields.

---

## 16. Backward Compatibility
To prevent breaking existing student plans that do not contain the `autoMinorRevisionMode` field:
- **Fallback Logic:** In the parsing and calculation functions, any missing or `undefined` value for `autoMinorRevisionMode` will be treated as `false` for old plans, or `true` if we want old plans to adopt the new behavior.
- **Recommendation:** Old plans should default to `false` (Auto Minor Revision OFF) so they preserve their existing manually configured revision paths, while new plans will have it set to `true` (ON) by default.
- **Implementation in Code:**
  ```typescript
  const isAutoMode = plan.autoMinorRevisionMode ?? false; // Safely preserves legacy plans
  ```

---

## 17. Edge Cases
- **First Surah in Quran (Al-Fatiha):** The unique page list will be very small ($1$ page). The engine handles this safely by falling back to Case 1 (`uniquePages.length <= targetPageCount`) and reviewing the entire available text without division.
- **Revision Pages Larger Than Memorized Pages:** If the student's daily revision amount is set to 2 pages but they have only memorized 1 page in total, the engine safely caps the window and displays the 1 page without throwing array out of bounds or division-by-zero errors.
- **Partial Chapter Memorization:** If a student memorizes a partial chapter (e.g., Al-Baqarah verses 1-50), the unique page array correctly extracts only the pages corresponding to those 50 verses, restricting the rolling revision strictly to the active pages.
- **Flipping Direction Mid-Plan:** If a teacher changes a plan's direction from `forward` to `backward` midway through, the unique page list in `computeRollingRevision` is automatically re-sorted to match the new learning sequence, ensuring a smooth transition.

---

## 18. Test Matrix

| Test Case ID | Scenario Description | Expected Outcome |
| :--- | :--- | :--- |
| **TC-01** | Create plan with `autoMinorRevisionMode` = `ON` for a new student with no previous progress. | The plan is successfully created. The initial revision items on day 1 and 2 cover exactly the verses being memorized on those same days, since the accumulator is initially small. |
| **TC-02** | Create plan with `autoMinorRevisionMode` = `ON` for an existing student with historical progress (e.g., has memorized up to Surah Al-Balad). | The accumulator is pre-hydrated with historical verses. Day 1 revision dynamically schedules a rolling window starting from Al-Balad and moving backward. |
| **TC-03** | Record daily achievement as "completed" for a memorization day. | The recalculation service is triggered. The newly completed verses are appended to the accumulator, and future revision days slide forward by the configured daily page amount. |
| **TC-04** | Record daily achievement as "absent". | The recalculation service is triggered. The `currentPosition` does not advance. The revision offset remains locked at the current position, ensuring the student reviews the same pages the next day. |
| **TC-05** | Toggle `autoMinorRevisionMode` to `OFF` during plan creation. | The UI displays the manual revision start and end selection dropdowns. The generated plan restricts the revision tasks strictly within the manually selected boundaries. |
| **TC-06** | A student completes a Surah and enters the 3-day consolidation cycle. | Forward memorization halts for 3 days. The daily plan displays consolidation tasks for that Surah, while the rolling revision continues to shift its window pages each day. |
| **TC-07** | A student's memorization direction is set to `'backward'`. | The surah list is sorted regreessively. The unique page list of the accumulator is ordered chronologically from the bottom of the Quran upwards, and the rolling revision moves in the same direction. |

---

## 19. Exact Files To Modify

### 1. File: `src/quran/types/plan.ts`
* **Function/Interface:** `StudentQuranPlan`
* **Current responsibility:** Defines the types and structural contracts for Quran plans.
* **Required future change:** Add `autoMinorRevisionMode?: boolean;` to the interface definition.
* **Risk:** Extremely low. Purely a TypeScript type addition.

### 2. File: `src/quran/services/studentPlanBridge.ts`
* **Function:** `createRealStudentPlan`
* **Current responsibility:** Converts student records into standard plans.
* **Required future change:** Parse the `autoMinorRevision` toggle from the UI form and pass it down to `memorizationEngine.createPlan()`.
* **Risk:** Low. Requires ensuring that missing inputs default to `true`.

### 3. File: `src/quran/services/rangeCalculator.ts`
* **Function:** `partitionSurahsWithCumulativePaceAndConsolidation`
* **Current responsibility:** Generates the structured list of planning units for the plan.
* **Required future change:** Add an optional `autoMinorRevision` boolean parameter. If `true`, pre-hydrate the `memorizedVersesAccumulator` with all verses starting from the student's historical starting point up to the current plan's `targetStart`.
* **Risk:** Medium. Requires careful database/provider query performance tuning to avoid slow loading when fetching large ranges of verses during pre-hydration.

### 4. File: `src/components/quran/StudentQuranPlanModal.tsx`
* **Component:** `StudentQuranPlanModal`
* **Current responsibility:** Form interface for setup, parameters, and creation.
* **Required future change:** Add a toggle switch for "المراجعة الصغرى تلقائيًا" (Auto Minor Revision). Bind the state to conditionally hide/disable the manual revision start and end select dropdowns.
* **Risk:** Low. Only visual changes and form state bindings.

---

## 20. Recommended Implementation Sequence

To implement this feature safely, Devin should follow this step-by-step sequence:

1. **Phase 1: Type Definitions and Schema Mapping**
   - Update `src/quran/types/plan.ts` to add `autoMinorRevisionMode` to the `StudentQuranPlan` interface.
2. **Phase 2: Core Range Calculator Pre-Hydration**
   - Update `partitionSurahsWithCumulativePaceAndConsolidation` in `src/quran/services/rangeCalculator.ts` to support pre-hydrating the accumulated verses array when the auto mode is active.
3. **Phase 3: Bridge and Engine Wiring**
   - Update `createRealStudentPlan` in `src/quran/services/studentPlanBridge.ts` and `createPlan` in `src/quran/services/memorizationEngine.ts` to accept and pass the new parameter.
4. **Phase 4: User Interface Integration**
   - Add the toggle switch to the setup form in `src/components/quran/StudentQuranPlanModal.tsx`. Bind it to conditionally disable the manual start/end dropdowns and pass the state value on submit.
5. **Phase 5: Verification & Testing**
   - Run the local linter (`npm run lint`) and build step (`npm run build`) to ensure there are no compilation errors.
   - Run the validation test suites in `src/quran/tests/` to verify plan calculation integrity.
