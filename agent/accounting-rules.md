# accounting-rules.md — ExzaEstate Accounting Rules (DEFAULTS pending accountant sign-off)

Every value here is a **seed default stored as configuration**. The company's accountant may change accounts, mapping and policy without a deploy (`prd.md` §13). The agent implements exactly this and never invents a posting. If an event is not listed here, **stop and ask** (`RULE-POSTING`: missing mapping blocks the transaction with `POSTING_RULE_MISSING`).

Money is integer paisa (`ARCH-MONEY`). Every journal balances (`RULE-DOUBLE-ENTRY`). Posting happens through `PostingService.post(eventType, payload)` inside the caller's transaction.

## 1. Default chart of accounts (seed)

Codes are 4 digits, per company, editable. `system: true` accounts are referenced by posting rules and cannot be deactivated while mapped.

| Code | Name                            | Type      | Notes                                                    |
| ---- | ------------------------------- | --------- | -------------------------------------------------------- |
| 1000 | Assets                          | ASSET     | group                                                    |
| 1010 | Cash in Hand                    | ASSET     | `system`                                                 |
| 1020 | Bank Accounts                   | ASSET     | group; one child per bank account, `system` parent       |
| 1030 | Mobile Wallets (bKash/Nagad)    | ASSET     | `system`                                                 |
| 1040 | Cheques in Hand (Uncleared)     | ASSET     | `system`                                                 |
| 1100 | Customer Receivable             | ASSET     | `system`, party = customer                               |
| 1150 | Advances to Vendors             | ASSET     |                                                          |
| 1200 | Land Inventory                  | ASSET     | land purchase cost                                       |
| 1210 | Development Work in Progress    | ASSET     | by project cost center                                   |
| 1300 | Fixed Assets                    | ASSET     | group                                                    |
| 1900 | Suspense — Unallocated Receipts | LIABILITY | `system` (`prd.md` §6.14)                                |
| 2000 | Liabilities                     | LIABILITY | group                                                    |
| 2100 | Accounts Payable — Vendors      | LIABILITY | `system`, party = vendor                                 |
| 2200 | Customer Advances / Credits     | LIABILITY | `system` (overpayments)                                  |
| 2300 | Commission Payable              | LIABILITY | `system`, party = broker                                 |
| 2400 | VAT / Tax Payable               | LIABILITY | `system`                                                 |
| 2500 | Refunds Payable                 | LIABILITY | `system`                                                 |
| 2600 | Unearned Sales Revenue          | LIABILITY | `system` (used when `revenue_recognition` != ON_BOOKING) |
| 3000 | Equity                          | EQUITY    | group                                                    |
| 3100 | Owner's Capital                 | EQUITY    |                                                          |
| 3900 | Retained Earnings               | EQUITY    | `system`                                                 |
| 4000 | Income                          | INCOME    | group                                                    |
| 4100 | Property Sales Revenue          | INCOME    | `system`                                                 |
| 4200 | Late Fee Income                 | INCOME    | `system`                                                 |
| 4300 | Cancellation Deduction Income   | INCOME    | `system`                                                 |
| 4900 | Other Income                    | INCOME    |                                                          |
| 5000 | Expenses                        | EXPENSE   | group                                                    |
| 5100 | Cost of Land Sold               | EXPENSE   |                                                          |
| 5200 | Development Cost Expense        | EXPENSE   |                                                          |
| 5300 | Marketing Expense               | EXPENSE   |                                                          |
| 5400 | Commission Expense              | EXPENSE   | `system`                                                 |
| 5500 | Administrative Expense          | EXPENSE   | category children editable                               |
| 5600 | Maintenance Expense             | EXPENSE   |                                                          |
| 5900 | Discounts Allowed               | EXPENSE   | `system` (contra-revenue; see booking)                   |

## 2. Policy settings that change postings

| Setting                       | Default               | Effect                                                                                                                                                                                                            |
| ----------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `revenue_recognition`         | `ON_BOOKING`          | When revenue account (4100) is credited. Alternatives `ON_AGREEMENT`, `ON_HANDOVER`: the credit goes to "Unearned Sales Revenue" liability (2600) until that milestone, then a transfer journal moves it to 4100. |
| `vat_rate`                    | `0.0000`              | VAT charged on price/fees; if > 0 the VAT part credits 2400.                                                                                                                                                      |
| `cancellation_deduction_rate` | `10 %` of paid amount | See §3.7                                                                                                                                                                                                          |
| `late_fee_rate`               | `0` (disabled)        | Monthly simple rate on overdue principal                                                                                                                                                                          |
| `min_booking_percent`         | `10 %`                | Validation, not a posting                                                                                                                                                                                         |
| `allow_suspense_receipts`     | `false`               | When false, payment without exact allocation is rejected; when true, unallocated portion credits 1900 Suspense.                                                                                                   |

## 3. Posting rules (one file per event in `accounting/posting-rules/`)

Notation: **Dr** / **Cr** amounts in paisa. `P` = net price after discount; `D` = approved discount; `B` = booking amount received.

### 3.1 `BOOKING_CONFIRMED`

Trigger: booking reaches `CONFIRMED`. Creates the receivable for the whole net price.

- Dr 1100 Customer Receivable — `P` (party = customer, project/cost center, booking ref)
- Cr 4100 Property Sales Revenue — `P` (if `ON_BOOKING`; else Cr 2600 Unearned Sales Revenue)
- If VAT > 0: revenue credit is `P − VAT`, Cr 2400 — VAT.
- Discounts: the quotation's list price minus `D` gives `P`; no separate journal by default. If the company enables `show_discount_gross`, post gross: Dr 5900 Discounts Allowed `D`, Cr 4100 at list price.

### 3.2 `PAYMENT_POSTED` (installment, booking money, any allocated receipt)

- Dr asset account by payment method:
  - Cash → Dr 1010 Cash in Hand
  - Bank Transfer / Card / Gateway / Other → Dr 1020-x Bank Accounts
  - Mobile Wallets (bKash/Nagad) → Dr 1030 Mobile Wallets
  - Cheque → Dr 1040 Cheques in Hand (Uncleared)
- Cr 1100 Customer Receivable — allocated amount (party = customer)
- Over-payment part: Cr 2200 Customer Advances.
- Unallocated part (only if company enables `allow_suspense_receipts`): Cr 1900 Suspense.
- **Cheque Lifecycle & Immutability:** Posted payment records are strictly immutable (`RULE-IMMUTABLE`). Status transitions (`RECEIVED → CLEARED` or `RECEIVED → BOUNCED`) are recorded in an append-only `cheque_events` table:
  - Cheque `Cleared`: Dr 1020-x Bank account / Cr 1040 Cheques in Hand.
  - Cheque `Bounced`: reverse the original payment journal via `PAYMENT_REVERSED` — never mutate or delete the original payment.

### 3.3 `PAYMENT_REVERSED`

Exact mirror of the original payment journal, linked by `reversal_of_id`; receipt voided. Installment balances are re-opened by the allocation reversal.

### 3.4 `LATE_FEE_CHARGED` (only if `late_fee_rate > 0`)

- Dr 1100 Customer Receivable — fee; Cr 4200 Late Fee Income — fee. Waiver (needs approval): mirror entry.

### 3.5 `EXPENSE_APPROVED_PAID`

- Dr 5xxx expense account of the category (cost center = project if any) — amount
- Cr 1010 / 1020-x — amount. If paid later: at approval Cr 2100 AP; at payment Dr 2100 / Cr cash-bank.
- Budget actual-spend increases at posting.

### 3.6 `VENDOR_BILL_POSTED` and `VENDOR_PAYMENT`

- Bill: Dr expense or 1210 Development WIP or 1200 Land Inventory (by bill line) / Cr 2100 AP (party = vendor).
- Payment: Dr 2100 AP / Cr cash-bank.

### 3.7 `BOOKING_CANCELLED` + `REFUND_PAID`

Paid amount `Pd`, deduction `X = Pd × cancellation_deduction_rate` (or the per-case amount approved), refund `F = Pd − X`.

- On approval of cancellation, **journal 1 — reverse the original sale:**
  - If revenue was recognized: Dr 4100 Sales Revenue (`P − VAT` if VAT was charged, else `P`).
  - If revenue was unearned: Dr 2600 Unearned Sales Revenue (`P − VAT` if VAT was charged, else `P`).
  - If VAT was charged: Dr 2400 VAT / Tax Payable `VAT`.
  - Cr 1100 Customer Receivable `P`. The customer's receivable balance is now a credit of `Pd` (what they paid).
- **Journal 2 — settle that credit:** Dr 1100 Customer Receivable `Pd` / Cr 4300 Cancellation Deduction Income `X` / Cr 2500 Refunds Payable `F`. (Debit `Pd` = credits `X + F`; the customer's 1100 balance is now 0.)
- On `REFUND_PAID`: Dr 2500 Refunds Payable `F` / Cr cash-bank `F`.
- Property status per policy (`Available` or `Blocked`), agreement locked record kept.
  Acceptance test (from `prd.md` §12): paid 10,00,000, deduction 1,00,000 → refund 9,00,000, all steps audit-logged, statement equals AR ledger.

### 3.8 `COMMISSION_APPROVED` / `COMMISSION_PAID`

Posting occurs strictly on approval (`COMMISSION_APPROVED`), never at `Earned` (draft lead) stage, preventing double-posting:

- Approved: Dr 5400 Commission Expense / Cr 2300 Commission Payable (party = broker).
- Paid: Dr 2300 / Cr cash-bank.

### 3.9 `CASH_TRANSFER`

- Dr destination cash/bank / Cr source cash/bank (always balanced, same amount).

### 3.10 `LAND_PURCHASE`, `DEVELOPMENT_COST` and `COST_OF_LAND_SOLD`

- Land purchase (price + registration/legal): Dr 1200 Land Inventory / Cr cash-bank or 2100.
- Development cost: Dr 1210 (by project cost center) / Cr cash-bank or 2100.
- `COST_OF_LAND_SOLD` (Trigger: handover completed / `HANDOVER_COMPLETED`): The sold portion moves from WIP to expense: Dr 5100 Cost of Land Sold / Cr 1210 Development WIP (allocated via `sq ft sold ÷ total saleable sq ft × project WIP balance`).

### 3.11 `PERIOD_CLOSE`

No journal by itself. Year-end closing (income/expense to 3900 Retained Earnings) is a manual, permissioned journal in v1.

## 4. Derived figures (must reconcile — tests required)

- **Customer statement:** `Opening + Sales/Charges − Payments − Adjustments = Outstanding`, and equals the balance of account 1100 filtered by that customer party. Test: after a booking, two partial payments, and a reversal, statement == AR ledger.
- **Ledger** is a query over `journal_lines`, never a separate mutable table.
- **Trial balance** total debits == total credits for any date range.
- **AR aging** buckets (`1–7, 8–30, 31–60, 61–90, 90+`) sum to 1100's balance.

## 5. Installment math (pure functions, unit-tested)

`remaining = P − B`; `n` installments; `base = remaining ÷ n` distributed strictly via `Money.allocate` (largest-remainder algorithm: integer quotient to each installment, remainder distributed 1 paisa each to the earliest installments so parts sum to `remaining` exactly). Due dates: monthly from the first due date unless a custom plan is supplied. Status is recomputed nightly by the `overdue-calculation` job and on every payment.
