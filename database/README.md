# PostgreSQL database

The current backend uses database `aavin` on `13.232.41.40:5432`, authenticating as `nivas` with SSL required. Connection values live in `backend/.env`; the password is not part of the committed template.

Apply schema changes with `python backend/manage.py migrate` in the backend virtual environment, or `npm run db:init`. Django migrations are the schema source of truth. Initialization does not drop the database or load demo users.

The existing `college` database belongs to another application and is not modified. The previous MySQL schema and seed are preserved under `legacy/mysql/` for reference.
