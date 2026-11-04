# Student University

An independent university-portal demonstration inspired by the supplied layout references. This is not SR University's website, is not connected to sraap.in, and makes no ranking or accreditation claims. Sample names and records are fictional. Do not commit your reference screenshots: they contain personal information.

## What you can do

Choose Admin, Staff, Student or Parent before signing in. Selecting Admin does not grant permission: the server verifies the account role.

| Role | Allowed actions |
|---|---|
| Admin | Create/edit/deactivate staff, students and parents; assign faculty to courses; enroll students; view academic records |
| Staff | Enter/update marks and attendance only for assigned courses; view feedback addressed to them |
| Student | View own marks, component breakdown, attendance and timetable; submit course-specific faculty feedback; use own performance assistant |
| Parent | View the linked child's academic records and timetable; no academic edits, feedback submission or assistant access |

All users can change their own password. A password change signs the current session out. Profile details and academic records are otherwise read-only for students and parents. Feedback is identified, not anonymous, and resubmission updates the student's feedback for that course. Deactivation preserves academic history and blocks the account's existing sessions on their next API request.

## 1. Run in VS Code on Windows

1. Install Node.js 24 LTS from https://nodejs.org/ and Visual Studio Code from https://code.visualstudio.com/. Restart the VS Code terminal after installing Node. You do not need Angular CLI globally.
2. Extract the ZIP to a normal project folder, for example `C:\Projects\student-university`. Open **that folder**, containing this README and package.json, in VS Code.
3. Open **Terminal → New Terminal**. Confirm `node --version` and `npm --version` work.
4. Install dependencies:

   ```powershell
   npm install
   npm --prefix client install
   ```

   If PowerShell blocks npm.ps1, use `npm.cmd` in place of `npm`; there is no need to disable your machine's execution policy.
5. Copy the environment template:

   ```powershell
   Copy-Item .env.example .env
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Paste the generated value into `.env` as SESSION_SECRET. Leave DATABASE_URL commented out for local use. Do not include the key or `.env` in GitHub.
6. Create fictional demo data once:

   ```powershell
   npm run seed
   ```

   The script generates random passwords and writes them to **demo-credentials.txt** in the root. Open that file locally. Usernames: `admin.demo`, `staff.demo`, `student.demo`, `parent.demo`, plus `staff.other` and `student.other` for access-control checks. There is no universal hard-coded demo password. The file is excluded from Git and the downloadable archive.
7. Build Angular and start the server:

   ```powershell
   npm run build
   npm start
   ```

8. Visit **http://localhost:3000**. Choose a role and enter the matching local credentials. Use this URL, not VS Code Live Server or a file:// page: this app requires its backend.
9. Stop the server with Ctrl+C. Records persist in the ignored `.data/postgres` folder. Run the seed only once; it refuses to overwrite existing data.

For everyday frontend development, run `npm run dev` in one terminal and `npm --prefix client start` in another. Visit http://localhost:4200. The Angular development proxy sends /api requests to port 3000. Use either both development processes or the built app, not an Angular-only static host.

### Database options

Local mode uses **PGlite, an embedded PostgreSQL runtime**, not an in-memory JavaScript mock. It needs no Docker installation. It is intended here for a single-process local demo, not production concurrency. Shut down the running server before seeding the same local data directory.

For regular PostgreSQL, create a database and set `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE` in `.env`. Encode special characters in URL credentials. The application creates its initial schema on startup. For public TLS database connections set `DATABASE_SSL=true` when your provider's certificate is trusted. Never disable certificate verification just to suppress an error. Production requires DATABASE_URL and uses a PostgreSQL-backed session store.

These CREATE TABLE statements bootstrap a new database; they are not a versioned migration system. Add reviewed migrations before evolving a real production schema. Existing local data is not automatically copied to a hosted database.

## 2. Turn on optional AI assistance

Without configuration, students receive **local rule-based analysis**, not generative AI. It calculates attendance and assessed marks, flags areas to review, and treats unassessed values as null rather than zero. The 75% attendance target is a demo assumption, not an official university rule.

To use the provided OpenAI adapter:

1. Create an API account/project at https://platform.openai.com/ and enable API billing if required. API usage is billed separately from consumer chat subscriptions. Choose a spending limit you can manage.
2. Create an API key through the provider dashboard. Never paste it into chat, Angular code, GitHub, screenshots or a public web page.
3. Edit your server's private `.env`:

   ```dotenv
   AI_ENABLED=true
   OPENAI_API_KEY=your_private_api_key
   OPENAI_MODEL=gpt-4.1-mini
   ```

   Use a chat-completions-compatible model available to your API project. The default is configurable; availability and price can change.
4. Restart the Node server. On a host, set these as service environment variables instead of committing a `.env` file.
5. Sign in as a student. Open the assistant and check the consent box only if you agree to transmit that student's course names, assessment scores/maxima and attendance statistics to OpenAI.
6. Ask for a study plan. A successful response is labelled AI rather than local. If the provider returns an error, check the server key, model permissions, quota and billing. The app does not silently label a failed external call as AI.

The browser calls **your server**; only the server calls OpenAI. The assistant has no tools for updating records. The payload intentionally excludes names, account IDs and feedback. This reduces disclosure but is not a guarantee of anonymity: academic data can still be sensitive. Use fictional data for a class demo; obtain institutional approval and review privacy/retention terms before sending real student records.

Reference: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create

## 3. Publish the source to GitHub

A public repository exposes source files to everyone. Only publish fictional seed records and source, never `.env`, `.data`, demo-credentials.txt or reference screenshots.

If the repository has not already been created:

1. Sign in at https://github.com/new.
2. Choose your personal account, enter `student-university`, select **Public**, and create an empty repository. Do not add another README if using the commands below.
3. Install Git if needed. In the project terminal:

   ```powershell
   git init
   git add .
   git status
   git diff --cached --stat
   git commit -m "Build Student University academic portal"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/student-university.git
   git push -u origin main
   ```

4. Review the staged list before committing. `.env`, credentials, uploads, `.data` and node_modules must not appear. Complete Git's browser sign-in if prompted. Do not put access tokens into the remote URL.
5. If Git asks for a commit identity, use your actual name and an email you choose (GitHub offers a private noreply address). No identity is invented for you by this project.
6. The included GitHub Actions workflow runs backend tests and the Angular production build on pushes and pull requests.

GitHub Pages alone cannot run this Express/PostgreSQL app. Use a full-stack Node host for the working site.

## 4. Deploy a real HTTPS site using Render

These are deployment instructions, not a claim that a site or domain has already been deployed. Hosting, database, domain and AI billing may cost money; check current provider terms before creating paid resources.

1. Push the project to your GitHub repository.
2. Create a Render account at https://dashboard.render.com/. Create a PostgreSQL database and a **Node Web Service** connected to your GitHub repository. Keep the service and database in the same region/account.
3. Use the database's **Internal Database URL** as DATABASE_URL for that service. Keep it secret. For Render's private internal connection, leave DATABASE_SSL unset unless you configure TLS according to its provider guide; do not set DATABASE_SSL=true blindly for a self-signed internal certificate. External database endpoints need the provider's documented TLS settings.
4. Set the service commands:

   ```text
   Build: npm ci --include=dev && npm --prefix client ci --include=dev && npm run build
   Start: npm start
   ```

   Root directory is the repository root. The server reads PORT automatically. Angular is built into client/dist/client/browser and served by Express, keeping API and UI on one origin.
5. Add service environment variables:

   ```dotenv
   NODE_ENV=production
   SESSION_SECRET=a_new_unique_random_secret_at_least_32_characters
   DATABASE_URL=your_internal_postgres_url
   TRUST_PROXY=1
   AI_ENABLED=false
   ```

   TRUST_PROXY=1 assumes one trusted hosting reverse proxy. Change it for other network topologies. Production cookies require HTTPS. Do not enable production mode on local HTTP and expect login cookies to work.
6. Deploy. The initial database is empty by design. Do not run the demo seed in production; the script refuses.
7. Create the first administrator once. Set a temporary host environment secret BOOTSTRAP_ADMIN_PASSWORD (12–128 characters) and optionally BOOTSTRAP_ADMIN_USERNAME. From a trusted provider shell/one-off job with the same production database environment, run:

   ```text
   npm run bootstrap:admin
   ```

   Remove the temporary password environment variable after success. Log in over HTTPS and use Admin to create faculty/students/parents, courses and enrollments. The bootstrap refuses if an admin already exists. Provider shell/job availability depends on plan; choose a deployment plan that supports a secure one-off setup command, or run the script from a trusted computer with the database provider's external TLS URL and production environment.
8. Open the service's provided `https://...onrender.com` URL. Check `/api/health`, sign in, create sample entries and confirm refresh/restart persistence. Turn on AI only after the basic site works.
9. Configure database backups and recovery, monitor errors, review logs, and disable public database access if it is unnecessary. Do not treat a live URL as proof of production security.

Provider guides checked for these steps:
- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/postgresql-creating-connecting
- https://render.com/docs/custom-domains

## 5. Add your own domain name

1. Buy a domain you are entitled to use from a registrar, or use one you already own. The purchase/renewal is separate from hosting. Do not use the real university's brand/domain or imply affiliation.
2. In Render, open the web service → **Settings → Custom Domains → Add Custom Domain**. Enter your domain, such as `portal.yourdomain.com`.
3. Open DNS management where the domain's authoritative DNS is hosted (which may differ from the registrar).
4. Add exactly the DNS records/targets shown by Render for your chosen hostname. A subdomain usually uses CNAME; an apex domain may use the provider's A/ALIAS/ANAME instructions. Do not copy a random IP from a tutorial. Remove conflicting records only for that hostname, not unrelated email/MX records. Review conflicting AAAA records per Render's guide.
5. Return to Render and select **Verify**. DNS changes need time to propagate. Render provisions and renews the TLS certificate and redirects HTTP to HTTPS after successful setup.
6. Test the custom HTTPS URL, login, logout, role restrictions, assistant consent and a saved record. The app uses relative /api URLs, so no API key or hard-coded API domain needs to be added to Angular.

Reference: https://render.com/docs/custom-domains

## 6. Demonstrate and test

Run `npm test` for the automated API suite, `npm --prefix client test` for frontend regression checks, and `npm run build` for Angular compilation. The API tests use a temporary in-memory PGlite instance and do not alter your local demo database.

Suggested viva/demo sequence:

1. Show role selection before login. Log in as Admin and add a fictional student and faculty member.
2. Assign a course to staff and enroll the student. Show user editing/deactivation; explain that deletion means deactivation to preserve records.
3. Log in as the assigned Staff, select the student/course, enter component marks and class attendance, then refresh.
4. Log in as that Student. Show read-only records, date-filtered attendance, a component breakdown and an unofficial printable report. Submit faculty feedback.
5. Return as Staff and show feedback. Use staff.other to demonstrate that another faculty member cannot edit that course or read its feedback.
6. Log in as Parent and show only the linked child's academic records. Parents cannot submit feedback or use the student assistant.
7. Show local performance analysis. If you have configured and consented to AI, show the separate AI response. Explain missing/unassessed data and the demo attendance target.
8. In browser DevTools, verify API responses, confirm HttpOnly session cookies, and demonstrate a student write request returns 403. Do not display secrets while presenting.
9. Test at a narrow mobile viewport. In Chrome/Edge DevTools run Lighthouse against the built app and record your actual performance/accessibility results. No Lighthouse score is promised or fabricated here. Live AI, hosted PostgreSQL, DNS and TLS need their own configured-environment checks.

## Criteria mapping

| Supplied criterion | Implementation |
|---|---|
| HTML5, CSS3, JavaScript/ES6 | Angular templates, CSS and compiled TypeScript/JavaScript; Node ES modules |
| Angular framework | Real standalone Angular client, not a static mock |
| Bootstrap/Tailwind/responsive design | Bootstrap 5 plus compiled Tailwind 4 utilities and custom responsive layouts |
| Node.js and Express.js | server/app.js and server/index.js |
| PostgreSQL/MySQL/MongoDB | PostgreSQL via pg in production; PGlite embedded PostgreSQL for local demo |
| REST, Fetch/AJAX | /api endpoints and asynchronous Angular API requests |
| Auth, authorization, XSS/CSRF prevention | Password hashing, server sessions, scoped access, CSRF header, Angular escaped text and Helmet CSP |
| CRUD, validation, search/filter, calculations | Admin directory/course setup, staff entries, notices search, date filters, attendance and assessed-mark calculations |
| Testing/optimization | API regression tests, production build and CI; manual browser/Lighthouse checklist |
| Demonstration/viva | Role-by-role script above |
| React Native | Optional in the supplied criteria; not included |

## Boundaries and security notes

This is a tested educational foundation, not a certified student information system. It includes no real fee payments, Aadhaar uploads, registration approval workflows, official hall tickets/certificates, backlogs/CGPA calculation, library integration, grievance processing or official transcript issuing. The screenshots show those menu areas, but they require separate workflows and data; no fake working buttons should imply otherwise. The printable report is unofficial. The reference login CAPTCHA image is not copied as a security feature; this demo uses login rate limits. Add a properly integrated provider challenge if your deployment needs CAPTCHA.

Parameterized SQL, scrypt password hashing, session regeneration at login, HttpOnly/SameSite cookies, production Secure cookies, CSRF checks, input limits, scoped queries, rate limiting and audit records provide a baseline. This is not a penetration test. Production needs reviewed migrations, central/shared rate limiting for multiple instances, password reset/recovery, stronger password policies/MFA for administrators, session revocation across all devices, institutional permission/privacy controls, dependency maintenance and backup/restore drills. For a busy deployment, refactor attendance aggregation into SQL and paginate large directories/history. Never expose the local development server through an unreviewed public tunnel.

AI response quality is not guaranteed. Never use the assistant as the authority for exam eligibility, disciplinary action or final results.
