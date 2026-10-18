# Society dispatch and linked BMC inbox

The Django `societies` domain owns vendors, combined vendor milk, farmer attendance,
society dispatch receipts, and receipt items. The `bmcs` domain owns deliveries.
Individual farmer milk uses `societies.FarmerMilkCollection`. See [domain ownership](domain-models.md).

A farmer milk entry creates attendance and the existing farmer notification in the
same transaction. Attendance is unique per farmer, date, and shift. Daily counts
count a farmer once across both shifts. Combined vendor batches have no farmer
allocation, attendance, or farmer notification.

## API

All routes require the existing JWT authentication and use the existing response
envelope. Quantities are decimal strings with two decimal places. List endpoints
support `page` and `pageSize` (maximum 100).

| Route under `/api/v1` | Methods | Behavior |
| --- | --- | --- |
| `/milk-collections` | GET, POST | Existing individual farmer milk API; optional `vendorId` identifies transport by vendor. |
| `/workflow/context` | GET | Signed-in society, its active linked BMC, and assigned active farmers; BMC accounts receive their own context. |
| `/workflow/vendors` | GET, POST | Society-owned vendor directory. POST accepts code, name, and optional phone, routeName, vehicleNumber, vehicleType. |
| `/workflow/vendors/{id}` | PATCH | Update or deactivate a society-owned vendor with `isActive: false`. |
| `/workflow/vendor-milk-collections` | GET, POST | Combined vendor batches. Multiple batches per shift are allowed. |
| `/workflow/milk-transactions` | GET | Society farmer milk and vendor batches with receipt inclusion status. |
| `/workflow/farmer-attendance` | GET | Society attendance records. |
| `/workflow/booth-review` | GET | Eligible collections, separate farmer/vendor totals, and distinct attended farmer IDs. |
| `/workflow/booth-receipts` | GET, POST | List scoped receipts or create an immutable receipt from saved milk entries. |
| `/workflow/booth-receipts/{id}` | GET | Society-owned receipt, or a sent receipt addressed to the signed-in BMC. |
| `/workflow/booth-receipts/{id}/send` | POST | Send a confirmed receipt and create exactly one pending BMC delivery. Safe to retry. |
| `/workflow/bmc-deliveries` | GET | Deliveries sent by this society or addressed to this BMC. |

Collection, attendance, review, and receipt lists accept `collectionDate` and
`session` filters. The delivery list accepts `collectionDate`. Use `full_day` for
both shifts in review and receipt creation.

Vendor batch creation accepts:

```json
{
  "vendorId": "<vendor UUID>",
  "collectionDate": "2026-10-15",
  "session": "morning",
  "quantityLitres": "25.50",
  "notes": "Route cans weighed together",
  "submissionKey": "<new UUID, retained for retries>"
}
```

Receipt creation accepts:

```json
{
  "collectionDate": "2026-10-15",
  "session": "full_day",
  "includedRecordIds": ["<farmer collection UUID>", "<vendor batch UUID>"],
  "notes": "Daily collection verified.",
  "submissionKey": "<new UUID, retained for retries>"
}
```

Ownership and destination come from the authenticated society and its parent BMC.
The client does not choose totals or the destination. Receipts cannot include milk
from a different society/date/shift or milk already assigned to a receipt. Reusing
a submission key with different values returns 409. Sending a receipt repeatedly
returns the same delivery. An unsent receipt cannot be sent if its destination no
longer matches the society's active linked BMC. A sent receipt retains its original
destination.

## Frontend flow

1. Add a route vendor if necessary on Record Milk Collection.
2. Record farmer-wise milk (direct or vendor transport), or a combined vendor batch.
3. Open Dispatch Receipts & Closure to review the day's unreceipted milk and attendance.
4. Generate a full-day receipt, preview it, and transmit it to the linked BMC.
5. Sign in to that BMC and open Receive Milk to see the pending delivery.

These screens and the society dashboard use server data. Successful mutations are
cached only after the server responds, so a subsequent refresh failure does not
hide a confirmed save. Focus, pull-to-refresh, foregrounding, and periodic refresh
reload the data. Responses from an earlier account/session cannot publish into a
new session. Local demo receipts and deliveries are not imported.

BMC quantity confirmation and discrepancy processing are outside this feature.
The confirmation button is disabled for saved server deliveries.

## Migrations and checks

Apply migrations to the intended configured database before using these screens:

```sh
node backend/run.js migrate
```

The additive migrations preserve existing farmer milk and backfill its attendance.
No demo vendors or receipts are inserted. Existing records must finish migrating
before deploying the updated API/frontend.

Local checks use an isolated SQLite database and never modify the configured
application database:

```sh
node backend/run.js test --settings=config.test_settings
node backend/run.js makemigrations --check --dry-run --settings=config.test_settings
node scripts/test-milk-collections.cjs
node scripts/test-dispatch.cjs
node node_modules/typescript/bin/tsc --noEmit
```

PostgreSQL concurrency tests are skipped on SQLite. Run `DispatchConcurrencyTests`
with a separately configured, disposable PostgreSQL test database to verify row
locking under concurrent receipt creation and sending. Do not point tests at the
application database. Expo web export additionally requires a supported Node.js
runtime (the repository's installed Expo CLI requires Node >=20.19.4).
