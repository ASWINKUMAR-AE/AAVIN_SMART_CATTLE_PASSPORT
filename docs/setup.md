# Setup

See the root [README](../README.md#backend-setup) for Django installation, PostgreSQL configuration, migrations, manual Union creation, and startup commands.

The cloud database is `aavin` at `13.232.41.40:5432`, with username `nivas` and SSL required. Password and Django signing secret belong in the Git-ignored `backend/.env`.

The frontend can still run with `npm run expo`. To start both services, install the Python and frontend dependencies, then use `npm start`. The browser opens Django Admin; the old QR portal is archived.

The XAMPP setup instructions and MySQL SQL files under `legacy/mysql/` describe the retired backend only. Do not import those SQL files into PostgreSQL.
