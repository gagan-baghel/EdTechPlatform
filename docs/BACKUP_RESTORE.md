# Backups & Restore

> **Read this line first.** A backup that has never been restored is not a backup —
> it's an unverified assumption. This document exists to make the restore path
> real, not just the backup path. Section 3 is not optional.
>
> **Scope note on how this document was produced:** this repo's automation
> could write the runbook and the verification script below, but could not
> execute a live restore itself — this sandbox has no network path to the
> Atlas cluster (any live DB check from here fails with a Atlas IP-whitelist
> connection error). **Section 3's dry run has not actually been performed
> yet.** Whoever has real Atlas access needs to run it once — that is the
> one step in this document that is a claim, not yet a verified fact.

## 1. What backs this app up

This app is Mongoose/MongoDB (Atlas, based on the `mongodb+srv://...mongodb.net`
connection string shape in `.env.local` / `.env.example`). Two independent
paths, pick based on your Atlas tier:

### Path A — Atlas Cloud Backups (M10+ dedicated clusters)

Atlas dedicated clusters (M10 and above) support **Continuous Cloud Backup**
with point-in-time recovery. If you're on a dedicated tier:

1. Atlas dashboard → your cluster → **Backup** tab.
2. Enable backups if not already on. Continuous backup gives point-in-time
   restore to any second within the retention window, not just daily snapshots.
3. Set retention. A reasonable starting policy for a paid course platform:
   - Continuous/point-in-time: 7 days
   - Daily snapshots: 30 days
   - Weekly snapshots: 12 weeks
   (Atlas's default policy is close to this — check it matches, don't assume.)
4. **No code or app-side scheduling is needed for this path.** It runs at
   the infrastructure layer, outside this application.

### Path B — Shared tiers (M0/M2/M5) or self-managed MongoDB

Shared/free Atlas tiers **do not support Continuous Cloud Backup**. If
you're on M0/M2/M5, or running MongoDB outside Atlas, back up with
`mongodump` on a schedule instead:

```bash
# Run this on a schedule (cron, a scheduled GitHub Action, etc.) — NOT from
# inside the app. This is an operational job, not application code.
mongodump --uri="$MONGODB_CONNECTION_URL" --gzip --archive="backup-$(date +%Y%m%d-%H%M%S).gz"
```

Store the resulting archive somewhere durable and NOT on the same host as
the database (S3, Backblaze, another cloud provider). A backup that lives
next to the thing it's backing up survives none of the failure modes that
actually take out a database.

**If you're on a shared tier and this is a real business, the honest
recommendation is to upgrade to M10+ for Path A.** `mongodump` on a cron
job is a reasonable stopgap, not a substitute for continuous backup with
point-in-time recovery once real customer payment data is at stake.

## 2. What is NOT backed up by either path

- **Cloudinary-hosted media** (course videos, thumbnails, avatars) — these
  live in Cloudinary, not MongoDB. Cloudinary has its own retention/backup
  posture; check it separately. Losing the database does not lose video
  files, and vice versa — they fail independently, so both need a
  recovery story, not just one.
- **Environment variables / secrets** — `RAZORPAY_SECRET`, `JWT_SECRET`,
  `WEBHOOK_SECRET`, etc. live in your hosting platform's env var store
  (Vercel), not in the database. Losing that is a separate incident from
  losing the database, with a separate recovery path (redeploy with the
  same env vars, which you must have stored somewhere outside Vercel too —
  a password manager or secrets vault, not just "it's in Vercel").

## 3. Restore procedure — perform this dry run, don't just read it

The only thing that proves a backup works is restoring it. This section is
written to be run against a **scratch database**, never production.

### Atlas Cloud Backup restore (Path A)

1. Atlas dashboard → cluster → **Backup** → pick a snapshot → **Restore**.
2. Choose **"Restore to a new cluster"** — a temporary, throwaway cluster,
   not your production one. Name it something obviously temporary, e.g.
   `restore-test-<date>`.
3. Wait for the restore to complete (Atlas shows progress).
4. Get the new cluster's connection string (Atlas dashboard → Connect).
5. Run the verification script below against it.
6. **Delete the temporary cluster** once verification passes — it's a
   scratch copy of production data, it shouldn't linger.

### mongodump/mongorestore restore (Path B)

```bash
# 1. Spin up a scratch database — a free-tier Atlas cluster, or local
#    MongoDB via Docker, anything that is NOT production.
docker run -d --name restore-test -p 27018:27017 mongo:7

# 2. Restore the most recent backup archive into it.
mongorestore --uri="mongodb://localhost:27018/restore-test" --gzip --archive=backup-<timestamp>.gz

# 3. Run the verification script against the scratch database.
MONGODB_CONNECTION_URL="mongodb://localhost:27018/restore-test" node scripts/verify-restore.js

# 4. Tear down the scratch database once verification passes.
docker rm -f restore-test
```

### What "passing" means

`scripts/verify-restore.js` (see below) checks:
- Every expected collection exists and has a non-zero document count
  (catches a partial/truncated restore).
- The unique indexes from `scripts/ensure-indexes.js` are present (catches
  a restore that skipped index rebuilding).
- A sample of recent `Payment` and `Order` documents cross-reference
  correctly (catches silent data corruption in the money-critical
  collections specifically, not just "the collection exists").

If the script reports anything other than all-green, **the backup does
not actually work**, and that is exactly the kind of thing you want to
find out during a scheduled drill — not during a real incident.

## 4. How often to actually run Section 3

Once is the minimum to know the backup mechanism works at all. For an
ongoing posture: quarterly is a reasonable cadence for a platform this
size — enough to catch config drift (an Atlas backup policy someone
turned off, a broken cron job) before it matters, without becoming
security-theater busywork nobody actually does.
