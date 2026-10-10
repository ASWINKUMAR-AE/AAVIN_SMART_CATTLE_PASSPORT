# REST API Contract Reference (`/api/v1`)

All endpoints return standardized JSON format:
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "timestamp": "2026-10-09T15:45:00.000Z"
}
```

## Endpoints

### 1. Authentication (`/api/v1/auth`)
- `POST /auth/login`: `{ usernameOrPhone, password }` -> `{ accessToken, refreshToken, user }`
- `POST /auth/register`: User registration with role profiles
- `POST /auth/refresh`: `{ refreshToken }` -> `{ accessToken }`
- `POST /auth/logout`: Revoke session
- `POST /auth/forgot-password`: Password reset
- `GET /auth/me`: Current authenticated user

### 2. Farmers (`/api/v1/farmers`)
- `GET /farmers/me`: Current farmer profile
- `PATCH /farmers/me`: Update profile (bank account, village, language)
- `GET /farmers`: List all farmers (admin/vet/operator)
- `GET /farmers/:id`: Farmer profile by ID
- `GET /farmers/:id/cows`: Cows owned by farmer (Record-level authorized)
- `GET /farmers/:id/payments`: Payments for farmer

### 3. Cows & Digital Passport (`/api/v1/cows`)
- `GET /cows`: List cattle (Farmer restricted to own cows; admin/vet unrestricted)
- `POST /cows`: Register cattle -> Generates permanent cow record + opaque QR token
- `GET /cows/:id`: Cow record by ID
- `GET /cows/:id/passport`: Full Digital Cattle Passport (Clinical history, active withdrawals, yield history, collections)
- `GET /cows/lookup/:identifier`: Lookup cattle by Cow ID, Ear-tag number, or opaque QR Token

### 4. Veterinary Services (`/api/v1/veterinary`)
- `GET /veterinary/assignments`: Assigned cows for vet
- `GET /veterinary/withdrawal-alerts`: Active veterinary withdrawal alerts in force
- `GET /veterinary/medicines`: Regulatory medicine catalog
- `POST /veterinary/health-records`: Record clinical examination (Updates cow status)
- `POST /veterinary/treatments`: Record treatment -> Calculates `milk_withholding_end_time` & locks cow into withdrawal hold
- `POST /veterinary/vaccinations`: Vaccination logs
- `GET /veterinary/appointments`: Appointment consultation requests
- `POST /veterinary/appointments`: Request vet appointment

### 5. Milk Production & Feeding (`/api/v1/production`, `/api/v1/feeding`)
- `POST /production`: Record on-farm morning/evening milk yield
- `GET /production`: 14-day production records
- `GET /production/summary`: Today's yield + 7-day trend breakdown
- `GET /feeding/types`: Feed categories (Co-4, Dry fodder, Aavin pellet, Mineral mix)
- `POST /feeding`: Record daily feeding

### 6. Collection & Quality Testing (`/api/v1/collections`)
- `GET /collections/session`: Get active morning/evening session
- `POST /collections`: Intake milk + analyzer readings -> Runs **Deterministic Milk Safety Twin** -> Returns CLEAR/REVIEW/HOLD + calculates price per litre
- `GET /collections`: List collections with filters
- `GET /collections/:id`: Full digital collection receipt details
- `POST /collections/:id/request-review`: Submit operator justification for supervisor review

### 7. Batches & Logistics (`/api/v1/batches`)
- `GET /batches`: List milk batches
- `POST /batches`: Assemble collection pool into transport batch
- `GET /batches/:id`: Batch details & movement custody log
- `POST /batches/:id/dispatch`: Dispatch batch in tanker
- `POST /batches/:id/deliver`: Confirm delivery at central dairy plant
- `POST /batches/:id/discrepancies`: Report transport spillage/discrepancy

### 8. Payments & Fortnight Billing (`/api/v1/payments`)
- `GET /payments/me`: Farmer payment transactions & ledger
- `GET /payments/payment-cycles`: 15-day billing cycle summaries
- `POST /payments/calculate`: Aggregate CLEAR collections for cycle
- `POST /payments/approve`: Approve payment disbursement transactions

### 9. AI Intelligence (`/api/v1/ai`)
- `POST /ai/chat`: Chat with dairy AI in English or Tamil (Grounding in authorized records)
- `POST /ai/cow-summary`: AI summary of cow passport
- `POST /ai/production-insights`: AI analysis of weekly yield patterns
- `POST /ai/quality-summary`: Transparent explanation of quality tests
- `GET /ai/admin/config`: AI settings (Provider: openrouter/own_api/disabled, Fallback state)
- `PATCH /ai/admin/config`: Update AI settings
- `POST /ai/admin/test`: Connectivity test
- `GET /ai/admin/health`: AI health check

### 10. Admin Operations (`/api/v1/admin`)
- `GET /admin/dashboard`: Operations metrics & today's totals
- `GET /admin/users`: User management
- `PATCH /admin/users/:id/status`: Update account status (active/suspended)
- `GET /admin/audit-logs`: Centralized audit ledger
- `POST /admin/review-decision`: Supervisor override adjudication
