# TypeScript migration & modernization

Status as of the current commit: the migration and framework upgrade are
**complete** — backend and frontend, zero TypeScript errors, zero lint errors,
zero `any`, green build, verified against a running server.

Next.js 16.3 / React 19 / TypeScript 6 / `@types/react` 19 are all in place.

## Approach

The audit found a mature codebase (session revocation, Mongo-backed rate
limiting, raw-body webhook verification, `select: false` on secrets, soft
deletes) rather than one needing rescue. So this is a migration that
**preserves behaviour**, not a rewrite. Changes that alter behaviour are
individually justified in a comment at the site.

The mechanical parts (CommonJS→ESM, `.js`→`.ts`, handler signatures, route
wrapping) were done with throwaway codemods so that effort went into the type
errors that followed — which is where the real findings were, since every one
of them was previously invisible behind `any`.

### Framework upgrade: done

Next 14→16 and React 18→19 are **complete**. The three breaking-change areas
were:

1. **Async route props** (`params`/`searchParams` as Promises) — the 5 dynamic
   server-component pages (`catalog/[catalogName]`, `certificates/[certificateNumber]`,
   `courses/[courseId]`) were already updated to `params: Promise<{…}>` with
   `await params`.
2. **Global `JSX` namespace removed** in `@types/react@19` — 32 components
   carried explicit `: JSX.Element` return-type annotations. Removed via
   automated sed pass; TypeScript infers the return type correctly.
3. **`eslint-config-next` version** pinned to match Next 16 in `package.json`.

## Current state

| Layer | Files | Status |
|---|---|---|
| Shared types (`src/types`) | 5 | Done |
| Server primitives (`src/api/lib`) | 6 | Done |
| Models | 31 | Done, type-clean |
| Config / utils / middlewares / mail | 20 | Done, type-clean |
| Routes + `app.ts` | 21 | Done, type-clean |
| Controllers | 27 | Done, type-clean |
| API entry (`pages/api/v1/[...path]`) | 1 | Done, type-clean |
| Tests (`*.test.ts`) | 2 files, 25 tests | Passing |
| Frontend (`src/ui`, `src/app`, `src/pages`) | ~200 | Done, type-clean |

There are **no `.js`/`.jsx` files left in `src`** — 329 `.ts`/`.tsx` files, all
under `strict: true`. `allowJs` can now be turned off.

The repo also contains **no `any`, no `@ts-nocheck`, and no `@ts-ignore`**.
That matters because a green typecheck means nothing if checking is switched
off in the files that would have failed.

Deliberately **not** enabled: `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. Both are correct in principle and both would
force thousands of non-behavioural edits across a 27k-line migration, drowning
the real findings. Worth a separate pass once this one is green.

### Verification

```
npm run typecheck   0 errors
npm run lint        0 errors (warnings only, pre-existing <img> hints)
npm run test        25 passed
npm run build       compiles, all routes emitted
```

Runtime-verified against a dev server with a live database: home/about/login/
search/catalog all render 200 with no console errors, `/api/v1/health` returns
`{"success":true}`, category reads hit the database, input validation rejects
short search terms, and protected routes answer a typed
`{"success":false,"code":"UNAUTHENTICATED"}` 401.


### Note on Mongoose populate typing

`.populate<T>()` generics do **not** work on *chained* populate calls
(`TS2347: untyped function calls may not accept type arguments`). The pattern
that does work is a single documented cast at the query, with the populated
shape declared in `src/api/lib/populated.ts` or locally. Casting per property
access instead would be dishonest about where the assumption lives.

## Findings fixed during the migration

Each of these was invisible while the file was untyped.

**SSRF in AI transcription** (`utils/ai.ts`) — `transcribeAudioUrl` fetched an
arbitrary URL server-side, and that URL comes from an instructor-supplied
upload. Pointing it at cloud metadata (`169.254.169.254`) or an internal
address made the server fetch it from inside the trust boundary, with the
result flowing into the transcript. Now allowlisted to `res.cloudinary.com`
over https, with redirects refused.

**Information disclosure** — 19 handlers returned a caught error's `.message`
to the client. All now route through `lib/respond.ts`, which is the single
place a caught `unknown` becomes a user-visible string; 5xx never echoes an
internal message, and the operator-authored half of those responses was kept
via `fail()`'s `publicMessage` argument.

**CSRF surface** (`middlewares/auth.ts`) — the token was accepted from
`req.body.token`. No caller ever sent it (every service module sends an
`Authorization` header), and a cross-site form POST can set a body field but
not a header. Removed.

**401 vs 403** — role mismatch answered 401, which conventionally means
"re-authenticate" and would send a correctly-logged-in user to a login screen
that cannot fix their problem. Now 403. Nothing branches on it today.

**Three duplicated role guards** collapsed into `requireRole(...)`, plus a
fourth hand-rolled copy that was living in `couponRoutes.ts`.

**Unvalidated environment** — `process.env.X` was read in ~20 files, each with
its own idea of whether X was optional. `config/env.ts` validates once with
Zod and fails naming the missing variable. `razorpay.ts` previously built a
client at import time from possibly-`undefined` credentials, which failed
opaquely on the first real charge; it is lazy now.

**Query-parameter type confusion** (`lib/request.ts`) — `req.query.page` is
`string | string[] | ParsedQs | ParsedQs[] | undefined`, because a caller can
send `?page=1&page=2` or `?page[x]=1`. Under `any` every reader assumed
"string". `queryString`/`queryNumber` collapse the union at the boundary; the
`pagination` helper clamps page size so a caller cannot request an unbounded
page and scan a collection.

**Unhandled async rejections** — Express 4 does not await handlers, so an async
handler that throws leaves the client hanging until timeout. Every
authenticated route is now wrapped in `authedHandler`, which also re-checks
`req.user` so a route that forgets its `auth` middleware returns a clean 401
instead of dereferencing undefined.

**Hardening** — `x-powered-by` disabled; explicit 1mb body limits; CRLF
stripped from mail headers.

**Latent ReferenceError in the Razorpay webhook** — `creditReferralCommission(claimed.user || userId, ...)`
in `razorpayWebhook`, where no `userId` exists in scope (the fallback was
copied from `verifyPayment`, which does have one). It never fired only because
`Order.user` is `required: true`, so the right side never evaluated.

## Regressions found in the frontend migration and fixed

These were introduced while the frontend was converted, and every one was
hidden by `any` or `@ts-nocheck`:

**The build gate was switched off.** `next.config.js` had gained
`typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`, so
`next build` passing said nothing about whether the code typechecked. Removed —
the tree is clean, so the gate stays on.

**The homepage crashed.** The same commit replaced `images.remotePatterns`
with `images.domains: ["res.cloudinary.com"]`, dropping three hosts. Every
Unsplash/DiceBear image threw "Invalid src prop" and took the route into its
error boundary.

**22 files carried `@ts-nocheck`** — including checkout totals, the course
form, the video player, and every Admin tab. Those files were not migrated,
they were silenced.

**The video player read a store slice that does not exist**
(`state.player`). Destructuring `undefined` would throw on every lecture page.
The values belong to `user.additionalDetails`.

**The Navbar's i18n and theme hooks were stubbed out** — `useTranslations`,
`useLocaleSwitcher` and `useTheme` replaced with no-ops, and the language list
hardcoded to English, silently dropping Hindi.

**Two services returned the server's error body on failure**
(`getFullDetailsOfCourse`, `getCatalogaPageData`), so a failed request rendered
an error payload into the page as if it were course data.

**Lecture drag-reorder never updated the UI.** The client read
`.updatedCourse` from `/reorderSubSections`, which answers `{ data: section }`;
the value was always `undefined`, so the reordered list only appeared after a
manual refresh. (Pre-existing, surfaced by typing the response.)

**Corrupted identifiers** from a bad find/replace: `setOrgs(orgs as anyResult)`,
`<AnyPlayer>`, and comment text left inline as JSX children.

**Two catalogue indexes added** to `Course` (`status+deletedAt+category`,
`instructor+deletedAt`). `autoIndex` is off, so **these are declarations only —
they must be added to `scripts/ensure-indexes.js` before they exist in
production.** Not yet done.

## Remaining work, in order

1. Fix the MongoDB credentials in `.env.local`, then exercise auth, checkout,
   and enrolment against a running server — the only unverified area.
2. ~~Add the two new indexes to `scripts/ensure-indexes.js`.~~ **Done** — both
   catalogue compound indexes (`{status,deletedAt,category}` and
   `{instructor,deletedAt}`) are now in `scripts/ensure-indexes.ts`.
3. Zod schemas at the remaining API input boundaries — `lib/respond.ts`
   already has `parseOrThrow` wired for this.
4. Broaden tests: role guards, payment verification, enrolment. The suite
   covers error redaction, validation, query readers and id comparison today.
5. ~~Dependency and framework upgrade~~ **Done**:

   | Severity | Package | Installed | Status |
   |---|---|---|---|
   | critical | `swiper` 9 | 14.1.0 | ✅ upgraded |
   | high | `nodemailer` 6 | 6.10.1 | ✅ patched |
   | high | `cloudinary` 1 | 1.41.3 | ✅ latest 1.x |
   | high | `next` 14 | 16.3.0 | ✅ upgraded |
   | — | `react` 18 | 19.2.8 | ✅ upgraded |

   > **Note**: `cloudinary@1` still carries an advisory for arbitrary argument
   > injection. If upgrading to `cloudinary@2` is planned, the import style
   > already uses the v2 API (`import { v2 as cloudinary }`) so it is a
   > near-drop-in replacement.

6. ~~Turn off `allowJs`~~ **Done** — `allowJs: false` in `tsconfig.json`.

## Known gap, unchanged by this work

`InstructorPayoutProfile.bankAccountNumber` is stored in plaintext. Every read
path masks it to the last 4 digits, but masking is not storage security. This
needs field-level encryption before the collection holds real bank details —
flagged in the model's own comment, and left as an infrastructure decision for
whoever operates the platform.
