# Django backend verification

The authentication backend has 14 automated tests in `backend/accounts/tests.py`. Run with:

```bash
npm --prefix backend test
```

Tests use an in-memory SQLite database through `config.test_settings` and do not write to the cloud database. They verify phone login for all four roles, the complete registration permission matrix, parent ownership, unrestricted Society counts, password hashing and strength, duplicate phones, inactive accounts, JWT refresh, logout revocation, and manual Union creation through Django Admin.

Production configuration uses PostgreSQL with required SSL. Cloud connectivity and migrations are checked separately. These authentication tests do not validate the archived milk safety, payments, AI, or logistics implementation.

Cloud verification completed: the separate `aavin` database was created, the live connection reported SSL enabled, and all Django migrations were applied. A PostgreSQL smoke check passed for phone login, BMC registration by Union, current-user lookup, and database readiness. The temporary verification accounts were created inside a transaction and rolled back.
