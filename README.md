# QatarunaFE

The web frontend for the **QatarUna Government Services Portal**. It's a React 19 + TypeScript single-page app built with Vite and styled with Tailwind CSS v4. It talks to the QatarUna .NET API (`api/v1`).

## Stack

| Concern | Choice |
| --- | --- |
| Build | Vite 8, TypeScript 6 |
| UI | React 19, Tailwind CSS 4 (`@tailwindcss/vite`), lucide-react icons |
| Routing | React Router 8, with each page lazy-loaded as its own chunk |
| Server state | TanStack Query 5 |
| Lint | oxlint |

## Getting started

```bash
npm install
cp .env.example .env.local   # optional; the defaults match the API's launch profile
npm run dev                  # http://localhost:5173
```

The dev server proxies `/api` and `/health` to `VITE_API_PROXY_TARGET` (default `http://localhost:5137`, the API's `http` profile). The browser only ever talks to the Vite origin, so no CORS setup is needed.

Start the API first (from the backend repo):

```bash
dotnet run --project src/QatarUna.Api --launch-profile http
```

In Development the API seeds demo accounts. The sign-in page lists them and fills in the email for you. The shared password is **not** in this repo; it is the API's `Seed:DefaultPassword` user secret.

| Account | Role |
| --- | --- |
| `citizen@example.qa` / `resident@example.qa` | Citizens (native / resident) |
| `l1.water@qataruna.gov`, `l2.water@…`, `l3.water@…` | Water ministry, each approval tier |
| `l1.electricity@qataruna.gov` (and L2, L3) | Electricity ministry |
| `admin@qataruna.gov` | Platform administrator |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR and the API proxy |
| `npm run build` | Type-check (`tsc -b`) and production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | oxlint |

For a production build served from a different host than the API, set `VITE_API_BASE_URL` to the API origin and add the SPA's origin to the API's `Cors:AllowedOrigins`.

## What's in it

**Citizens**
- Dashboard with counts of open, draft, returned and completed requests, plus an alert when a ministry has asked for more information
- Service catalogue across every ministry: search, filter by ministry and category, and native-citizen-only eligibility
- Apply for a service: the request is created as a draft, documents are attached, and then it is submitted, so officers never see a case before its documents arrive
- My requests (filterable, paged) and a request page with a progress stepper, edit, submit/resubmit, cancel, and document upload/download/delete (PDF, JPEG, PNG or TIFF, up to 10 MB each, at most 20 per request)

**Ministry officers (L1 / L2 / L3)**
- Overview built from the workload endpoint (my tier, assigned to me, unassigned, overdue, per-stage counts)
- Case queue with saved views (My tier, Assigned to me, Unassigned, Overdue) and full filtering; filters live in the URL
- Case page: approval trail, applicant, documents, and the actions the caller may take: assign to me, reassign (L2+), approve / approve & forward, return for information, escalate, reject, and mark completed
- Colleagues directory and the ministry's audit trail

**Administrators**
- Overview: active ministries, user counts, access denied in the last 24 h, recent failures
- Ministries: create, edit, activate/deactivate; services per ministry: create, edit, open/close
- Users: filter across the whole portal; provision employees; change tier, transfer ministry, set account status (a reason is required to suspend or deactivate)
- Read-only oversight of every ministry's cases, and the full audit trail with expandable entries

**Everyone**: profile, change password (which signs out every device), and "sign out everywhere".

## Design notes

- **`src/api/`** is the only code that knows HTTP. `types.ts` mirrors the C# DTOs field for field. The API serialises enums as names and omits nulls, so nullable fields are typed as optional.
- **Tokens.** The refresh token lives in `localStorage`. The access token is cached per tab in `sessionStorage`, so a page reload needs no network call. That matters because every `/auth/*` endpoint shares a rate limit of 10 calls per minute, and restoring the session on each reload used to lock users out after a few refreshes.
- **Refresh is single-flight.** Only one refresh runs at a time in a tab, and the Web Locks API serialises refreshes across tabs. The API treats reuse of a rotated refresh token as theft and revokes every session, so two racing refreshes would sign the user out everywhere.
- **Errors.** Server `ProblemDetails` responses are mapped back onto form fields (400) or shown as alerts. Client validation in `lib/validation.ts` mirrors the FluentValidation rules for fast feedback only; the server remains the authority.
- **Authorization in the UI** (`auth/roles.ts`) only decides what to *show*. Every action can still receive a 403 from the API, and the UI handles that.
