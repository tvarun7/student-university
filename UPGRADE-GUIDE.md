# Student University: department and batch workflows

This update extends the existing demonstration portal. It does not claim institutional affiliation or production certification. Use fictional records, particularly with the Gemini Free tier.

## Administrator setup order

1. Open **Departments & batches**. Create a department such as CSE, then a batch such as 35 and its academic semester (for example 2-1).
2. In **Users**, create Staff, Student and Parent accounts. Assign students to the correct batch. The batch supplies their department and semester. Link each parent to their child. Use the search fields and filters rather than scrolling long lists.
3. Open **Courses** to define each subject's code, name, semester and assessment criteria. Add criteria such as Class test, Lab exam, Mid or End with their maximum marks. The labels are not predefined. A criterion's stable key identifies existing marks.
4. In **Staff assignments**, select a department, batch, subject and staff member. Course definitions are separate from teaching assignments. An assignment grants teaching access only to that batch's enrolled students.
5. In **Enrollments**, filter by department, batch and semester, search for students, select the required students and enroll them in the subject. Assigning staff does not automatically enroll students.
6. In **Attendance slots**, configure the class times. New installations start with one-hour slots from 08:30 to 17:30. Disable a slot instead of deleting historical records. Slot identifiers remain stable.
7. In **Exams**, add the Mid, End or other exam timetable entries, including course, optional target batch, date, start/end time and room.
8. Manage **Circulars** and **Events**. Event banners are temporary, dismissible and do not block work. The events list keeps current, upcoming and past events available.

## Staff workflow

Use **Batch entry** to select an authorized department, batch and course. Search the authorized roster and choose the students to update. Batch attendance supports a configured slot and date; batch marks use the course's assessment criteria. Select only the students whose records you intend to change. Individual record screens remain available for corrections.

The backend rechecks staff assignment, batch membership and enrollment for every write. Bulk requests are validated before committing: an invalid or unauthorized entry rejects the batch request rather than partially saving it. Unassessed marks are null, not zero. Administrators cannot write marks through the individual or bulk marks endpoints.

## Changing criteria and passwords

Administrators can add and edit assessment criteria. Removing a criterion with recorded marks, or reducing its maximum below a recorded score, is blocked to preserve academic history. This is separate from the explicitly authorized one-time fresh-start reset.

An administrator can reset a Staff, Student or Parent password without knowing the previous password through a separate, confirmed action. It cannot target an administrator account. Resetting a password revokes that target account's existing sessions. Installing this update does not reset any password.

## Student assistant

The assistant remains read-only and student-scoped. It can use the student's own course assessment and attendance information, overall attendance, and bounded campus circular/event/exam context. It cannot change records or reveal another student's information. The unofficial report is informational, not an official transcript.

Gemini requests run only on the server, after explicit consent. Store GEMINI_API_KEY privately in Render and select an available free-tier model with GEMINI_MODEL. Keep Google billing disabled for a free-only project. The Free tier has usage limits and Google may use prompts and responses to improve its products; use fictional records and avoid personal information in questions. AI_ENABLED=false retains local, deterministic analysis, which is not generative AI. Consent wording identifies the information sent externally.

## Deployment and data recovery

- New schema changes are versioned and idempotent. Startup never performs a full data reset and never changes administrator password hashes.
- Run backend regression tests, frontend tests and the Angular production build before merging. Rehearse the migration against a private recovery snapshot when upgrading an existing database.
- Recovery snapshots contain sensitive account hashes and academic records. Keep them outside the repository and public/synced artifacts. Do not commit backups, database connection strings, API keys or demo credential files.
- The user separately approved clearing all previous non-admin accounts and business records after a private backup. That is an operator-run, backup-verified transaction, not an application startup task or a permanent reset endpoint. Administrator IDs, usernames and password hashes must compare unchanged before commit. New default slot configuration and schema migration bookkeeping are retained.
- Clearing existing sessions during that reset requires signing in again with the unchanged administrator credentials.
- Use the existing Render Free service and Neon database. No new paid hosting resource is required by this code update.

This educational foundation still requires deployment-specific privacy review, institutional approval, security assessment, dependency maintenance and backup/recovery operations before real university use.
