# Domain models and endpoint ownership

The five active domain packages are `accounts` (Auth), `unions`, `bmcs`,
`societies`, and `farmers`. The old model registrations have been retired.

## Model ownership

- Auth: `accounts.User` remains Django's swappable authentication model. Keeping
  this identity preserves existing passwords, UUIDs, admin accounts, and JWTs.
- Union: `unions.Union` has one authentication account.
- BMC: `bmcs.BMC` belongs to a Union and has one authentication account.
- Society: `societies.Society` belongs to a BMC and has one authentication account.
- Farmer: `farmers.Farmer` belongs to a Society, has one authentication account,
  and owns its personal/banking/KYC details and cattle.

The four role records share their authentication account UUIDs. Account creation
and role provisioning are atomic, including admin-created Union accounts.
Authentication parent updates synchronize the typed parent; existing roles cannot
be changed into another role. Existing API user and parent representations remain
unchanged. Farmers without personal details continue to return `personalDetails: null`.

Society owns `FarmerMilkCollection`, `Vendor`, `VendorMilkCollection`,
`FarmerAttendance`, `SocietyDispatchReceipt`, and `DispatchReceiptItem`. Farmer owns
`Cow` and `CollectionNotification`. BMC owns `BMCDelivery`.

## Endpoint map

All paths below are under `/api/v1`; trailing slashes are omitted.

| Methods | Path | Owner/model |
| --- | --- | --- |
| POST | `/auth/login`, `/auth/refresh`, `/auth/logout` | Auth / `User`, JWT tokens |
| GET | `/auth/me` | Auth / `User`, nested typed role data |
| POST | `/auth/register` | Auth registration delegates to the corresponding role model |
| GET, POST | `/farmers` | Farmer / `Farmer`; Society-scoped enrollment and directory |
| GET, PATCH | `/farmers/{id}` | Farmer / `Farmer`, nested cattle and details |
| GET, POST | `/societies` | Society / `Society`; supervising BMC or Union creates accounts |
| GET, PATCH | `/societies/{id}` | Society / `Society`; updates require its supervisor |
| GET, POST | `/bmcs` | BMC / `BMC`; Union creates accounts |
| GET, PATCH | `/bmcs/{id}` | BMC / `BMC`; updates require its Union |
| GET | `/unions`, `/unions/{id}` | Union / signed-in `Union` only |
| PATCH | `/unions/{id}` | Union / own name, phone, active status |
| GET, POST | `/milk-collections` | Society / `FarmerMilkCollection`; Farmer reads own history |
| GET | `/milk-collections/summary` | Society / scoped collection aggregates |
| GET | `/notifications` | Farmer / auth-recipient-scoped `CollectionNotification` |
| POST | `/notifications/read-all`, `/notifications/{id}/read` | Farmer / private notification read state |
| GET | `/workflow/context` | Society and BMC / typed hierarchy |
| GET, POST | `/workflow/vendors` | Society / `Vendor` |
| PATCH | `/workflow/vendors/{id}` | Society / `Vendor` |
| GET, POST | `/workflow/vendor-milk-collections` | Society / `VendorMilkCollection` |
| GET | `/workflow/milk-transactions` | Society / farmer and vendor milk |
| GET | `/workflow/farmer-attendance` | Society / `FarmerAttendance` |
| GET | `/workflow/booth-review` | Society / eligible collections and attendance |
| GET, POST | `/workflow/booth-receipts` | Society / `SocietyDispatchReceipt` and items |
| GET | `/workflow/booth-receipts/{id}` | Society / own receipt, or its destination BMC after sending |
| POST | `/workflow/booth-receipts/{id}/send` | Society / receipt plus exactly one BMC delivery |
| GET | `/workflow/bmc-deliveries` | BMC / `BMCDelivery`, also visible to sending Society |

`GET /health`, `GET /ready`, and `/admin/` retain their existing routing.
Union creation remains available through administrator tooling. Role detail PATCH
accepts `fullName`, `phone`, and `isActive`; it cannot change roles or ownership.
Farmer PATCH additionally supports existing profile/KYC/cattle fields. See
[API payloads](api.md) and [dispatch payloads](society-dispatch.md).

## Existing database upgrade

Apply all migrations before starting the updated backend:

```sh
node backend/run.js migrate
```

The migration backfills the four role tables, copies old farmer profiles into
Farmer, reuses existing cattle/milk/dispatch tables, changes foreign keys to the
correct typed owners, and remaps Django content types/permissions. The old
`accounts_farmerprofile` table is removed only after its data has been copied.
Existing physical business-table names remain stable; there are no duplicate
business tables or runtime aliases for retired models.

The top-level `backend/dispatch` package has been removed. Its historical
migrations live under `backend/accounts/migration_history/dispatch`, registered
with the original migration label so existing databases can still upgrade and
roll back. The `milk_collections` package also retains migration history only.
Do not delete this history while existing databases depend on it. All active views, serializers, model
classes, and URL routes live under the five domains.

Isolated verification:

```sh
node backend/run.js test --settings=config.test_settings
node backend/run.js makemigrations --check --dry-run --settings=config.test_settings
node scripts/test-auth-integration.cjs
node scripts/test-society-farmers.cjs
node scripts/test-milk-collections.cjs
node scripts/test-dispatch.cjs
node node_modules/typescript/bin/tsc --noEmit
```

The migration tests exercise real pre-transition rows, passwords, permission
assignments, foreign keys, upgrade, and rollback. PostgreSQL locking tests require
a separate disposable PostgreSQL test database and are skipped under SQLite.
