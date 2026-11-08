# Department and batch upgrade

## Changes
- Added department and batch management, student batch membership, and search/filter controls for people, courses and assignments.
- Separated course definitions and assessment criteria from staff-to-course/batch assignments and enrollment.
- Added editable assessment rows with add/remove controls. Recorded marks prevent deletion of their criterion or an incompatible reduction in maximum marks.
- Added staff batch roster entry for marks and configured-slot attendance, with selected-student submission, atomic validation and individual corrections.
- Added administrator exam timetable editing (including Mid and End), circulars, events and attendance-slot configuration.
- Added a temporary, dismissible event banner and searchable campus update history.
- Expanded student-only, read-only assistant context to own academic records and campus circular/event/exam information. Gemini stays server-side with consent.
- Added explicit administrator password reset for Staff, Student and Parent accounts, with session revocation. Administrators cannot reset administrator passwords through this action and cannot write marks.
- Removed visible demo-version branding. Kept Gemini privacy disclosure and unofficial-report labeling.

## Verification
- Backend: 58 tests passed, zero failed, including the 36 original regressions.
- Frontend: 33 tests passed, zero failed, including the six original regressions.
- Angular production build passed; initial bundle approximately 585.11 kB raw / 110.34 kB estimated transfer.
- Local browser smoke checks passed for administrator login, department and batch creation, staff batch filtering, selected-student marks save and configured-slot attendance save. Both staff bulk writes returned HTTP 200.
- An isolated restore of the pre-upgrade database snapshot verified migration preservation and repeatability. An isolated reset rehearsal preserved the administrator username and password hash.
- Independent review identified individual-write concurrency races; fixed using course-first row locking and transaction-scoped authorization/validation/persistence. Slot configuration is held stable through attendance writes. Concurrency regression coverage verifies transaction/locking discipline; independent real PostgreSQL session-blocking tests were not performed.
- The existing frontend dependency audit reports 16 moderate findings. No potentially breaking dependency upgrade was bundled.

## Operations
Startup migrations are non-destructive and do not reset passwords. The separately authorized clearing of previous non-admin accounts and academic/configuration data is a one-time operator procedure, guarded by a fresh private recovery backup and administrator credential comparison. It is not an API endpoint, startup task or seeding step.

Backups, database credentials, API keys, generated local test credentials and local test data are excluded from this change. Use the existing Render service and database; this upgrade adds no paid resource. Read UPGRADE-GUIDE.md for the administrator setup order.
