# Current architecture

The Expo frontend calls Django REST Framework on port 4000. PostgreSQL stores
phone/password authentication, role accounts, farmer/cattle details, milk intake,
attendance, dispatch receipts, and the linked BMC inbox.

The backend has five domain owners:

| Domain | Models and responsibility |
| --- | --- |
| `accounts` (Auth) | Django `User`, credentials, phone, JWT sessions, role registration, shared account transport. |
| `unions` | `Union`, the root of the account hierarchy. |
| `bmcs` | `BMC`, Union membership, incoming `BMCDelivery`. |
| `societies` | `Society`, BMC membership, farmer/vendor milk, vendors, attendance, dispatch receipts and items. |
| `farmers` | `Farmer`, Society membership, personal/bank/KYC fields, `Cow`, private collection notifications. |

`Union → BMC → Society → Farmer` uses explicit foreign keys between typed models.
Each role record has a one-to-one authentication account and shares its UUID.
Authentication `parent` is retained for the existing API contract and synchronized
atomically with the typed relationship. Existing account roles cannot change.

Business ownership points to typed Farmer, Society, and BMC models. Audit creators
and notification recipients point to authentication accounts. Querysets enforce
ownership at the server; caller-supplied IDs cannot widen access.

Existing frontend response shapes and URLs remain compatible. Farmer enrollment
uses the canonical `/api/v1/farmers` endpoint; `/api/v1/auth/register` continues to
create the appropriate role record for existing clients. See [all endpoint owners](domain-models.md).

The old `accounts.FarmerProfile`, `accounts.Cow`, `collections.*`, and `dispatch.*`
models no longer register at runtime. The retired top-level `dispatch` package is removed; its migrations live under
`accounts/migration_history/dispatch` with the original label, so existing
databases can upgrade. The role transition migration copies farmer
profiles, adopts existing business tables, rebinds their foreign keys, maps Django
permissions, and removes the old profile table. User UUIDs, password hashes, JWT
references, and business IDs stay unchanged.

Clinical records, payments, cattle verification, and AI workflows retain local/demo
behavior. The earlier Node/MySQL backend remains an archive under `legacy/`.
