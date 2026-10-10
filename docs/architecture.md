# Aavin Smart Cattle Passport — Milk Safety Twin Architecture

## System Architecture Overview

The **Aavin Smart Cattle Passport (Milk Safety Twin)** is a dairy ecosystem designed for Madurai District Milk Union, Tamil Nadu. It seamlessly connects six distinct actors:
1. **Farmers / Cattle Owners**
2. **Veterinary Doctors**
3. **Collection Centre Operators**
4. **Milk Transport Vendors**
5. **Aavin Central Administrators**
6. **Backend AI Advisory Intelligence**

```
 ┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
 │  Farmer Mobile  │       │ Veterinary App  │       │ Collection Centre│
 │  (My Cows & QR) │       │ (Rx & Withdrawal│       │ (Intake Analyzer)│
 └────────┬────────┘       └────────┬────────┘       └────────┬─────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │ (REST API / JWT)
                                    ▼
                 ┌──────────────────────────────────────┐
                 │  Node.js Express TypeScript Backend  │
                 │             (Port 4000)              │
                 ├──────────────────────────────────────┤
                 │ • Deterministic Safety Twin Engine   │
                 │ • 15-Day Payment Calculation Engine  │
                 │ • Role & Record Authorization Guard  │
                 │ • AI Provider Service (OpenRouter/Own│
                 │ • Centralized Audit Ledger           │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │  MySQL Relational Database (XAMPP)   │
                 │         (Database: aavin_milkflow)   │
                 │      40 InnoDB Relational Tables     │
                 └──────────────────────────────────────┘
```

---

## The Milk Safety Twin Engine (Central Business Logic)

The Safety Twin connects four critical domains into a deterministic, explainable decision matrix:
- **Domain A: Animal Health Profile**
- **Domain B: Veterinary Clinical Treatment & Active Withdrawal Enforcement**
- **Domain C: Physical Milk Analyzer Quality Readings (FAT %, SNF %, Temp, Density, Adulteration)**
- **Domain D: Collection & Pooling Authorization**

### Decision Outcomes

1. **CLEAR:**
   - No active veterinary withdrawal restriction in force.
   - FAT % meets standard ($\ge 3.50\%$).
   - SNF % meets standard ($\ge 8.50\%$).
   - Temperature is chilled ($\le 12.0^\circ\text{C}$).
   - Adulteration chemical screen is negative.
   - **Result:** Milk is accepted into the collection pool, payment calculated with quality incentive.

2. **REVIEW:**
   - Any quality parameter falls in the configured review warning boundary (e.g. FAT $3.00\% - 3.49\%$, SNF $8.00\% - 8.49\%$, or elevated intake temperature).
   - Flagged for operator review and supervisor audit queue.

3. **HOLD:**
   - **Mandatory Safety Hold:** Active veterinary antibiotic withdrawal period detected.
   - **Quality Hold:** Adulteration detected or FAT/SNF below critical minimums ($<3.0\% / <8.0\%$).
   - **Result:** Milk is strictly held. Payable amount is set to ₹0.00. Operators cannot override a HOLD without an authorized, audited review workflow.

---

## AI Architecture (OpenRouter & Own AI API with Non-Silent Fallback)

- **Backend-Controlled:** Mobile clients never store AI API keys or select model endpoints directly.
- **Provider Switching:** Backend supports `AI_PROVIDER = 'openrouter' | 'own_api' | 'disabled'`.
- **Automatic Fallback:** `AI_FALLBACK_ENABLED=false` by default. When enabled by an administrator:
  - Triggers only on network failure, 5xx server errors, or timeouts.
  - **Never silent:** Emits an entry to `ai_usage_logs` detailing the primary error and fallback trigger, creates an admin notification, and marks the response with `isFallback: true`.
- **Safety Isolation:** AI is strictly barred from diagnosing cattle, prescribing medication, calculating payments, or overriding CLEAR/REVIEW/HOLD decisions.
