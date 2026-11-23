# FaunaWatch Admin — AI Agent Instructions

## Project Overview

FaunaWatch Admin is the web-based administration dashboard for FaunaWatch,
an AI-assisted wildlife reporting and monitoring platform.

The FaunaWatch mobile app (a separate Flutter repository, `faunawatch`) lets
users submit wildlife sightings and incidents with photos and location data.
AI features in the app produce species identification, severity assessment,
invasive-species detection, validation, summaries, and safety
recommendations for each report.

This repository contains the **admin website only**. Administrators use it to:

- **Log in** securely as an authorized admin.
- **Manage users** (view, search, filter, change status, remove). Admin
  rights are not managed here; they live in `admin_users` (dashboard only).
- **Review posts** submitted through the app (approve, reject, flag), using
  the AI-generated fields stored with each report as decision support.
- **See posts on a map** (every post as a pin, filtered by review status,
  with a summary card that links to the post's review page).
- **View analytics** (report volume, species and severity breakdowns, user
  activity, moderation outcomes).

The admin website shares the same Supabase backend as the mobile app. It does
not own the data model; the app and backend define it.

## Tech Stack

- React 19 + TypeScript (strict mode), built with Vite
- Routing: React Router
- Server state: TanStack Query (cache, loading and error state for Supabase calls)
- Local UI state: React state and hooks (no global store unless approved)
- Backend: Supabase (shared with the mobile app)
- Styling: Tailwind CSS. Design tokens (the palette) are defined in the
  Tailwind theme config, sourced from src/core/theme/. Do not use inline
  styles or CSS Modules. One approved exception: the small `<style>` block
  in `index.html` that draws the pre-React splash screen. Utilities that
  Tailwind can't express (e.g. repeating image patterns) go in
  `src/core/theme/` as `@utility` rules.
- Font: Plus Jakarta Sans, self-hosted in `src/assets/shared/fonts/`
  (SIL OFL; keep `OFL.txt` alongside the font files).
- Charts: Recharts (analytics only). The Analytics screen is lazy-loaded
  (`React.lazy` in `src/app/App.tsx`), so Recharts ships in its own chunk;
  don't import it, or the Analytics screen, from other features. It is
  wrapped in `ScreenErrorBoundary`, so a chunk that fails to download
  (network drop, or an old tab after a deploy) shows a Reload button
  instead of a blank app.
  `vite.config.ts` also splits React, Supabase and TanStack Query into
  vendor chunks.
- Maps: mapbox-gl (Standard style, like the mobile app), for three maps: the
  live map on a post's Location card (and its full-screen view), the
  Map screen (`/map`, `src/features/posts-map/`) with a pin for every post,
  and the Sighting Hotspots card on Analytics → Hotspots & Invasives.
  Each is lazy-loaded (from `PostLocationCard`, `PostsMapScreen` and
  `HotspotsTab`), so mapbox-gl ships in its own chunk; import it only from
  `PostLocationMap.tsx`, `PostsMap.tsx` and `HotspotsMap.tsx`, which also
  import Mapbox's own stylesheet (the one allowed library CSS import). Shared map settings (3D tilt, style URL,
  `MapViewMode`) live in `src/core/services/mapboxConfig.ts`. The token is `VITE_MAPBOX_PUBLIC_TOKEN`: a public
  `pk.` token for the admin site only, limited to the admin's URLs in the
  Mapbox dashboard (`src/core/services/mapboxConfig.ts` refuses anything
  else). Without it, or if the map fails, the card shows "Map unavailable".
  The map shows the exact spot (admins only), not the app's ~1 km blur.
  It mirrors the app's map: day lighting, the app's blue photo pin (first
  photo, logo fallback; `--color-map-pin`, `AppAssets.shared.pinLogo`), and
  in full screen a 3D/2D switch (3D = 55° tilt plus 3D buildings, the
  default). The card stays flat 2D. Keep these in step with the app's
  `mapbox_map_service.dart` and `map_pin_image.dart`.
  Both maps draw that pin with `createMapPin` (`src/core/components/mapPin.ts`).
  The Map screen shows exact spots too. Its pins are the same photo pin with
  the frame and pointer coloured by review status instead of blue (Pending
  gold, Changes requested amber, Approved teal, Declined red; "Changes
  requested" only while that feature flag is on). Every pin's photo is
  signed in one request (`fetchPostCoverUrls`) and loads lazily, and its
  filters, 3D/2D view and open summary card live in the URL
  (`?hide=…&view=2d&post=…`), so a post's "Back to Map" restores them.
  The Hotspots map is flat 2D only, inside the card: drag, zoom buttons and
  Ctrl/⌘ + scroll (Mapbox's `cooperativeGestures`, so plain scrolling still
  scrolls the page), plus "Show all". It draws one density circle per
  `admin_sector_stats()` grid cell (~11 km cells, fewer than 3 reports left
  out), at the exact average spot of the cell's reports (`avg_lat`/`avg_lng`)
  or, with a category picked, that category's spot (`category_spots`). The
  database gives a category with fewer than 3 reports in the cell the cell's
  average, so never draw a single sighting's own spot or work around that
  rule. If the database doesn't return averages yet, circles fall back to
  the cell centre. The averages are not rounded: the pilot accepted
  (2026-11-22) that comparing two date ranges can reveal one sighting's
  spot. Circles are named by the cell centre. A circle's bubble (area,
  count, density) shows on hover, keyboard focus or click.
  `getMapBounds` (`src/core/utils/mapBounds.ts`) frames both the Map
  screen's pins and the hotspots. Every clickable marker (Map screen pins,
  hotspot circles) is made with `createMapMarkerButton`
  (`src/core/components/mapMarkerButton.ts`): it sets `role="button"` and
  a label before Mapbox sees the element. Without them Mapbox gives the
  marker `role="img"` and the label "Map marker", so screen readers read it
  as a picture, not a button.
- Testing: Vitest + React Testing Library
- Lint/format: ESLint + Prettier
- Node.js LTS, npm

## Essential Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run format
npm run build
```

Do not consider a task complete if `npm run lint`, `npm run typecheck`,
or `npm run build` reports errors.

New or changed business logic, ViewModel behavior, service behavior, or other
testable logic must have corresponding tests. Purely visual or
documentation-only changes do not require tests unless existing behavior is
affected.

Before considering a change complete, run `npm run format`.

## Architecture — Non-Negotiable

Strict MVVM + separation of concerns, mirroring the mobile app:

**Model → Service → ViewModel → View**

1. **Models** (`models/`): Pure TypeScript types, enums, mappers, and domain
   logic. No React imports, no API/DB calls, no side effects.
2. **Services** (`services/`): Encapsulate external integrations only —
   Supabase queries, Supabase Auth, Edge Function calls. Services return Models
   (map raw rows to Models here). Services must not contain React code, UI
   state, or presentation logic.
3. **ViewModels** (`viewmodels/`): Custom hooks named `use<Name>ViewModel`.
   They own presentation state and presentation logic (filters, sorting,
   pagination, selection, form state, confirm flows, derived values). They call
   Services (typically through TanStack Query) and expose a clean interface to
   Views. No JSX in ViewModels.
4. **Views** (`views/`): React components. Presentation and user interaction
   only. Views call ViewModel hooks. Views never import or call a Service or
   the Supabase client, and never contain business logic.
   - **Screens / Pages**: `src/features/<feature>/views/screens/`
   - **Feature components**: `src/features/<feature>/views/components/`
   - **Shared components**: `src/core/components/`
   - Signed-in screens render inside `AdminLayout` (sidebar + header) via a
     layout route in `src/app/App.tsx`. Add new admin routes there and their
     nav item in `AdminSidebar`.

**Repository is optional.** Add a repository sub-layer only if a feature
genuinely needs one (e.g. cache plus sync). Do not add one by default.

### Directory Structure

```text
faunawatch-admin/
├── public/
├── src/
│   ├── app/                   # App bootstrap: router, providers, route guards
│   ├── core/
│   │   ├── constants/         # AppRoutes, AppStrings, AppAssets
│   │   ├── services/          # Global services (Supabase client, auth session)
│   │   ├── theme/             # Design tokens (colors, typography, spacing)
│   │   ├── components/        # App-wide reusable UI (Button, DataTable, Modal)
│   │   ├── hooks/             # Generic, non-feature hooks (e.g. useDebounce)
│   │   └── utils/             # Pure helpers (formatters, date utils)
│   ├── features/
│   │   ├── auth/              # Login, session, admin route guard
│   │   ├── users/             # User Management
│   │   ├── post-review/       # Post Approvals / Post Review
│   │   ├── posts-map/         # Map of every post (reuses post-review data)
│   │   └── analytics/         # Analytics dashboard
│   │       ├── models/
│   │       ├── services/
│   │       ├── viewmodels/
│   │       └── views/
│   │           ├── screens/
│   │           └── components/
│   ├── assets/                # Images, icons, logos
│   └── main.tsx
├── AGENTS.md
├── LICENSE
├── README.md
└── package.json
```

Do not scaffold every layer folder for every feature up front. Create folders
as a feature actually needs them. Keep feature code inside its own feature
directory. Do not create large generic folders with unrelated code.

### Asset Guidelines

- Place static media in `src/assets/` (or `public/` when it must be served as-is).
- Group assets by screen: one subfolder per screen, named after it
  (e.g. `src/assets/login/`). Assets used on more than one screen (such as
  the FaunaWatch logo) go in `src/assets/shared/`.
- Never hardcode raw asset path strings in Views. Define typed constants in
  `src/core/constants/appAssets.ts`.
- **WebP reminder:** Raster and vector images exported from Figma
  (`.svg`, `.png`, `.jpg`, `.jpeg`) may be added as temporary placeholders,
  but must be converted to `.webp` before the screen is considered done.
  When adding or touching any of these files, remind the developer to
  convert them, and update the matching `appAssets.ts` import when the
  `.webp` version replaces the original.
  Exception: `public/og-image.png` (the 1200 × 630 link preview image) stays
  PNG, because some chat apps don't show WebP previews.
  Exception: `public/email/faunawatch-logo.png` (the yellow fox and
  "FaunaWatch" on a see-through background, cut from `og-image.png`) stays
  PNG, because many email apps don't show WebP. The FaunaWatch emails (Supabase
  Auth templates and the Edge Function emails in the `faunawatch` repo) load it
  from `https://faunawatch-admin.vercel.app/email/faunawatch-logo.png`, so
  don't move, rename or remove it; if the domain changes, update those emails.
- **Preset avatars:** `src/assets/shared/avatars/` holds copies of the
  mobile app's preset avatars (`profiles.avatar_path` = `preset:<name>`).
  Keep the names in `src/core/utils/avatars.ts` in sync with the mobile
  app. Uploaded avatars and report photos live in private buckets and are
  shown through signed URLs (`src/core/services/storageService.ts`).
- **Preloading:** Every image registered in `AppAssets` is preloaded behind
  the loading screen (`useAssetPreloader` + `src/app/preloadManifest.ts`)
  before the app renders. Register new images there so they preload.
- User-facing copy lives in `src/core/constants/appStrings.ts`.

### Working Style

- Before implementing a feature, briefly state which layer(s) it touches and why.
- For a new feature, show the chain: Model → Service → ViewModel → View.
- Flag explicitly, before writing code, if a request would require breaking
  the layering (e.g. calling Supabase directly from a component).

## Supabase and Security (Public Repository)

**This repository is public.** Anyone can read the code and history.

- NEVER commit secrets: no `.env` files, service-role keys, passwords, tokens,
  or real user data. Commit only `.env.example` with placeholder values.
- The browser may only ever use the Supabase **anon/publishable** key, loaded
  from environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- NEVER use the Supabase **service-role** key anywhere in this codebase.
  Privileged admin operations must be enforced server-side through Row Level
  Security policies that check the caller's admin role, or through Supabase
  Edge Functions. Hiding a button in the UI is not authorization.
- Admin access is role-based. Route guards are a UX convenience only; the
  backend must enforce the role.
- Do not log tokens, session data, or personal user data (emails, locations)
  to the console, analytics, or error messages.
- Do not store tokens in `localStorage` manually; rely on the Supabase client's
  session handling.
- Treat user-submitted content (post text, names, image URLs) as untrusted.
  Never render it with `dangerouslySetInnerHTML`.
- The admin site does not use or collect users' AI provider API keys. Those
  belong to the mobile app and its users. The admin site only displays
  AI-derived fields already stored with reports. Do not add direct AI provider
  calls without explicit team approval.
- Tests must mock Supabase. Never allow `npm run test` or CI to hit the live
  backend.

### Auth configuration

- Sign-in methods: email/password and Google (`signInWithOAuth`). Only
  accounts for which `is_admin()` returns true get in; anything else is
  signed out again. Never create or grant admin rights from this site.
- The Supabase client uses the PKCE flow (`flowType: "pkce"` in
  `supabaseClient.ts`). Google sign-in redirects back to `/login`, where
  supabase-js exchanges the code for a session.
- Google's OAuth client secret lives ONLY in the Supabase dashboard
  (Authentication → Sign In / Providers → Google). Never put it in this
  repo, `.env`, the browser or chat.
- Supabase's Redirect URLs allow list must include each site's login URL
  with a wildcard, e.g. `http://localhost:5173/login**`, because supabase-js
  appends `?sb_flow_id=…` to `redirectTo`.
- Password reset: `/forgot-password` requests the email and reads the same
  either way, so it doesn't reveal which emails have accounts. Hosted email is
  the built-in service for now: project team members only, 2 emails an hour,
  and free-plan projects like this one can't edit its templates (since
  2026-06-03). So hosted sends Supabase's default email, whose link goes through
  Supabase and returns with a one-time code. It only works in the browser that
  asked, and a mail scanner can use it up. `/reset-password` exchanges that code
  itself (`detectSessionInUrl` is off on that page) so the session stays in the
  tab. With custom SMTP, the template in the `faunawatch` repo
  (`supabase/templates/recovery.html`) can be used instead: it works in any
  browser and is only used when the admin presses Save. The page handles both.
  That route sits outside the route guards. The Redirect URLs allow list
  must include it with a wildcard, e.g.
  `http://localhost:5173/reset-password**`.
- A session without "Remember me" lives in one tab, but supabase-js tells every
  tab about it. `onSessionChange` ignores events about a session this tab doesn't
  hold, so another tab can't fail the admin check and sign the real one out.
- The login-form cooldown (`loginCooldown.ts`, kept in localStorage) is
  usability only. Brute-force protection is server-side: Supabase Auth rate
  limits (Authentication → Rate Limits).

## Feature flags

`src/core/constants/featureFlags.ts` holds switches for features that ship
dark. `isRequestChangesEnabled()` is false in production until its constant
is changed. In development only, `VITE_ENABLE_REQUEST_CHANGES=true` in a
local env file (never committed) turns it on without editing code. Tests mock
the module instead of reading the variable.

## Hosting (Vercel)

The site is hosted on Vercel's free Hobby plan (non-commercial use only),
deployed from this public repo. Every merge to `main` goes live; other
branches get preview URLs. `vercel.json` holds the settings:

- Any address that isn't a real file is served `index.html`, so React Router
  can open it (refreshing `/map` would otherwise be a 404). `/assets/` is left
  out, so a missing chunk from an old deploy is a real 404 and
  `ScreenErrorBoundary` shows its Reload button.
- Files in `/assets/` have a content hash in their name, so browsers keep
  them for a year; a new build gets new names.
- Basic security headers. `X-Frame-Options: DENY` stops other sites from
  framing the admin pages.

`index.html` carries the link preview tags (Open Graph + `twitter:card`)
pointing at `public/og-image.png` by its full address, plus
`robots: noindex` so search engines don't list the admin site. If the domain
changes, update `og:url` and `og:image`. Chat apps cache previews; refresh
Messenger/Facebook with the Sharing Debugger ("Scrape Again").

Setup outside the repo, needed for each new site address:

- Vercel → Project → Settings → Environment Variables: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_PUBLIC_TOKEN`. Vite reads them at
  build time, so redeploy after changing one.
- Supabase → Authentication → URL Configuration → Redirect URLs: add
  `https://<site>/login**` and `https://<site>/reset-password**`.
- Mapbox → the admin token's URL restrictions: add the site's address.

## UI and Design Guidelines

- Follow the approved Google Stitch designs. Do not invent layouts.
- Use Tailwind theme tokens only (e.g. bg-primary, text-navy). Never use
  arbitrary hex values like bg-[#005A97] in components.
- Palette: `#FFB800`, `#FECE01` (accents), `#102A43` (dark navy),
  `#005A97` (primary blue), `#087E8B` (teal), `#F7FAFC` (light background).
- Style is clean and modern. Do **not** use a neo-brutalist style (no heavy
  borders, hard offset shadows, or stark blocky styling).
- Tables (especially User Management) must not contain redundant columns. Each
  column should carry distinct information.
- Every data view needs loading, empty, and error states.
- Meet basic accessibility: semantic HTML, labels on inputs, keyboard
  navigation, sufficient contrast.

## Coding Standards

- TypeScript strict mode. No `any` (use `unknown` and narrow). No non-null
  assertions without a justification comment.
- Function components and hooks only. Prefer composition over inheritance.
  One exception: `src/core/components/ScreenErrorBoundary.tsx` is a class
  component because React has no hook for error boundaries.
- Name files consistently: components `PascalCase.tsx`, hooks and utilities
  `camelCase.ts`, ViewModels `use<Name>ViewModel.ts`.
- Do not introduce a new state management library, UI framework, or
  architectural pattern without confirming it fits the Tech Stack above.
- Before adding a dependency, check whether React, the browser, or an existing
  package already covers it. Avoid dependencies for trivial functionality.

## Agent Behavior and Guardrails

Before modifying code:

1. Inspect the relevant existing files. Do not assume a component, service, or
   feature exists without checking.
2. Follow existing conventions. Avoid duplicate implementations.
3. Keep changes scoped to the request. No unrelated refactors.

**When a decision would meaningfully affect architecture, or requirements are
unclear:** do not guess and proceed. Stop, leave a clear `TODO` comment at the
point of ambiguity explaining the open question, and do not continue
implementing past it. This applies even when running unattended.

**Database schema:** The Supabase schema is owned by the mobile app/backend.
Do not invent tables, columns, or roles. If a needed field is not documented
or visible in existing code, flag it with a `TODO` instead of guessing.

**Git:** Work on a feature branch, never push directly to `main`. Do not merge
your own PR. Do not commit secrets, build artifacts (`dist/`, `node_modules/`),
or local machine config. Before committing, review `git status` and
`git diff`. Use clear, descriptive commit messages.

## Documentation

Update this file when introducing significant architectural changes, new
dependencies, or new configuration requirements. Keep it consistent with the
actual implementation. Do not let it drift into aspiration.

## Important Project Rule

Do not invent project requirements. If implementation details are unclear,
inspect the repository and existing documentation first, then follow the
clarification protocol above rather than guessing.
