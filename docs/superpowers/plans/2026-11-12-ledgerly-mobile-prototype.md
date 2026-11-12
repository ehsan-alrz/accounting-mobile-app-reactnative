# Ledgerly Mobile Prototype — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Ledgerly Android prototype (React Native + TypeScript + Expo) with a real double-entry engine, 27 screens, two languages, two themes, and the 21 seed invariants — without a backend.

**Architecture:** Pure TypeScript domain (money, postings, reversal, subledger, reports) → application use cases + async repository contracts → in-memory infrastructure with delay/error injection → React Native presentation (design system, providers, Zustand stores, React Navigation). Domain never imports React; screens never contain accounting rules.

**Tech Stack:** Expo (managed), React Native, TypeScript (strict), React Navigation (no Expo Router), Zustand, React Context, AsyncStorage, Jest, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-12-ledgerly-mobile-prototype-design.md` — the executor reads both this plan and the spec; every task below cites its spec section.

---

## Global Constraints

- React Native + TypeScript + **Expo**, **no Expo Router**; React Navigation with typed param lists.
- Android first; mobile from **320dp**; touch targets ≥ 44dp (48dp for primary actions).
- Mock data only: **no backend, auth, DB, network, external services**.
- **Single company**; no multi-client/accounting-firm features.
- Money is **integer minor units** (`amountMinor`); **no floats**; `qtyMilli`; one **Half-Up** rounding per line; all multiplication/division via **BigInt internally** with `Number.isSafeInteger` checks.
- Limits: document total ≤ **10,000,000,000** minor; unit price ≤ **1,000,000,000**; `qtyMilli` 1…**1,000,000,000**; tax rate 0…**10,000** bp; discount ≤ line gross. Violations → `LIMIT_EXCEEDED`.
- Tax rate is **configurable**, default **1500 bp (15%)**, never hardcoded in screens; one rate per document; invoices exclusive, expenses inclusive/exclusive.
- Entries are **immutable**; correction is an independent **reversal** entry; all entries are posted; `isReversed` is only a marker; reports read **all entries** including reversals.
- Subledger is **derived** from `JournalEntryLine.partyId`; `partyId` is **required on 1120/2100** and **forbidden elsewhere**; party balances never stored.
- Reports (6): Trial Balance, Income Statement, Balance Sheet, VAT Summary, Aging (AR/AP tabs), Cash Movement — all derived from posted entries.
- 4 tabs (الرئيسية، الفواتير، التقارير، المزيد) + persistent **“+”** bottom sheet (sales, purchase, expense, receipt/payment, small transfer option).
- Arabic + English, immediate RTL/LTR switching with logical `start/end`; **Latin numerals in both** (`128,450.00`); SAR symbol after amount in Arabic, before in English.
- Light + deliberately designed dark theme (`#0E7C66` primary, `#C8963C` alert-only, IBM Plex Sans Arabic / IBM Plex Sans).
- Seed company **«شركة النور للتجارة»**, SAR, tax 15%, **demoToday = 12 Nov 2026**, **18 accounts**, 21 invariants.
- No automated E2E; Jest (domain, application, contracts, seed) + RNTL (behavior). Tests do not inspect Zustand or React Navigation internals.
- Decision table (42 decisions) and “out of scope” section of the spec are binding; do not re-open them.

## Review Focus

These five conditions are implied by the spec but not guaranteed by its happy-path flows. Each has a named test in the task that owns the code.

1. **Zero tax and zero discount documents** — posting must create **no zero-amount line**, and totals must remain exact (Task 7, Task 8, Task 19).
2. **As-of reporting after reversal or backdated allocation** — an October report must still see the original invoice until the November reversal, while today’s report sees net zero (Task 11, Task 16, Task 19).
3. **Near-limit quantity × price** — a product above `MAX_SAFE_INTEGER` must fail with `LIMIT_EXCEEDED`, never silently lose precision (Task 3, Task 7).
4. **Dual-role party** — AR and AP balances stay separate, never netted, and each matches its control account (Task 6, Task 13, Task 19).
5. **Runtime RTL/LTR switch** — layout, chevrons, currency position, and bidi isolation change without restart and without reversed numbers (Task 30, Task 46).

---

## Plan Conventions

- Every task follows: **write failing test → run it (expect FAIL) → implement minimal code → run (expect PASS) → commit**.
- Test files live next to sources: `*.test.ts` (domain/application/core) and `*.test.tsx` (components).
- Commands (defined in Task 1): `npm test`, `npm run typecheck`, `npm run lint`, `npx jest <path> -t "<name>"`.
- Domain tests use builders from `src/infrastructure/testing/builders.ts`; repository tests use fakes from `src/infrastructure/testing/fakes.ts`.
- Tests use a fixed clock (`2026-11-12T09:00:00Z`) and sequential IDs; artificial delay is **0** in tests.
- Arabic UI copy lives in `src/core/i18n/keys.ts` + locale files; no Arabic or English literals inside accounting logic.
- Any write goes through a use case; stores hold `status/data/error/lastUpdated` only.
- Commit messages: `feat:`, `fix:`, `test:`, `chore:`; one commit per task.
- Do **not** modify the approved design document.

## Shared Types (locked before tasks)

```ts
// src/core/money/money.ts
export type Currency = { code: string; symbolAr: string; symbolEn: string; decimals: number };
export type Money = { amountMinor: number; currency: Currency };

// src/core/result/result.ts
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

// src/core/errors/appError.ts
export type AppErrorCode =
  | 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'POSTING_FAILED'
  | 'IMMUTABLE' | 'INSUFFICIENT_BALANCE' | 'LIMIT_EXCEEDED'
  | 'SIMULATED_NETWORK' | 'UNKNOWN';
export type AppError = {
  code: AppErrorCode; messageKey: string;
  field?: string; details?: Record<string, unknown>;
};

// domain primitives
export type Quantity = { milli: number };
export type TaxRate = { basisPoints: number };
export type PartyRole = 'customer' | 'supplier';
export type InvoiceKind = 'sales' | 'purchase';
export type InvoiceStatus = 'draft' | 'posted' | 'partiallyPaid' | 'paid';
export type ExpenseTaxMode = 'exclusive' | 'inclusive';
export type DocumentSourceType =
  | 'invoice.sales' | 'invoice.purchase' | 'expense'
  | 'payment.receipt' | 'payment.supplier' | 'transfer' | 'opening';

export type JournalLine = {
  accountId: string;
  partyId?: string;
  sourceDocumentId?: string;
  taxRateBp?: number;
  debitMinor: number;
  creditMinor: number;
};
export type JournalEntry = {
  id: string; number: string; date: string; postedAt: string;
  source: { type: DocumentSourceType; id: string };
  lines: JournalLine[];
  isReversed: boolean;
  reversalOf?: string; reversedBy?: string;
};

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
```

Control accounts are configuration, not magic numbers:

```ts
export type ControlAccounts = { accountsReceivableId: string; accountsPayableId: string };
```

All report functions accept `controlAccounts` and `accounts`; no report hardcodes `'1120'` or `'2100'`.

---

## File Map

```
src/
  app/                    App.tsx, providers.tsx, composition.ts, storage.ts
  core/
    money/                money.ts, rounding.ts, limits.ts
    quantity/             quantity.ts
    tax/                  taxRate.ts
    dates/                dates.ts
    result/               result.ts
    errors/               appError.ts, mapError.ts
    ids/                  idGenerator.ts
    clock/                clock.ts
    i18n/                 keys.ts, ar.ts, en.ts
    format/               formatMoney.ts, formatDate.ts, formatQuantity.ts, bidi.ts
  domain/
    accounts/             account.ts
    parties/              party.ts
    items/                item.ts
    invoices/             invoice.ts, invoiceTotals.ts, invoiceStatus.ts
    journal/              buildEntry.ts, postings.ts, reversal.ts, currentEntry.ts
    payments/             payment.ts, allocations.ts
    expenses/             expense.ts, expenseAmounts.ts
    transfers/            transfer.ts
    subledger/            partyBalances.ts
    reports/              trialBalance.ts, incomeStatement.ts, balanceSheet.ts,
                          vatSummary.ts, aging.ts, cashMovement.ts
    shared/               controlAccounts.ts, documentSeries.ts
  application/
    contracts/            invoiceRepository.ts, partyRepository.ts, itemRepository.ts,
                          accountRepository.ts, journalRepository.ts, paymentRepository.ts,
                          settingsRepository.ts, activityRepository.ts, numberingRepository.ts,
                          filters.ts
    usecases/             invoices/, expenses/, payments/, transfers/, parties/,
                          reports/, settings/, activity/
    services/             numbering.ts, activityLog.ts, resetDemoData.ts, invoiceView.ts
    validation/           validateInvoiceDraft.ts, validateAllocations.ts, validateLimits.ts
  infrastructure/
    persistence/          inMemoryStore.ts
    repositories/         inMemoryInvoiceRepository.ts, … (one per contract)
    testing/              builders.ts, fakes.ts, delay.ts, errorInjection.ts, fixedClock.ts
    seed/                 accounts.ts, parties.ts, items.ts, settings.ts,
                          openingEntry.ts, documents.ts, seed.ts
  features/
    dashboard/            screens/, components/, hooks/, store.ts
    invoices/             screens/, components/, hooks/, store.ts
    parties/              screens/, components/, hooks/, store.ts
    transactions/         screens/, components/, hooks/, store.ts
    cash/                 screens/, components/, hooks/, store.ts
    accounts/             screens/, components/, hooks/, store.ts
    reports/              screens/, components/, hooks/, store.ts
    activity/             screens/, hooks/, store.ts
    settings/             screens/, components/, hooks/, store.ts
  navigation/             RootStack.tsx, Tabs.tsx, types.ts, useDirtyFormGuard.ts
  design-system/
    tokens/               colors.ts, spacing.ts, radii.ts, shadows.ts, typography.ts
    primitives/           AppButton.tsx, IconButton.tsx, ScreenHeader.tsx, TextField.tsx,
                          MoneyField.tsx, NumberField.tsx, DateField.tsx, SelectField.tsx,
                          SearchField.tsx, Card.tsx, ListRow.tsx, SectionHeader.tsx,
                          KpiTile.tsx, AmountText.tsx, StatusChip.tsx, SegmentedControl.tsx,
                          BottomTabBar.tsx, Fab.tsx, QuickAddSheet.tsx, PartyPicker.tsx,
                          FilterSheet.tsx, PeriodPicker.tsx, DataTable.tsx, TotalsPanel.tsx,
                          EntryLinesTable.tsx, LedgerEntryCard.tsx, AuditTimeline.tsx,
                          EmptyState.tsx, ErrorState.tsx, Skeleton.tsx, Snackbar.tsx,
                          ConfirmSheet.tsx, StepBadge.tsx, BalanceBadge.tsx
    icons/                index.tsx
    charts/               CashSparkline.tsx
```

---

## Phase Dependencies

| Phase | Depends on | Produces |
|---|---|---|
| 0 Bootstrap | — | runnable Expo shell + test harness |
| 1 Core | 0 | Money/limits/format/Result |
| 2 Domain | 1 | postings, reversal, subledger, 6 reports |
| 3 Seed | 2 | full demo dataset + 21 invariants |
| 4 Application | 2, 3 | use cases + repository contracts |
| 5 Infrastructure | 4 | in-memory repos + contract tests |
| 6 Design system & shell | 1 | tokens, providers, primitives, navigation |
| 7 State & screens | 4, 5, 6 | 27 screens, 7 flows |
| 8 Behavior & polish | 7 | component tests, accessibility, manual demo |
| 9 Sign-off | 8 | full suite + review gate |

Phases 4–5 and 6 may overlap in calendar time, but tasks inside each phase are sequential.

---

## Phase 0 — Bootstrap

### Task 1: Expo project, scripts, strict TypeScript, Jest

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `jest.config.js`, `jest.setup.ts`, `.eslintrc.js`, `.prettierrc`, `.gitignore`
- Create: `src/app/App.tsx`, `src/app/providers.tsx`
- Create: `src/infrastructure/testing/fixedClock.ts`, `src/infrastructure/testing/fakes.ts` (empty shell)

**Interfaces:**
- Produces: scripts `test`, `typecheck`, `lint`, `start`, `android`; path alias `@/* → src/*`; Jest + RNTL environment.
- Produces: `fixedClock(at = '2026-11-12T09:00:00.000Z'): Clock`, `FakeIds` sequential.

- [ ] **Step 1: Initialize project and files.** Expo blank TypeScript template (no router), `strict: true`, `noUncheckedIndexedAccess: true`, Jest preset `jest-expo`, `@testing-library/react-native`, `ts-jest`/babel transform, test setup with `@testing-library/jest-native`.
- [ ] **Step 2: Add a smoke test** `src/app/App.test.tsx` asserting `render(<App />)` shows `Ledgerly` and no console error.
- [ ] **Step 3: Run** `npm test -- --runInBand` — expect PASS; `npm run typecheck` — expect PASS; `npm run lint` — expect PASS.
- [ ] **Step 4: `git init` and commit** `chore: bootstrap expo app with jest and strict types`.

### Task 2: Result, AppError, Clock, IDs, test builders skeleton

**Files:**
- Create: `src/core/result/result.ts`, `src/core/errors/appError.ts`, `src/core/errors/mapError.ts`, `src/core/clock/clock.ts`, `src/core/ids/idGenerator.ts`
- Create: `src/infrastructure/testing/builders.ts`
- Test: `src/core/errors/appError.test.ts`, `src/core/ids/idGenerator.test.ts`

**Interfaces:**
- Produces: `ok(value)`, `err(code, messageKey, field?, details?)`, `isOk`, `mapError`.
- Produces: `Clock { now(): string; today(): string }`, `IdGenerator { next(prefix: string): string }`.
- Produces: builders `anAccount`, `aParty`, `aJournalEntry`, `anInvoice`, `aPayment`, `anExpense`, `aTransfer` with valid defaults.

- [ ] **Step 1: Write failing tests** asserting `result.ok` narrows, `err` carries code/field, IDs are unique and prefixed (`INV-0001`).
- [ ] **Step 2: Run** `npx jest src/core/ids/idGenerator.test.ts -t "is unique"` — expect FAIL.
- [ ] **Step 3: Implement** Result, AppError, clock, sequential IDs, builders returning overridable objects.
- [ ] **Step 4: Run** full test suite — expect PASS.
- [ ] **Step 5: Commit** `feat: add result, errors, clock and test builders`.

**Phase 0 review gate:** app renders; `npm test`, `typecheck`, `lint` pass; no domain code yet.

---

## Phase 1 — Core Numeric and Formatting

### Task 3: BigInt rounding, limits, Money arithmetic

**Files:**
- Create: `src/core/money/limits.ts`, `src/core/money/rounding.ts`, `src/core/money/money.ts`
- Test: `src/core/money/rounding.test.ts`, `src/core/money/money.test.ts`

**Interfaces:**
- Produces: `LIMITS` (exact values from spec §8.2), `roundHalfUp(numerator: bigint, denominator: bigint): number`, `assertSafeMinor(n: number): number`.
- Produces: `money(amountMinor, currency): Money`, `addMoney`, `subMoney`, `negMoney`, `sumMoney`, `mulQtyPrice(qtyMilli, unitPriceMinor): number` (BigInt internally), `formatMinor` is **not** here (Task 5).
- Throws: `MoneyError` (`code: 'LIMIT_EXCEEDED' | 'INVALID_MONEY'`), mapped by `mapError` to `AppError`.

- [ ] **Step 1: Write failing tests**:
  - `roundHalfUp(5n, 2n) === 3`, `roundHalfUp(4n, 2n) === 2`, `roundHalfUp(-5n, 2n) === -3` (half away from zero for negatives).
  - `mulQtyPrice(3000, 33333) === 99999` (3 × 333.33).
  - `mulQtyPrice(1_000_000_000, 1_000_000_000)` throws `LIMIT_EXCEEDED` (product 1e18).
  - `assertSafeMinor(10_000_000_000)` passes; `10_000_000_001` throws.
  - `money(Number.MAX_SAFE_INTEGER + 1, sar)` throws.
- [ ] **Step 2: Run** `npx jest src/core/money -t "throws"` — expect FAIL.
- [ ] **Step 3: Implement** BigInt arithmetic and a single rounding function; no `Math.round` anywhere; `LIMITS` exported as frozen objects.
- [ ] **Step 4: Run** `npx jest src/core/money` — expect PASS.
- [ ] **Step 5: Commit** `feat: add bigint money primitives and limits`.

### Task 4: Quantity, TaxRate, Currency, date keys

**Files:**
- Create: `src/core/quantity/quantity.ts`, `src/core/tax/taxRate.ts`, `src/core/dates/dates.ts`
- Test: `src/core/quantity/quantity.test.ts`, `src/core/tax/taxRate.test.ts`, `src/core/dates/dates.test.ts`

**Interfaces:**
- Produces: `quantity(milli)`, `qtyFromDecimal(text)` (≤3 decimals), `qtyToDecimal`.
- Produces: `taxRate(basisPoints)`, `taxRateFromPercent(15) === 1500`, `percentLabel(1500) === '15%'`.
- Produces: `SAR` currency (`decimals: 2`, `symbolAr: 'ر.س'`, `symbolEn: 'SAR'`).
- Produces: `addDays(date, n)`, `compareDates`, `monthRange`, `quarterRange`, `yearRange`, `customRange`, `isValidDateKey` (`YYYY-MM-DD`), `daysBetween`.

- [ ] **Step 1: Write failing tests** for 3-decimal parsing, `addDays('2026-11-12', 30) === '2026-12-12'`, month/quarter ranges, and rejection of `1.2345`.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add quantity, tax rate, currency and date keys`.

### Task 5: Formatting and bidi isolation

**Files:**
- Create: `src/core/format/formatMoney.ts`, `formatDate.ts`, `formatQuantity.ts`, `bidi.ts`
- Test: `src/core/format/formatMoney.test.ts`, `formatDate.test.ts`

**Interfaces:**
- Produces: `formatMoney(money, locale: 'ar'|'en'): string` → `5,520.00 ر.س` / `SAR 5,520.00`; negatives `−8,000.00` (U+2212), no parentheses.
- Produces: `formatNumber(value)`, `formatPercent(1500)` → `15%`, `formatDate(dateKey, locale)` → `12 نوفمبر 2026` / `12 Nov 2026`, short `12/11/2026`.
- Produces: `isolateBidi(text): string` wrapping numbers/dates/currency/party names with Unicode isolates.

- [ ] **Step 1: Write failing tests** for exactly `128,450.00`, Arabic currency suffix vs English prefix, Latin digits in both locales, minus sign, 2 decimals, date formats, and `isolateBidi('INV-2026-0042')` containing U+2068/U+2069.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add locale-aware formatting and bidi isolation`.

**Phase 1 review gate:** all core tests pass; grep confirms no `Math.round`, no `parseFloat` in money math, no hardcoded `'15%'` in domain; `typecheck` clean.

---

## Phase 2 — Domain: Posting, Reversal, Subledger, Reports

### Task 6: Account, Party (roles), Item, control accounts

**Files:**
- Create: `src/domain/accounts/account.ts`, `src/domain/parties/party.ts`, `src/domain/items/item.ts`, `src/domain/shared/controlAccounts.ts`
- Test: `src/domain/parties/party.test.ts`, `src/domain/accounts/account.test.ts`

**Interfaces:**
- Produces: `Account { id, code, nameAr, nameEn, type, normalBalance, parentId?, isActive }`, `isRevenue`, `isExpense`, `isAsset`, `isControlAccount(account, control)`.
- Produces: `Party { id, roles: PartyRole[], name, phone?, email?, taxNumber?, address?, notes? }`, `hasRole`, `roleLabelKey`.
- Produces: `Item { id, nameAr, nameEn, kind, unit, defaultPriceMinor, defaultSalesAccountId, defaultPurchaseAccountId, isActive }`.
- Produces: `ControlAccounts { accountsReceivableId, accountsPayableId }`.

- [ ] **Step 1: Write failing tests**: dual-role party `hasRole` true for both; removal of a role with open balance is rejected by a pure guard `assertRoleRemovable(role, hasOpenBalance)`; control account detection by id, not code.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add account, party roles and item entities`.

### Task 7: Invoice line math and document totals

**Files:**
- Create: `src/domain/invoices/invoice.ts`, `src/domain/invoices/invoiceTotals.ts`
- Test: `src/domain/invoices/invoiceTotals.test.ts`

**Interfaces:**
- Produces: `computeLineTotals(line: {qtyMilli, unitPriceMinor, discountMinor}): { grossMinor, netMinor }`.
- Produces: `computeInvoiceTotals(lines, taxRateBp): { subtotalMinor, discountMinor, taxableMinor, taxMinor, totalMinor, lines }`.
- Rules: gross rounds once; discount subtracts after rounding; tax on `taxable = subtotal − discount`; zero tax/discount produce no extra values.

- [ ] **Step 1: Write failing tests**:
  - 3 × 333.33, discount 0.99 → gross 99,999, net 99,900, tax 14,985, total 114,885.
  - Two lines with different discounts → subtotal/discount/taxable equal line sums.
  - Zero-discount lines leave `discountMinor === 0`; zero tax leaves `taxMinor === 0`.
  - Discount > gross throws `VALIDATION`.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add invoice line and total calculations`.

### Task 8: Journal entry builder and invariants

**Files:**
- Create: `src/domain/journal/buildEntry.ts`
- Test: `src/domain/journal/buildEntry.test.ts`

**Interfaces:**
- Produces: `buildEntry(input: { id, number, date, postedAt, source, lines }, controlAccounts): JournalEntry`.
- Validates: at least 2 lines; every line has exactly one positive side; no zero line; debits = credits; no duplicate account+party+source line? (allowed, not merged); `partyId` required on control accounts and forbidden elsewhere; `taxRateBp` allowed only on `1150/2200` and taxable base accounts, forbidden on control/equity.
- Produces: `assertEntryBalanced(entry)` and `entryImmutabilityError()` → `IMMUTABLE`.

- [ ] **Step 1: Write failing tests**: unbalanced entry rejected with `POSTING_FAILED`; line with both debit and credit rejected; line with 0 rejected; AR line without `partyId` rejected; revenue line with `partyId` rejected; tax line without `taxRateBp` on 2200 rejected? (2200 requires `taxRateBp`); valid sales entry accepted.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add balanced journal entry builder`.

### Task 9: Posting rules for all documents

**Files:**
- Create: `src/domain/journal/postings.ts`
- Test: `src/domain/journal/postings.test.ts`

**Interfaces:**
- Produces: `postSalesInvoice(invoice, accounts, control, taxRateBp): JournalLine[]`.
- Produces: `postPurchaseInvoice`, `postExpense`, `postReceipt`, `postSupplierPayment`, `postTransfer`, `postOpening`.
- Rules: AR/AP totals with `partyId`; per-line revenue/expense/asset accounts; 2200 output / 1150 input with `taxRateBp`; no tax line when 0; reversal lines copy dimensions.

- [ ] **Step 1: Write failing tests**:
  - Sales 11,000 + 1,650 → debit AR 12,650 with party; credit revenue 11,000; credit 2200 1,650 with rate.
  - Purchase line account asset vs expense both credit AP total.
  - Expense inclusive 1,150 → debit expense 1,000, debit 1,150? No: debit input tax 150, credit bank 1,150.
  - Receipt 12,650 → debit bank, credit AR with party.
  - Transfer bank→cash → debit cash, credit bank.
  - Zero-tax invoice has no 2200 line.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add posting rules for invoices, expenses and payments`.

### Task 10: Reversal and re-posting helpers

**Files:**
- Create: `src/domain/journal/reversal.ts`, `src/domain/journal/currentEntry.ts`
- Test: `src/domain/journal/reversal.test.ts`

**Interfaces:**
- Produces: `buildReversal(original, { id, number, date, postedAt }): JournalEntry` — swaps sides, copies `partyId`, `sourceDocumentId`, `taxRateBp`; sets `reversalOf`.
- Produces: `markReversed(original, reversalId): JournalEntry`.
- Produces: `nextPostingSeries(postingEntryIds, newEntryId): { postingEntryIds, currentEntryId }`, `clearCurrentEntry`.
- Rules: cannot reverse an already reversed or unposted document; reversal date = execution date.

- [ ] **Step 1: Write failing tests**: line-by-line mirror; source and dimensions preserved; reversing reversed entry → `CONFLICT`; series keeps all entries and sets one current; clearing sets `currentEntryId` undefined.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add reversal and posting series helpers`.

### Task 11: Payment allocations, invoice status, as-of filter

**Files:**
- Create: `src/domain/payments/payment.ts`, `src/domain/payments/allocations.ts`, `src/domain/payments/activeAllocations.ts`, `src/domain/invoices/invoiceStatus.ts`
- Test: `src/domain/payments/allocations.test.ts`, `src/domain/invoices/invoiceStatus.test.ts`

**Interfaces:**
- Produces: `PaymentAllocation { invoiceId, amountMinor }`, `Payment { id, number, kind, partyId, allocations, amountMinor, date, method, accountId, entryId, status, reversalEntryId?, reversedAt? }`.
- Produces: `validateAllocations(payment, invoices): Result<void>` — each > 0, ≤ remaining at creation, sum = payment amount, same party, invoice open.
- Produces: `allocationsActiveAt(payment, asOf): PaymentAllocation[]` — payment date ≤ asOf and (`reversedAt` absent or > asOf).
- Produces: `deriveInvoiceStatus(invoice, activeAllocatedMinor): InvoiceStatus` — draft stays draft; posted/partial/paid otherwise.

- [ ] **Step 1: Write failing tests**: partial 1,500 on 3,450 → `partiallyPaid`; full → `paid`; over-allocation rejected; two invoices different parties rejected; allocation ignored after `reversedAt` at later as-of, still counted at earlier as-of.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add payment allocation and invoice status rules`.

### Task 12: Expense tax modes

**Files:**
- Create: `src/domain/expenses/expense.ts`, `src/domain/expenses/expenseAmounts.ts`
- Test: `src/domain/expenses/expenseAmounts.test.ts`

**Interfaces:**
- Produces: `Expense { id, number, categoryAccountId, netMinor, taxMinor, totalMinor, taxRateBp, taxMode, amountEnteredMinor, accountId, date, entryId, status, reversalEntryId?, reversedAt?, notes? }`.
- Produces: `computeExpenseAmounts({ taxMode, enteredMinor, basisPoints }): { netMinor, taxMinor, totalMinor }`.

- [ ] **Step 1: Write failing tests**: exclusive 1,000 @15% → 1,000/150/1,150; inclusive 1,150 @15% → 1,000/150/1,150; inclusive 460 @15% → 400/60/460; `net + tax === total` always; total 0 rejected.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add expense tax modes`.

### Task 13: Subledger projection and control matching

**Files:**
- Create: `src/domain/subledger/partyBalances.ts`
- Test: `src/domain/subledger/partyBalances.test.ts`

**Interfaces:**
- Produces: `partyBalances(entries, { role, asOf, controlAccounts }): Map<partyId, number>` — sum of debit−credit on the role’s control account, entries with `date ≤ asOf`.
- Produces: `partyStatement(entries, partyId, { role, asOf })` → running rows.
- Produces: `assertControlMatch(entries, accounts, controlAccounts, asOf): { ar: number; ap: number; matches: boolean }`.
- Dual-role: role selects one control account only; no netting.

- [ ] **Step 1: Write failing tests**: two customers sum to AR; supplier sum to AP; dual-role party has independent AR/AP; line without `partyId` on control excluded but match fails with a specific error; as-of before a receipt differs from after; reversal restores pre-reversal balance at today, original balance at earlier date.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add subledger projection and control matching`.

### Task 14: Trial balance, income statement, balance sheet

**Files:**
- Create: `src/domain/reports/trialBalance.ts`, `src/domain/reports/incomeStatement.ts`, `src/domain/reports/balanceSheet.ts`
- Test: `src/domain/reports/financialStatements.test.ts`

**Interfaces:**
- Produces: `trialBalance(entries, accounts, { asOf }): { rows, totalDebit, totalCredit, balanced }`.
- Produces: `incomeStatement(entries, accounts, { from, to, compareFrom, compareTo }): { revenue, expenses, netProfit, previous? }`.
- Produces: `balanceSheet(entries, accounts, { asOf, periodStart }): { assets, liabilities, equity, retainedEarnings, periodProfit, equation: { left, right, balanced } }`.

- [ ] **Step 1: Write failing tests**: balanced trial balance; revenue−expense = profit; assets = liabilities + equity + period profit; reversal entries included; as-of 31 Oct sees INV-0039, as-of today does not; empty period → zeros with empty rows.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add trial balance, income statement and balance sheet`.

### Task 15: VAT summary and cash movement

**Files:**
- Create: `src/domain/reports/vatSummary.ts`, `src/domain/reports/cashMovement.ts`
- Test: `src/domain/reports/vatSummary.test.ts`, `cashMovement.test.ts`

**Interfaces:**
- Produces: `vatSummary(entries, accounts, { from, to }): { salesBase, outputTax, purchaseBase, inputTax, netDue, reconciled }`.
- Produces: `cashMovement(entries, accounts, { from, to, cashAccountIds }): { opening, inflows, outflows, closing, rows }`.
- VAT: output = net credit movement on 2200; input = net debit on 1150; bases = sums of lines with `taxRateBp > 0` on revenue / (expense|asset); reconciled compares to tax account movements.
- Cash: opening = balance before `from`; reversal pairs net zero; grouping by source type.

- [ ] **Step 1: Write failing tests**: zero-tax period → zeros, not NaN; VAT reconciles; transfer is neither inflow nor outflow; reversing a receipt removes its inflow; cash closing = opening + inflows − outflows.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add vat summary and cash movement reports`.

### Task 16: Aging report with allocations and opening balances

**Files:**
- Create: `src/domain/reports/aging.ts`
- Test: `src/domain/reports/aging.test.ts`

**Interfaces:**
- Produces: `aging(input: { invoices, payments, openingBalances, asOf, side: 'receivable'|'payable', controlBalance }): { rows, buckets: {current, d0_30, d31_60, d61_90, d90plus}, total, matchesControl }`.
- Rules: open = total − allocations active at asOf; bucket by due date; opening rows dated 2025-12-31 in `d90plus`; `current` for not-due; reversed payments excluded by date; total must equal control balance.

- [ ] **Step 1: Write failing tests**: partial payment lands in `current` with reduced amount; overdue 8/49/54/84/104 days map to 0-30/31-60/31-60/61-90/+90; opening balances in +90; sum of buckets = total = control; payment reversed before asOf restores amount; reversal after asOf does not.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add aging report with as-of allocations`.

**Phase 2 review gate:** all domain tests pass; `grep -r "react" src/domain` returns nothing; every rule in spec §8.5–8.9 has a named test; no report reads a stored balance; typecheck clean.

---

## Phase 3 — Seed Data and Invariants

### Task 17: Seed chart of accounts, settings, parties, items, opening entry

**Files:**
- Create: `src/infrastructure/seed/accounts.ts`, `settings.ts`, `parties.ts`, `items.ts`, `openingEntry.ts`
- Test: `src/infrastructure/seed/openingEntry.test.ts`

**Interfaces:**
- Produces: `seedAccounts(): Account[]` — exactly 18 accounts and codes from spec §9.2, including `5100 المشتريات`.
- Produces: `seedSettings(): CompanySettings` — SAR, 1500 bp, `taxInclusivePricing: false`, prefixes, fiscal year, `demoToday: '2026-11-12'`.
- Produces: `seedParties(): Party[]` — 8 customers, 5 suppliers, «شركة الأنظمة المتكاملة» has both roles.
- Produces: `seedItems(): Item[]` — 6 items with sales/purchase default accounts.
- Produces: `seedOpeningEntry(): JournalEntry` — 2026-01-01, 244,400.00 both sides, AR split 10,000/4,600/3,800 and AP split 9,200/4,800 with `partyId`.

- [ ] **Step 1: Write failing tests**: 18 accounts, unique codes, 5100 named `المشتريات`; opening balanced; AR/AP lines have party dimensions; opening entry sets `source.type = 'opening'`; no VAT or employee payable opening.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: seed accounts, settings, parties and opening balances`.

### Task 18: Seed documents, payments, transfer, reversal series

**Files:**
- Create: `src/infrastructure/seed/documents.ts`, `src/infrastructure/seed/seed.ts`
- Test: `src/infrastructure/seed/seed.test.ts`

**Interfaces:**
- Produces: `buildSeed(): { accounts, parties, items, settings, invoices, payments, expenses, transfers, entries, activity }`.
- Documents exactly as spec §9.4: 10 sales invoices (including 0024, 0031, 0034, 0036, 0038–0040, 0042–0044), 5 purchase invoices (0007, 0011, 0012, 0014, 0015), 4 expenses, 2 receipts, 2 supplier payments, 1 transfer, reversal of INV-0039 dated 2026-11-05.
- All entries built through Task 9 builders; invoice numbers assigned at creation; JE numbers sequential; every AR/AP line carries `partyId` and `sourceDocumentId`.

- [ ] **Step 1: Write failing tests**: 15 invoices with stated totals; INV-0039 has original + reversal, no active entry, status draft; allocations 12,650 / 1,500 / 13,800 / 3,000 within totals; expense 1,150 inclusive stores 1,000/150; transfer 10,000 bank→cash; every document maps to at least one entry except drafts; no zero lines.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: build consistent seed dataset through domain builders`.

### Task 19: The 21 seed invariants

**Files:**
- Create: `src/infrastructure/seed/invariants.test.ts`
- Test: same file, one test per invariant.

**Interfaces:**
- Consumes: `buildSeed()`, domain reports and subledger.

- [ ] **Step 1: Write 21 failing tests**, one named `invariant 1: …` to `invariant 21: …`, matching spec §9.5 exactly:
  1. every entry balanced + trial balance balanced
  2. assets = liabilities + equity + period profit
  3. AR subledger = 1120; AP = 2100
  4. aging AR = 1120; aging AP = 2100
  5. income statement profit = balance sheet period profit
  6. posted invoice has exactly one active non-reversed entry; draft may hold history but no active entry
  7. no entry for deleted invoice; no entry without source
  8. reversal mirrors line by line including dimensions
  9. invoice allocations ≤ total; payment allocations = amount; reversed payment excluded
  10. no negative document amount
  11. AP open derives from purchases − active allocations, not a stored field
  12. reversed document nets zero in cash movement
  13. every purchase line account is active expense or asset
  14. every 1120/2100 line has active `partyId`; no `partyId` elsewhere
  15. opening balanced at 244,400.00 and party splits match
  16. dual-role party balances independent, no netting
  17. all amounts/quantities/rates within limits; safe integers
  18. aging buckets cover each open item exactly once
  19. `net + tax = total` for every document
  20. VAT output/input = 2200/1150 movements; bases match tax-tagged lines
  21. no deleted draft has posting entries
- [ ] **Step 2: Run** `npx jest src/infrastructure/seed/invariants.test.ts` — expect FAIL.
- [ ] **Step 3: Fix seed/domain** (not tests) until all 21 pass; never weaken an invariant to fit data.
- [ ] **Step 4: Run** full suite — expect PASS.
- [ ] **Step 5: Commit** `test: enforce 21 seed accounting invariants`.

**Phase 3 review gate:** 21 invariants pass; every document traced to an entry; opening entry and aging totals match control accounts; seed remains built from domain builders, not hand-written entries.

---

## Phase 4 — Application Layer

### Task 20: Repository contracts and filters

**Files:**
- Create: `src/application/contracts/filters.ts` and 9 contract files.
- Test: `src/application/contracts/contracts.type-test.ts` (compile-time) and `src/application/contracts/filters.test.ts`.

**Interfaces:**
- Produces all contracts, all returning `Promise<Result<T>>`:
  - `InvoiceRepository.list(filter): Page<Invoice>`, `getById`, `save`, `delete`
  - `PartyRepository.list({role?, search?, page})`, `getById`, `save`
  - `ItemRepository.list()`
  - `AccountRepository.list()`, `getById`
  - `JournalRepository.append(entry)`, `list({from?, to?, accountId?, partyId?, sourceType?, sourceId?})`, `getById`
  - `PaymentRepository.list(filter)`, `getById`, `save`
  - `SettingsRepository.get()`, `save()`
  - `ActivityRepository.append(entry)`, `list(filter)`
  - `NumberingRepository.next(kind, year): number`
- Produces filter types: `InvoiceFilter { kind?, status?, from?, to?, partyId?, search?, page, pageSize }`, `TransactionFilter`, `ActivityFilter`.

- [ ] **Step 1: Write failing compile/behavior tests** asserting filters normalize page ≥ 1 and pageSize between 1 and 100, and contracts do not expose storage types.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: define async repository contracts and filters`.

### Task 21: Numbering, activity log, invoice view service

**Files:**
- Create: `src/application/services/numbering.ts`, `activityLog.ts`, `invoiceView.ts`
- Test: `src/application/services/numbering.test.ts`, `activityLog.test.ts`

**Interfaces:**
- Produces: `nextDocumentNumber(numbering, kind, date)` → `INV-2026-0001`; assigned at creation, never reused; `nextEntryNumber` at posting.
- Produces: `recordActivity(repo, { actor, action, entityType, entityId, at, reason?, before?, after? })`.
- Produces: `invoiceView(invoice, entries, payments)` → header + `series` (original/reversal/new) + active entry + paid minor.

- [ ] **Step 1: Write failing tests**: deleted draft leaves a gap; new numbers increment; activity entries append-only; series ordered by date and marks reversed entries; paid total ignores reversed payments.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add numbering, activity and invoice view services`.

### Task 22: Invoice use cases

**Files:**
- Create: `src/application/usecases/invoices/createInvoiceDraft.ts`, `updateInvoiceDraft.ts`, `postInvoice.ts`, `unpostInvoice.ts`, `deleteInvoiceDraft.ts`, `repostInvoice.ts`
- Test: `src/application/usecases/invoices/*.test.ts`

**Interfaces:**
- Produces: `createInvoiceDraft({ kind, partyId, issueDate, dueDate, lines, notes? })`; validates party role; assigns number immediately.
- Produces: `updateInvoiceDraft({ invoiceId, … })`; draft only.
- Produces: `postInvoice({ invoiceId })` → builds one entry, saves, clears nothing, appends activity; simulated failure writes nothing.
- Produces: `unpostInvoice({ invoiceId, reason, at })` → reversal entry, invoice draft, activity; active receipt → `CONFLICT`; already reversed → `CONFLICT`.
- Produces: `deleteInvoiceDraft({ invoiceId })` → only when `postingEntryIds.length === 0`; activity.
- Produces: `repostInvoice({ invoiceId })` → new entry, series append, `currentEntryId` update.

- [ ] **Step 1: Write failing tests** for: create assigns number; posting failure (injected) creates no entry and keeps status; unpost without reason rejected; unpost with active receipt rejected; after unpost, edit allowed and re-post creates a second entry; delete after reversal rejected; delete pristine draft succeeds.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add invoice lifecycle use cases`.

### Task 23: Expense, payment, transfer use cases

**Files:**
- Create: `src/application/usecases/expenses/recordExpense.ts`, `unpostExpense.ts`
- Create: `src/application/usecases/payments/recordReceipt.ts`, `recordSupplierPayment.ts`, `unpostPayment.ts`
- Create: `src/application/usecases/transfers/transferBetweenAccounts.ts`, `unpostTransfer.ts`
- Test: one test file per use case.

**Interfaces:**
- Produces: `recordExpense({ categoryAccountId, taxMode, amountEnteredMinor, taxRateBp, accountId, date, notes? })` → amounts from Task 12, entry from Task 9.
- Produces: `recordReceipt({ partyId, allocations, accountId, date, method, notes? })`; `recordSupplierPayment` mirrors it.
- Produces: `transferBetweenAccounts({ fromAccountId, toAccountId, amountMinor, date, notes? })`; validates balance and different accounts.
- Produces: `unpostExpense`, `unpostPayment`, `unpostTransfer` with reason + reversal entry; payment reversal restores invoice status.
- All append activity and reject re-unpost.

- [ ] **Step 1: Write failing tests**: expense stores explicit net/tax/total; inclusive 1,150; receipt over remaining rejected; receipt reversal reopens invoice; transfer insufficient balance rejected but inverse transfer reversal allowed; unpost reversed → `CONFLICT`.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add expense, payment and transfer use cases`.

### Task 24: Party, account, journal, transaction read use cases

**Files:**
- Create: `src/application/usecases/parties/addParty.ts`, `updateParty.ts`, `getPartyStatement.ts`
- Create: `src/application/usecases/accounts/getAccounts.ts`, `getAccountLedger.ts`
- Create: `src/application/usecases/journal/getInvoiceSeries.ts`, `getEntry.ts`
- Create: `src/application/usecases/transactions/getTransactions.ts`
- Create: `src/application/usecases/subledger/getSubledgerBalances.ts`
- Test: matching test files.

**Interfaces:**
- Produces: `addParty({ roles, name, … })`, `updateParty({ partyId, … })` (role removal blocked with open balance).
- Produces: `getPartyStatement({ partyId, role, asOf })`, `getSubledgerBalances({ role, asOf })`.
- Produces: `getTransactions(filter)` → unified rows `{ type, id, number, date, partyName, amountMinor, status }`.
- Produces: `getInvoiceSeries(invoiceId)`, `getEntry(entryId)`, `getAccountLedger({ accountId, from, to })`.

- [ ] **Step 1: Write failing tests**: unified rows include four document types sorted date desc; party statement running balance; role removal blocked; subledger matches control; account ledger excludes drafts by construction.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add read use cases for parties, accounts and transactions`.

### Task 25: Report use cases, settings, reset

**Files:**
- Create: `src/application/usecases/reports/*.ts` (6 files)
- Create: `src/application/usecases/settings/getSettings.ts`, `updateSettings.ts`, `resetDemoData.ts`
- Test: `src/application/usecases/reports/reports.test.ts`, `settings.test.ts`

**Interfaces:**
- Produces: `getTrialBalance({asOf})`, `getIncomeStatement({from,to,compare})`, `getBalanceSheet({asOf,periodStart})`, `getVatSummary({from,to})`, `getAging({asOf,side})`, `getCashMovement({from,to})` — each loads entries/accounts and delegates to domain.
- Produces: `updateSettings(patch)` (tax rate, theme, locale, numbering, company name), `resetDemoData()` → reseeds stores and clears activity.
- Default periods: as-of today for point-in-time reports; current month for period reports.

- [ ] **Step 1: Write failing tests**: each report returns real seeded values; default period = current month; reset restores seed exactly; settings tax change affects new documents only.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add report, settings and reset use cases`.

**Phase 4 review gate:** use cases contain no JSX; every write appends activity and is idempotent on failure; no screen-facing types leak repositories; error codes match spec §7.7; all use-case tests pass.

---

## Phase 5 — Infrastructure (In-Memory)

### Task 26: In-memory store, latency, error injection

**Files:**
- Create: `src/infrastructure/persistence/inMemoryStore.ts`
- Create: `src/infrastructure/testing/delay.ts`, `errorInjection.ts`
- Test: `src/infrastructure/persistence/inMemoryStore.test.ts`

**Interfaces:**
- Produces: `InMemoryStore<T extends {id:string}>` with `insert`, `update`, `delete`, `get`, `all`, `clear`, `snapshot`.
- Produces: `withLatency(store, ms)` (default 250ms in app, 0 in tests) and `failNext(operationName)` → `SIMULATED_NETWORK` once.

- [ ] **Step 1: Write failing tests**: insert/update/delete; error injection fails exactly once then succeeds; latency 0 resolves synchronously in tests.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add in-memory store with delay and error injection`.

### Task 27: In-memory repositories and contract suite

**Files:**
- Create: 9 `inMemory*Repository.ts` files under `src/infrastructure/repositories/`
- Test: `src/infrastructure/repositories/contracts/*.contract.test.ts` (one per repo)

**Interfaces:**
- Produces: implementations of every Phase 4 contract; all reads clone data (no shared mutable references); pagination deterministic; sort stable (date desc, number desc).
- Produces: a shared `runRepositoryContract(name, factory)` used by every repo test; future API implementations must pass the same suite.

- [ ] **Step 1: Write failing contracts** per repo: insert/read/update/not-found/ordering/pagination/error injection; invoice filter by status/kind/date; journal filter by account/party/source; numbering gaps; activity append-only.
- [ ] **Step 2: Run** `npx jest src/infrastructure/repositories/contracts` — expect FAIL.
- [ ] **Step 3: Implement** repositories; no accounting logic; no global mutable seed.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: implement in-memory repositories with contract tests`.

### Task 28: Composition root, seeding, error mapping

**Files:**
- Create: `src/app/composition.ts`, `src/app/storage.ts` (AsyncStorage adapter)
- Test: `src/app/composition.test.ts`

**Interfaces:**
- Produces: `createApp({ seed?, latencyMs?, clock?, ids? }): { repos, useCases, settings }`; wires all repositories and use cases.
- Produces: `loadSeed()` into stores; `resetDemoData()` uses it.
- Produces: `mapError(error): AppError` with localized `messageKey`.

- [ ] **Step 1: Write failing tests**: composition returns working use cases; seeded app has 18 accounts and 21 invariants still true; reset restores totals; mapping yields `UNKNOWN` fallback.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add composition root and seeded app factory`.

**Phase 5 review gate:** contract suites green for all 9 repositories; no screen code imports a concrete repository; delay is 0 in tests; seed loaded only through composition.

---

## Phase 6 — Design System and App Shell

### Task 29: Tokens, typography, light/dark theme

**Files:**
- Create: `src/design-system/tokens/colors.ts`, `spacing.ts`, `radii.ts`, `shadows.ts`, `typography.ts`, `src/design-system/theme.ts`
- Test: `src/design-system/tokens/theme.test.ts`

**Interfaces:**
- Produces: exact palettes from spec §6.2 (light/dark), spacing scale, radii, shadows (light only), type styles Display…Number.
- Produces: `Theme { color, spacing, radius, shadow, type }`, `lightTheme`, `darkTheme`, `contrastRatio(fg,bg)`.

- [ ] **Step 1: Write failing tests**: token values match spec (`#0E7C66`, `#C8963C`, `#0F1720`, `#16202B`); `contrastRatio` for text/bg ≥ 4.5 in both themes; dark has no shadows; amber not used as primary.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add design tokens and verified themes`.

### Task 30: Locale/theme providers, i18n, RTL rules, persistence

**Files:**
- Create: `src/app/providers.tsx`, `src/core/i18n/keys.ts`, `ar.ts`, `en.ts`, `src/features/settings/locale.ts`
- Test: `src/app/providers.test.tsx`, `src/core/i18n/i18n.test.ts`

**Interfaces:**
- Produces: `AppProviders` with `LocaleProvider`, `ThemeProvider`; `useLocale()` → `{ locale, dir, setLocale, t }`; `useTheme()` → theme + `setTheme`.
- Produces: logical style helpers `start/end`, `isRTL`, icon mirroring rule `mirrorDirectionalIcon(name)`; no `I18nManager.forceRTL`.
- Persists locale/theme in AsyncStorage; immediate switch without restart.

- [ ] **Step 1: Write failing tests**: switch to `en` yields `dir='ltr'`, Arabic strings disappear except party data; switch back instantly; theme persists via mocked AsyncStorage; currencies/numbers unchanged across locales; directional chevron mirrors, search icon does not.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add locale and theme providers with logical direction`.

### Task 31: Primitives batch 1

**Files:**
- Create: `AppButton`, `IconButton`, `ScreenHeader`, `Card`, `ListRow`, `SectionHeader`, `KpiTile`, `AmountText`, `StatusChip`, `SegmentedControl`, `BottomTabBar`, `Fab`, `BalanceBadge`, `StepBadge`
- Test: `src/design-system/primitives/primitives.test.tsx`

**Interfaces:**
- Produces: components with props from spec §6.4; all use theme tokens; accessible labels; min touch targets; `AmountText` uses formatMoney + bidi; `StatusChip` maps invoice/document statuses to localized labels/colors.

- [ ] **Step 1: Write failing tests**: button disabled state blocks press; AmountText renders Arabic suffix/English prefix; StatusChip has accessible label; Fab min 56dp; tab bar shows 4 labels.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add design system primitives batch one`.

### Task 32: Primitives batch 2 — fields, sheets, tables, states

**Files:**
- Create: `TextField`, `MoneyField`, `NumberField`, `DateField` (custom sheet), `SelectField`, `SearchField`, `DataTable`, `TotalsPanel`, `EntryLinesTable`, `LedgerEntryCard`, `AuditTimeline`, `PartyPicker`, `FilterSheet`, `PeriodPicker`, `QuickAddSheet`, `ConfirmSheet`, `EmptyState`, `ErrorState`, `Skeleton`, `Snackbar`
- Test: `src/design-system/primitives/fields.test.tsx`, `tables.test.tsx`

**Interfaces:**
- Produces: `MoneyField` parses to minor units, rejects > 2 decimals, shows live formatted value; `DateField` custom calendar; `DataTable` takes columns/rows and right-aligns numbers at `end`; `TotalsPanel` shows subtotal/discount/VAT/total; `EntryLinesTable` refuses zero lines; `EmptyState`/`ErrorState` have one action.

- [ ] **Step 1: Write failing tests**: MoneyField rejects `12.345`; DateField Arabic month names; DataTable reverse column order in RTL but numbers not mirrored; TotalsPanel 999.00/149.85/1,148.85; Empty ≠ no-results copy; ConfirmSheet requires reason when `reasonRequired`.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add fields, tables, sheets and state components`.

### Task 33: Navigation, tabs, typed params, dirty-form guard

**Files:**
- Create: `src/navigation/types.ts`, `RootStack.tsx`, `Tabs.tsx`, `useDirtyFormGuard.ts`
- Test: `src/navigation/navigation.test.tsx`

**Interfaces:**
- Produces: `RootStackParamList` including `Tabs`, `InvoiceEditor { invoiceId?, kind }`, `InvoiceDetail { invoiceId }`, `PartyDetail { partyId }`, `AccountDetail { accountId }`, `ExpenseDetail`, `PaymentDetail`, `TransferDetail`, `ActivityLog`, settings sub-screens.
- Produces: 4 tabs only; persistent FAB opens `QuickAddSheet`; back after posting returns to detail; dirty form prompts save/discard/continue.

- [ ] **Step 1: Write failing tests**: root stack renders 4 tabs; FAB opens sheet with 5 actions; programmatic navigation to detail uses typed params; dirty guard returns three choices.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add navigation tree and dirty-form guard`.

**Phase 6 review gate:** tokens match spec and pass contrast tests; provider tests prove instant RTL/LTR; primitives have no domain imports; navigation has exactly 4 tabs and typed params; no `left/right` styles in new components (`grep`).

---

## Phase 7 — State and Screens

### Task 34: Zustand store pattern and query hooks

**Files:**
- Create: `src/features/*/store.ts` (8 stores), `src/features/*/hooks/*.ts`, `src/app/hooks/useAsyncAction.ts`
- Test: `src/features/invoices/hooks/useInvoices.test.ts` (with fake use cases)

**Interfaces:**
- Produces: each store `{ status, data, error, lastUpdated }` + setters; no computed accounting.
- Produces: hooks call use cases, set status, expose `{ data, loading, error, reload }`; `useAsyncAction` disables during work and maps errors to `messageKey`.

- [ ] **Step 1: Write failing tests**: loading → success; failure keeps previous data and exposes retry; double submit blocked; store contains no derived totals.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add store pattern and query hooks`.

### Task 35: Dashboard (screen 1)

**Files:**
- Create: `src/features/dashboard/screens/DashboardScreen.tsx`, `components/*`, `hooks/useDashboard.ts`
- Test: `src/features/dashboard/DashboardScreen.test.tsx`

**Interfaces:**
- Consumes: reports/aging/transactions use cases.
- Produces: hero balance card, “مستحق لنا/علينا”, last 5 transactions, shortcuts; states loading/empty/new-company/error/success.

- [ ] **Step 1: Write failing tests**: renders seeded totals; empty-company state when no documents; error state retries; transaction row navigates by type.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add dashboard screen`.

### Task 36: Invoices list and party picker (screens 2, 5)

**Files:**
- Create: `src/features/invoices/screens/InvoicesScreen.tsx`, `components/InvoiceRow.tsx`, `PartyPickerSheet.tsx`, `hooks/useInvoices.ts`
- Test: `src/features/invoices/InvoicesScreen.test.tsx`

**Interfaces:**
- Produces: sales/purchase segmented control, search, status/period filters, list with number/party/total/status; party picker filters by role and can create a customer/supplier inline.

- [ ] **Step 1: Write failing tests**: segment switches data; search empty state differs from empty list; party picker hides suppliers in a sales invoice; inline “add party” returns selection.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add invoices list and party picker`.

### Task 37: Invoice editor (screen 4)

**Files:**
- Create: `src/features/invoices/screens/InvoiceEditorScreen.tsx`, `components/InvoiceLineEditor.tsx`, `TotalsBar.tsx`, `hooks/useInvoiceDraft.ts`
- Test: `src/features/invoices/InvoiceEditorScreen.test.tsx`

**Interfaces:**
- Consumes: create/update/post use cases; money formatting.
- Produces: customer/supplier, dates, multi-line editor (description, qty, price, discount, account for purchase), fixed totals bar, notes, save draft/post, leave guard.
- Purchase line account required; default from item `defaultPurchaseAccountId`; sales default from `defaultSalesAccountId`.

- [ ] **Step 1: Write failing tests**: 3 × 333.33 − 0.99 shows 999.00 + 149.85 = 1,148.85; discount > line blocked; posting failure keeps data and shows retry; zero lines blocks post; purchase line requires account; leaving dirty form prompts.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add invoice editor with live totals`.

### Task 38: Invoice detail and journal (screen 3)

**Files:**
- Create: `src/features/invoices/screens/InvoiceDetailScreen.tsx`, `components/JournalEntryCard.tsx`, `UnpostSheet.tsx`, `hooks/useInvoiceSeries.ts`
- Test: `src/features/invoices/InvoiceDetailScreen.test.tsx`

**Interfaces:**
- Produces: header, lines, totals, payments, actions (post/unpost/edit/delete pristine/view entry); series original/reversal/new; conflict message with route to receipt detail.

- [ ] **Step 1: Write failing tests**: posted shows entry button; unpost requires reason; receipt conflict shows guidance; pristine draft shows delete; draft after reversal hides delete; entry lines balance on screen.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add invoice detail and journal series`.

**Gate 7a (after invoice flows):** create → post → journal → unpost → re-post works against seed; all invoice tests pass; numbers do not change; totals match reports.

### Task 39: Parties list, detail, editor (screens 6–8)

**Files:**
- Create: `src/features/parties/screens/PartiesScreen.tsx`, `PartyDetailScreen.tsx`, `PartyEditorScreen.tsx`, `components/PartyBalanceTabs.tsx`, `hooks/*`
- Test: `src/features/parties/PartiesScreen.test.tsx`

**Interfaces:**
- Produces: customer/supplier segmented lists with control-matching total; detail with AR/AP tabs, opening/running balance, invoices, statement; editor with multi-role checkboxes.

- [ ] **Step 1: Write failing tests**: dual-role party shows two tabs and separate balances; role removal blocked with open balance; new party appears in correct pickers; list totals show match badge.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add party management screens`.

### Task 40: Transactions hub, editors and detail screens (screens 9–12, 23–25)

**Files:**
- Create: `src/features/transactions/screens/TransactionsScreen.tsx`, `ExpenseEditorScreen.tsx`, `PaymentEditorScreen.tsx`, `ExpenseDetailScreen.tsx`, `PaymentDetailScreen.tsx`, `TransferDetailScreen.tsx`, `components/*`, `hooks/*`
- Test: `src/features/transactions/*.test.tsx`

**Interfaces:**
- Produces: unified hub with type/period/status filters and search; rows route to the right detail; expense form with tax mode; receipt/payment form with open invoices and partial allocation; details show entry + reverse with reason.

- [ ] **Step 1: Write failing tests**: hub mixes four types sorted by date; filter by type; expense inclusive shows 1,000/150/1,150; over-allocation blocked; reversal asks reason and refreshes invoice status; reversed document shows badge and no second reverse.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add transactions hub and document details`.

### Task 41: Cash & banks, account detail, transfer editor (screens 11, 13, 14)

**Files:**
- Create: `src/features/cash/screens/CashScreen.tsx`, `TransferEditorScreen.tsx`, `src/features/accounts/screens/AccountDetailScreen.tsx`, `components/*`, `hooks/*`
- Test: `src/features/cash/CashScreen.test.tsx`

**Interfaces:**
- Produces: total cash, account cards, recent movements, transfer button; account detail with period filter and ledger; transfer form validates different accounts and balance.

- [ ] **Step 1: Write failing tests**: cash total equals 1110+1112; insufficient transfer blocked; transfer posting updates both accounts; account ledger respects period.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add cash, account detail and transfer screens`.

### Task 42: Chart of accounts (screens 15)

**Files:**
- Create: `src/features/accounts/screens/ChartOfAccountsScreen.tsx`, `components/AccountTree.tsx`, `hooks/useAccounts.ts`
- Test: `src/features/accounts/ChartOfAccountsScreen.test.tsx`

**Interfaces:**
- Produces: tree/list with balances, search, type filter; row opens AccountDetail; active/inactive styling.

- [ ] **Step 1: Write failing tests**: 18 accounts; search filters; type filter; balance matches trial balance.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add chart of accounts screen`.

### Task 43: Reports hub and six reports (screens 17–22)

**Files:**
- Create: `src/features/reports/screens/ReportsHubScreen.tsx`, `TrialBalanceScreen.tsx`, `IncomeStatementScreen.tsx`, `BalanceSheetScreen.tsx`, `VatSummaryScreen.tsx`, `AgingScreen.tsx`, `CashMovementScreen.tsx`, `components/*`, `hooks/*`
- Test: `src/features/reports/*.test.tsx`

**Interfaces:**
- Produces: report hub cards; period/as-of pickers; trial balance with match badges; AR/AP aging tabs; balanced/not-balanced badges; empty states; drill-down to account detail.
- Defaults: as-of today for TB/BS/aging; current month for IS/VAT/cash.

- [ ] **Step 1: Write failing tests**: TB shows 21-account? no — 18 accounts and balanced badge; AR aging total equals 1120; selecting AP switches totals; VAT net equals 2200−1150; income statement profit equals balance sheet period profit; cash closing matches accounts.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add reports hub and six reports`.

### Task 44: Activity log and settings (screens 16, 26)

**Files:**
- Create: `src/features/activity/screens/ActivityLogScreen.tsx`, `src/features/settings/screens/SettingsScreen.tsx`, `CompanyScreen.tsx`, `TaxScreen.tsx`, `NumberingScreen.tsx`, `AppearanceScreen.tsx`, `LanguageScreen.tsx`, `AboutScreen.tsx`, `hooks/*`
- Test: `src/features/settings/SettingsScreen.test.tsx`

**Interfaces:**
- Produces: activity timeline with actor/action/time/reason; settings for company/tax/numbering/theme/locale/reset/about; reset confirmation sheet.

- [ ] **Step 1: Write failing tests**: activity shows unpost reason; theme switch persists; tax change affects new expense only; reset restores seed and clears activity.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: add activity and settings screens`.

### Task 45: Quick add sheet and app wiring (screens 24/27)

**Files:**
- Create: `src/app/App.tsx` final wiring; `src/features/transactions/components/QuickAddSheet.tsx`
- Modify: `src/app/providers.tsx`
- Test: `src/app/App.test.tsx`, `src/features/transactions/QuickAddSheet.test.tsx`

**Interfaces:**
- Produces: app starts seeded, providers + navigation + persistent FAB; sheet actions: sales invoice, purchase invoice, expense, receipt/payment, small transfer; after save returns to detail with snackbar.

- [ ] **Step 1: Write failing tests**: app boots to dashboard; FAB visible on all 4 tabs; each action opens correct screen; after posting snackbar appears and detail is shown.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Implement**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: wire app shell and quick add flow`.

**Phase 7 gate:** all 27 screens navigable; seven flows from spec §5.5 pass manual smoke; every data screen has loading/empty/no-results/error/success; reports match seeded journals; no console errors.

---

## Phase 8 — Behavior Tests, Accessibility, Polish

### Task 46: RNTL behavior suite

**Files:**
- Create: `src/features/__tests__/behavior.invoice.test.tsx`, `behavior.reports.test.tsx`, `behavior.i18n.test.tsx`, `behavior.states.test.tsx`

**Interfaces:**
- Covers: live totals, disabled posting, field errors, confirmation sheets, RTL/LTR rendering, Arabic/English copy, dark/light render, empty vs no-results, error retry.

- [ ] **Step 1: Write failing tests** for the above behaviors using seeded app and fake use cases.
- [ ] **Step 2: Run** — expect FAIL where behavior missing; fix UI, not tests.
- [ ] **Step 3: Run** full suite — expect PASS.
- [ ] **Step 4: Commit** `test: add behavior coverage for screens`.

### Task 47: Accessibility, small screen, large font, keyboard

**Files:**
- Modify: screens/components where needed.
- Test: `src/design-system/a11y.test.tsx`

**Interfaces:**
- Verifies: 44/48dp targets, ≥8dp spacing, accessible labels on icons, font scale 1.3 no clipping, totals bar above keyboard, reduce-motion respected, live region on status change, 320dp layout.

- [ ] **Step 1: Write failing tests**: icon buttons expose labels; primary action hit slop ≥ 48; text styles use scale; totals bar uses keyboard-avoiding container; table row expands vertically.
- [ ] **Step 2: Run** — expect FAIL; **Step 3: Fix**; **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `fix: meet accessibility and small-screen requirements`.

### Task 48: Manual demo script and final suite

**Files:**
- Create: `docs/superpowers/plans/demo-script.md` (12 steps from spec §10)
- Test: full suite + manual run.

**Interfaces:**
- Produces: documented 12-step scenario: invoice → post → journal → unpost → re-post → report → language → theme → reversal → aging → reset.

- [ ] **Step 1: Write the demo script** with expected screen/values at each step.
- [ ] **Step 2: Run** `npm test -- --runInBand`, `npm run typecheck`, `npm run lint` — expect all PASS.
- [ ] **Step 3: Run the app on Android**, execute 12 steps, verify no console errors/key warnings, 320dp and font scale 1.3.
- [ ] **Step 4: Commit** `docs: add manual demo script and final verification`.

**Phase 8 gate (final):** all tests green; 21 invariants green; manual demo complete; light/dark and ar/en verified; no unresolved TODO in accounting rules.

---

## Traceability

| Spec area | Tasks |
|---|---|
| §5.1–5.3 principles/navigation | 33, 35–45 |
| §5.4 screens 1–27 | 35–45 |
| §5.5 flows أ–ز | 36–43 |
| §5.6–5.8 states/a11y/lang | 31–32, 46–47 |
| §6 design system | 29–32 |
| §7 architecture/layers | 2, 20–28, 34 |
| §8.1–8.4 entities/value objects | 3–7 |
| §8.5 posting rules | 8–9 |
| §8.6 reversal/re-posting | 10, 22, 23 |
| §8.7 reports | 14–16 |
| §8.8 validation | 8, 11–12, 22–23 |
| §8.9 subledger | 6, 13, 24, 39 |
| §9 seed + 21 invariants | 17–19 |
| §10 tests | every task, 46–47 |
| §12 completion criteria | 48 |
| 42 decisions | enforced in Global Constraints + Tasks 3, 6–13, 22–25, 29–30 |

| Screen | Task | Screen | Task |
|---|---|---|---|
| 1 Dashboard | 35 | 15 COA | 42 |
| 2 Invoices | 36 | 16 Activity | 44 |
| 3 Invoice detail | 38 | 17 Trial balance | 43 |
| 4 Invoice editor | 37 | 18 Income statement | 43 |
| 5 Party picker | 36 | 19 Balance sheet | 43 |
| 6 Parties list | 39 | 20 VAT summary | 43 |
| 7 Party detail | 39 | 21 Aging | 43 |
| 8 Party editor | 39 | 22 Cash movement | 43 |
| 9 Expense | 40 | 23 Expense detail | 40 |
| 10 Receipt/payment | 40 | 24 Payment detail | 40 |
| 11 Transfer | 41 | 25 Transfer detail | 40 |
| 12 Transactions | 40 | 26 Settings | 44 |
| 13 Cash & banks | 41 | 27 Quick sheet | 45 |

| Invariant | Test |
|---|---|
| 1–2 | 14, 19 |
| 3–4 | 13, 16, 19 |
| 5 | 14, 19 |
| 6–9 | 10–11, 18–19 |
| 10–13 | 7, 9, 15, 19 |
| 14 | 8, 19 |
| 15 | 17, 19 |
| 16 | 6, 13, 19 |
| 17 | 3, 7, 19 |
| 18 | 16, 19 |
| 19 | 7, 12, 19 |
| 20 | 15, 19 |
| 21 | 22, 19 |

## Out of Scope (do not implement)

Backend/auth/DB/sync, multi-company or multi-currency, inventory/COGS, credit/debit notes, attachments/PDF/e-invoicing, bank feeds, period close, roles/permissions, recurring invoices, payment scheduling, on-account payments, automatic FIFO allocation, multi-invoice allocation UI, E2E automation.

## Handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-12-ledgerly-mobile-prototype.md`.

Before implementation: review this plan against the approved design document. No source code, packages, or app files are created until you approve the plan and choose an execution approach.
