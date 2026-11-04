# Verification record

Checked locally on Windows, Node.js 24.15.0, 4 November 2026.

- Backend automated suite: 29 tests passed, 0 failed. Covers authentication, CSRF, role restrictions, parent/student isolation, staff course scope, component limits, attendance upsert/date validation, feedback isolation, admin CRUD/deactivation, course assignment/enrollment, and AI consent/data minimization.
- AI adapter: tested with a mocked provider response. No paid API request was made. Live provider credentials/model access/billing remain unverified.
- Angular frontend: production build succeeded; 6 frontend regression checks passed. These are lightweight code/build checks, not a complete browser end-to-end test suite.
- Browser smoke checks: role selection, student login, dashboard, results view and local assistant form exercised. Final navy/white design and stylesheet loading verified in browser. Fixed CSP-incompatible asynchronous stylesheet activation by disabling inlineCritical output, without weakening script CSP.
- Local persistent PostgreSQL: opt-in seed completed, server started, and fictional records remained available after server restart. Fixed first-run parent data-directory creation on Windows.
- Backend production-dependency audit: npm audit --omit=dev reported 0 advisories at check time. An audit does not establish that the application is free of vulnerabilities.

Not completed in this local environment: a full browser test of every form and viewport, Lighthouse measurement, penetration testing, externally hosted PostgreSQL, Render deployment, custom-domain/DNS/TLS verification, backup/restore drill, live AI response quality evaluation. Follow the README checklists before claiming production readiness.

The supplied optional React Native component and extra reference-site workflows (real payments, official memos/hall tickets, Aadhaar, grievances, library and registration approvals) are not implemented. No real university records or reference screenshots are included in the source distribution.
