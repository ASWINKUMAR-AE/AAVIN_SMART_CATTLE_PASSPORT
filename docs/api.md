# Django authentication API

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

Outside the API base, `/admin/` provides manual account administration, `/health` checks service availability, and `/ready` tests database connectivity. Previous non-authentication APIs are not ported in this step.

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

Each cow is a separate `accounts_cow` row linked to `accounts_user.id`. `user.cows` is returned in registration, login, current-user lookup, and the Society's farmer directory. Each entry contains `id` (cow UUID), `farmerId` (farmer UUID), `pashuAadhaar`, `breed`, `milkCapacity` (decimal string), `name`, and `createdAt`. Accounts with no cattle return an empty array. Society listing permissions also protect nested cow records.

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
