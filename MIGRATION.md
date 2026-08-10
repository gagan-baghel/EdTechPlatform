# TypeScript migration & modernization

Status as of the current commit. The **backend migration is complete and
verified**; the frontend is not started. See "Current state".

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

### Staging decision: framework upgrade is separate

Next 14→16 and React 18→19 are **not** part of this pass. They change
`params`/`searchParams` to Promises across 7 dynamic routes, and four
dependencies are abandoned or React-18-pinned (`react-redux@8`, `video-react`,
`react-rating-stars-component`, `react-super-responsive-table`, `swiper@9`).
Running that concurrently with a 311-file type migration makes every failure
ambiguous. It is a required follow-up, not an optional one — see "Security".

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
| Frontend (`src/ui`, `src/app`) | ~200 | **Not started** — still `.jsx`/`.js` |

`tsconfig.json` runs `strict: true` with `allowJs` still on (so un-migrated
frontend files continue to build) and `checkJs` off (so they don't emit noise
that hides errors in migrated files). Both come off when the frontend lands.

Deliberately **not** enabled: `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. Both are correct in principle and both would
force thousands of non-behavioural edits across a 27k-line migration, drowning
the real findings. Worth a separate pass once this one is green.

### Verification

```
npm run typecheck   0 errors
npm run lint        0 errors (warnings only, all pre-existing <img> hints)
npm run test        25 passed
npm run build       compiles, all routes emitted
```

Runtime-checked against a dev server: the home page renders with no console
errors, and the API returns well-formed JSON envelopes. Authenticated flows
could **not** be exercised here — the MongoDB credentials in `.env.local` are
rejected by the server (`bad auth : authentication failed`), which predates
this work. That is the one gap in the verification story.

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

**Two catalogue indexes added** to `Course` (`status+deletedAt+category`,
`instructor+deletedAt`). `autoIndex` is off, so **these are declarations only —
they must be added to `scripts/ensure-indexes.js` before they exist in
production.** Not yet done.

## Next steps, in order

1. Fix the MongoDB credentials in `.env.local`, then exercise auth, checkout,
   and enrolment against a running server — the only unverified area.
2. Add the two new indexes to `scripts/ensure-indexes.js`.
3. Frontend migration: store/slices (typed `useAppSelector`/`useAppDispatch`)
   → services → hooks/utils → components → app-router pages.
4. Zod schemas at the remaining API input boundaries — `lib/respond.ts`
   already has `parseOrThrow` wired for this.
5. Broaden tests: role guards, payment verification, enrolment. The suite
   covers error redaction, validation, query readers and id comparison today.
6. Dependency and framework upgrade — this is security work, not cosmetics:

   | Severity | Package | Issue |
   |---|---|---|
   | critical | `swiper` 9 | Prototype pollution |
   | high | `nodemailer` 6 | SMTP command injection, CRLF header injection, SSRF |
   | high | `cloudinary` 1 | Arbitrary argument injection |
   | high | `next` 14.2.35 | 22 advisories (SSRF, cache poisoning, XSS, DoS) |
   | high | `postcss` | Path traversal via `sourceMappingURL` |

7. Turn off `allowJs` and delete this note.

## Known gap, unchanged by this work

`InstructorPayoutProfile.bankAccountNumber` is stored in plaintext. Every read
path masks it to the last 4 digits, but masking is not storage security. This
needs field-level encryption before the collection holds real bank details —
flagged in the model's own comment, and left as an infrastructure decision for
whoever operates the platform.
