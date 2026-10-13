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

Legacy `usernameOrPhone` is accepted for frontend compatibility, but must contain a phone number. Username/email login is not supported. The unchanged frontend still needs future integration for the Society role and updated registration requirements.

Outside the API base, `/admin/` provides manual account administration, `/health` checks service availability, and `/ready` tests database connectivity. Previous non-authentication APIs are not ported in this step.
