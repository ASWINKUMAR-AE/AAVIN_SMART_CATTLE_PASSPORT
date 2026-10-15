# Django authentication API

Role-specific account routes and model ownership are documented in [domain models](domain-models.md). Existing authentication routes remain compatible.

Base URL: `http://localhost:4000/api/v1/auth`. Paths have no trailing slash.

Successful responses use `{"success":true,"message":"...","data":{},"timestamp":"..."}`. Validation and authentication errors use `success:false`, `message`, `errors`, and `timestamp`.

| Method/path | Authentication | Request |
| --- | --- | --- |
| POST `/login` | Public | `phone`, `password` |
| POST `/register` | Bearer access token | `phone`, `fullName`, `password`, `role`, optional `parentId` |
| POST `/refresh` | Public | `refreshToken` |
| GET `/me` | Bearer access token | None |
| POST `/logout` | Bearer access token | Optional `refreshToken` to revoke |

Login returns `accessToken`, `refreshToken`, and `user` within `data`. User fields are `id` (UUID), `phone`, `fullName`, `role`, `roles` (single-element array), and `parentId`.

Only a Society can register a Farmer. BMC or Union can register a Society. Only Union can register a BMC. No API can register Union accounts. Union-created Societies require a `parentId` identifying an active BMC belonging to that Union. In other permitted cases, parent is the creator, and an explicit different parent is rejected.

Invalid credentials and inactive accounts return 401. Unauthenticated registration returns 401, forbidden role creation returns 403, and invalid fields or duplicate phones return 400. Successful registration returns 201. Login has a rate limit of 10 requests per minute per client.

Legacy `usernameOrPhone` is accepted for frontend compatibility, but must contain a phone number. Username/email login is not supported. The frontend maps Society accounts to its Booth screens and submits Farmer profiles and cattle on enrollment.

Outside the API base, `/admin/` provides manual account administration, `/health` checks service availability, and `/ready` tests database connectivity. Farmer management and milk collection APIs are documented below; receipt generation and payment APIs remain outside this implementation.

## Farmer personal details and frontend integration

Society accounts can register a Farmer with the existing form fields:

```json
{
  "phone": "9842000099",
  "fullName": "Murugan",
  "role": "farmer",
  "parentId": "UUID-OF-THE-LOGGED-IN-SOCIETY",
  "personalDetails": {
    "farmerIdCode": "FARM-MDU-999",
    "address": "10 Main Street",
    "village": "Melur",
    "community": "Melur Taluk",
    "numberOfCows": 0,
    "bankAccountName": "Murugan",
    "bankName": "Example Bank",
    "bankAccountNumber": "0000123456",
    "bankIfsc": "TEST0001234",
    "upiId": "murugan@bank"
  }
}
```

When a Farmer registration omits `password`, the initial password equals the submitted phone number. This is the explicitly selected onboarding behaviour. An explicit password still follows the existing password-strength validators. Other roles must supply a password. Pending profile verification does not block login.

`personalDetails` is optional for compatibility with existing account-only registration. When supplied, Farmer ID code, address, village, and nonnegative integer cattle count are required; community and banking fields are optional. Farmer ID codes are normalized to uppercase and must be unique. Account and profile creation are atomic. Only Farmer registrations accept personal details, and only Society accounts can create Farmers under their own account.

Registration, login, and `/auth/me` now return `user.personalDetails` (null for accounts without a profile), `user.parent` (ID, name, phone, role, and parent ID), and `user.createdAt`, alongside the existing user fields.

**GET `/api/v1/farmers`** requires a Society Bearer token and returns `data.farmers`, an array of these user objects. It always lists only Farmers belonging to that Society; query parameters cannot widen its scope. Accounts without profiles remain included with null personal details. Other roles receive 403 and unauthenticated callers receive 401.

The frontend maps backend `society` to the existing `booth` route without changing screen labels. Login uses the backend exclusively, sends exact passwords, and restores sessions through `/auth/me`. Registration saves every form field to PostgreSQL before updating its local cache; the existing Society directory reloads its own Farmers from the server. Society farmer editing and KYC controls use the update endpoint below.

## Farmer cattle

Farmer registrations accept an optional, nonempty `cows` array:

```json
"cows": [
  {"pashuAadhaar": "123456789012", "breed": "Jersey Cross", "milkCapacity": 12.5, "name": "Lakshmi"},
  {"pashuAadhaar": "123456789013", "breed": "HF Cross", "milkCapacity": 15}
]
```

Only Society-created Farmers accept cattle. The backend assigns `farmer_id` from the newly created account; clients cannot choose a different owner. Tags must contain exactly 12 digits and be unique across the database and within the request. Breed is required, milk capacity must be positive with at most two decimal places, and name is optional. Invalid cattle reject the whole registration; database failures roll back the account, profile, and all cows. When cattle are supplied, `personalDetails.numberOfCows` is derived from the array length.

Each cow is a separate `accounts_cow` row linked to `farmers_farmer.user_id` (the same UUID as its authentication account). `user.cows` is returned in registration, login, current-user lookup, and the Society's farmer directory. Each entry contains `id` (cow UUID), `farmerId` (farmer UUID), `pashuAadhaar`, `breed`, `milkCapacity` (decimal string), `name`, and `createdAt`. Accounts with no cattle return an empty array. Society listing permissions also protect nested cow records.

The frontend restores these records into its cache using server IDs, preserves local clinical data for matching tags, and replaces the current society's cached cattle on refresh. Birth dates, health history, RFID/breed changes, and cattle verification are outside this API. Existing locally enrolled cattle require a separate reviewed import; this migration does not copy device storage.

## Society farmer edits and KYC

`PATCH /api/v1/farmers/<farmer UUID>` requires a Society access token. Only that Society's own Farmers can be updated (404 for other Farmers, 403 for other roles, 401 when unauthenticated). Example:

```json
{
  "fullName": "Updated Farmer",
  "personalDetails": {"address": "New Street", "verificationStatus": "verified", "bankName": "Example Bank"},
  "cows": [{"id": "SAVED-COW-UUID", "name": "Lakshmi", "milkCapacity": 14.5}]
}
```

All fields are optional. `phone` is also editable and unique; changing it preserves the existing password. Partial profile updates retain unspecified fields. Farmer ID remains unique; KYC accepts `pending` or `verified`. Counts derive from database cow rows. Cow updates require distinct saved IDs owned by this Farmer; only name and milk capacity change. Omitted cows are retained. Account, profile, and cow edits are atomic, with refreshed `data.user` returned on success. An account without a profile needs Farmer ID, address, and village before KYC.

The farmer editor can also append cattle using `newCows`, with the same fields and validation as registration (`pashuAadhaar`, `breed`, positive `milkCapacity`, optional `name`). The server assigns each new cow to the Farmer in the URL, validates global and request-level tag uniqueness, and updates the profile cattle count. Existing cow edits, new cow creation, and profile changes share one transaction. Saved cattle remain visible in the editor; local cattle not yet saved are submitted through `newCows` when the operator saves. UUIDs are used internally and omitted from the editor's society and farmer labels.

## Farmer milk collections

All paths below use `/api/v1` and JWT authentication. These endpoints are owned by the `societies` domain. Records retain the existing `collections_farmermilkcollection` table, with typed foreign keys to `farmers.Farmer` and `societies.Society`. See [model and endpoint ownership](domain-models.md).

`POST /milk-collections` requires an active Society account:

```json
{
  "farmerId": "FARMER-ACCOUNT-UUID",
  "quantityLitres": "12.34",
  "collectionDate": "2026-10-13",
  "session": "morning",
  "notes": "Measured at the collection booth"
}
```

Only an active Farmer belonging to the authenticated Society can be selected. Society and creator are derived from authentication; extra fields such as `boothId`, `societyId`, `createdBy`, or `farmerName` are rejected. Litres must be positive, at most 99,999,999.99, and have no more than two decimal places. Dates must be valid and no later than today in `Asia/Kolkata`. Shift is `morning` or `evening`; notes are optional and limited to 1,000 characters.

Success returns 201 with `data.record`: `id`, `farmerId`, `farmerName`, `boothId`, `boothName`, `createdBy`, `collectionDate`, decimal-string `quantityLitres`, `session`, `notes`, and `createdAt`. Each farmer/date/shift can have exactly one entry, enforced by a database constraint and row locking. A duplicate returns 409. Invalid input returns 400, unauthorized roles 403, and an unavailable/out-of-society Farmer 404. Entries are immutable; there is no edit/delete API. Historical Society ownership remains unchanged when a Farmer is reassigned.

`GET /milk-collections` returns `data.results`, `count`, `page`, `pageSize`, and `hasNext`. Default page size is 50, maximum 100. Records sort by collection date, creation time, and UUID descending. Optional filters: `farmerId`, `collectionDate`, `dateFrom`, `dateTo`, and `session`. Society accounts see records collected by that Society; Farmer accounts see only their own records. Filters intersect that scope and never grant access to other accounts.

`GET /milk-collections/summary` accepts the same record filters. It returns `today` (India date), decimal-string `todaySupply`, `monthSupply`, `last7DaysSupply`, today's `shifts.morning` and `shifts.evening`, and seven `dailyTrend` points containing `date` and decimal-string `quantityLitres`. Totals use database decimal aggregation, include zero-volume days, and limit the seven-day period to today and the preceding six dates.

## Private collection notifications

Saving a collection atomically creates one `collections_collectionnotification` row for that Farmer. Its message contains litres, collection date, shift, and Society name. If notification creation fails, collection creation rolls back.

| Method/path | Behavior |
| --- | --- |
| GET `/notifications` | Paginated recipient-owned `results`, `count`, `page`, `pageSize`, `hasNext`, and `unreadCount` |
| POST `/notifications/<notification UUID>/read` | Mark a recipient-owned notification read; another recipient's UUID returns 404 |
| POST `/notifications/read-all` | Mark only the authenticated recipient's notifications read |

Notification fields are `id`, `recipientId`, `recipientRole`, `referenceId` (collection UUID), `title`, `message`, `isRead`, ISO `timestamp`, `type: "milk_recorded"`, and `linkRoute: "/(farmer)/milk-history"`. Collections and private notifications refresh on app foreground and every 30 seconds while the app is active; their screens also refresh on focus. Phone push is not included.

## Collection frontend and rollout

The Booth form loads the authorized Farmer list (`isActive` is included in account responses), waits for server confirmation, and only caches authoritative records. After a timeout or uncertain server failure, it checks the farmer/date/shift entry before permitting another submission. If that check fails, subsequent attempts must resolve the earlier request first. Farmer dashboard/history and Booth totals refresh from server data; failed loads display an unavailable state, and failed refreshes retain confirmed data with an error message. Private collection/notification caches are in memory, reset at logout/account changes, and never restored from demo device storage. Combined vendor intake, farmer self-entry, audited corrections, payments, and receipt backend integration are outside this version.

Deploy the backend and apply its additive migration before updating the frontend. The Docker image must include `milk_collections/` (the checked-in Dockerfile now copies it). For the existing Docker Compose deployment, run from the server’s `backend` folder:

```sh
docker compose build backend
docker compose run --rm --no-deps -T backend python manage.py migrate collections --plan
docker compose run --rm --no-deps -T backend python manage.py migrate collections --noinput
docker compose up -d --no-deps backend
```

For a virtual-environment deployment instead:

```sh
cd backend
.venv/bin/python manage.py migrate --plan
.venv/bin/python manage.py migrate
```

Use the server's existing deployment process to restart Django. Do not use `config.test_settings` for deployment. No existing device/demo entries are imported. Verify `/ready`, then use separate Society and Farmer sessions to save a measured collection and confirm the same litres/date/shift, one private notification, and persistent read status after re-login. A second same-shift submission must return 409 and leave totals unchanged.

Local validation (no hosted database access):

```sh
DJANGO_SECRET_KEY=isolated-test-secret-32-characters-only backend/.venv/bin/python backend/manage.py test accounts milk_collections --settings=config.test_settings
node scripts/test-milk-collections.cjs
node scripts/test-society-farmers.cjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/test-booth-layout.cjs
git diff --check
```

The concurrency test runs only with PostgreSQL and is skipped under SQLite. For PostgreSQL verification, use a separate local test cluster and a settings module pointing exclusively to it; never run concurrency tests against the hosted database. Validation for this change includes all 46 backend tests on an isolated PostgreSQL cluster, including simultaneous duplicate submissions, the collection and farmer behavior regressions, TypeScript, 280 Booth browser layout cases, and 28 additional expanded farmer-selector cases. These checks do not replace physical Expo Go/device testing. Layout-runner setup is documented in [Booth UI checks](booth-ui-checks.md).

### Hosted integration verification

The `aavin_backend` Compose service was rebuilt and activated with the collection API. Migration `collections.0001_initial` was already applied. HTTPS `/health` and `/ready` returned 200; collection and notification routes returned 401 without authentication. Read-only authenticated checks passed for both Society and Farmer collection lists, summaries, and recipient-scoped notifications. No production test collections or notifications were created.

The prior image is retained as `aavin-backend:before-milk-collections`; prior backend source is backed up at `/home/ubuntu/aavin-collections-backup-lAPAMC/source-before.tar.gz`. Deployment used the reviewed working-tree source, not a new Git commit. Commit and synchronize these backend changes before a subsequent Git-based deployment. Final frontend verification also passed 56 entry/review layout cases, including the saved-date navigation changes, plus active-app collection polling and existing farmer regressions.
