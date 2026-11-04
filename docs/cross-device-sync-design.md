# Cross-device synchronization design — Run to 50K

Status: design only; no production changes. Branch: dev/cross-device-sync.

## Current implementation (reviewed 2026-11-03)
- Single HTML app; IndexedDB database `run50k-db-v1`, store `state`, key `main`.
- State v1 contains settings, weeks, logs, strengthLogs, notes and created.
- Garmin imports use `intervals-<externalId>` IDs; a separate existing Cloudflare Worker supplies activities from Intervals.icu.
- Garmin token lives in browser localStorage and must never be copied to a repository or backup.
- Current `saveRun` reconstructs edited runs from form values, potentially losing `externalId` and `source`.
- Current backup import replaces the entire local state after confirmation.
- Strength entries lack stable IDs. Local data differs across devices.

## Non-negotiable safety rules
1. Keep `main`, existing Worker, and existing device data untouched until a separate test passes.
2. Never publish training records, tokens, or secrets in this public repository.
3. Before first live migration, export and independently verify a backup from EACH device; preserve originals.
4. Never silently replace a whole device state with another device state.
5. Never overwrite a nonempty RPE, pain score or note with an empty imported Garmin field.
6. Preserve original Garmin activity ID and metadata when editing an activity.
7. No automatic destructive deletions; use tombstones and explicit conflict resolution.
8. Require authenticated, per-user server access; keep server secrets out of client code.
9. Keep Garmin import working even when cloud sync is unavailable.

## Proposed data model
- Stable record IDs: Garmin `intervals-<externalId>`; manual runs UUID; strength logs UUID; notes UUID.
- Store separate records/collections for activities, strength, notes, settings, and plans, rather than blindly syncing one monolithic snapshot.
- Each mutable record includes `updatedAt`, `revision`, `deviceId`, `deletedAt` (nullable) and schema version. Server assigns canonical revisions; client clocks are not authoritative.
- Treat Garmin-derived fields as source data and user annotations (RPE, pain, notes) as separate editable fields or subrecords.
- For plans/workouts, retain stable workout IDs and explicit completion state; do not derive deletions from an absent entry.

## Sync protocol
- Initial enrollment: local backup, read-only comparison, user confirmation of migration, then upload; repeat with second device using merge rather than replacement.
- Sync uses authenticated pull + push of changes since server cursor, idempotent upserts and server-side revision preconditions.
- On conflict: preserve both versions and prompt user, especially for manual annotations and training-plan edits.
- On failure: queue edits locally and retry; app must work offline.
- Never assume a successful Garmin import means manual cross-device sync is working.

## Implementation sequence
1. Add deterministic tests using synthetic state fixtures (no personal records).
2. Fix editRun/saveRun to preserve Garmin identifiers and metadata; assign IDs to strength logs and notes without losing existing data.
3. Implement a pure merge engine with tests for duplicate Garmin IDs, concurrent annotations, deletions, offline edits and schema migration.
4. Choose and configure authenticated storage; evaluate access controls, backup/recovery and cost before creating infrastructure.
5. Add opt-in preview and dry-run migration. Validate both device backups and compare counts/annotations.
6. Test iPhone -> Mac, Mac -> iPhone, offline -> online, conflict, retry and rollback.
7. Only after user approval, enable live sync; keep manual JSON export and rollback available.

## Acceptance criteria
- No missing or duplicate Garmin runs.
- RPE, pain, notes, strength entries, and plan changes converge across both devices.
- All pre-existing data preserved after migration.
- Offline edits persist and sync later.
- No credentials or personal training records enter GitHub.
- Existing Garmin import continues to function.
