# Phase 4 Progress

## Completed

- Added purchase workflow data models for purchase requests, RFQs, supplier quotations, purchase orders, goods receipts, supplier invoices, and purchase returns.
- Added purchase permissions and guarded API routes for request-to-receipt purchasing operations.
- Added the Purchasing workspace with tabs for requests, RFQs, supplier quotes, purchase orders, goods receipts, supplier invoices, and purchase returns.
- Posted goods receipts as stock-in movements through the immutable stock ledger and updated stock balances with weighted-average cost.
- Posted purchase returns as stock-out movements through the immutable stock ledger.
- Added supplier invoice matching flags for quantity variance, price variance, tax variance, and duplicate supplier invoice detection.
- Added stock transfer, stock count, stock adjustment, stock ledger, and inventory valuation endpoints.
- Added the Inventory workspace with transfer, count, adjustment, valuation, and ledger tabs.
- Added bulk Excel/CSV import for inventory transfers, stock counts, and stock adjustments with templates, column mapping, preview validation, error export, and commit.

## Verified

- `npm run typecheck`
- `npm test`
- `npm run build -w @erp/api`
- API smoke: request -> RFQ -> supplier quote -> comparison -> purchase order -> partial goods receipt -> supplier invoice variance hold -> purchase return.
- Browser smoke: Purchasing navigation and all seven Phase 4 purchase tabs render at `http://localhost:3000/`.
- API smoke: stock transfer -> count variance -> stock adjustment -> valuation -> ledger.
- Browser smoke: Inventory navigation and all five inventory tabs render at `http://localhost:3000/`.
- API smoke: inventory import preview/commit for transfer, count, and adjustment rows.
- Browser smoke: Inventory bulk Excel import panel renders template, upload, preview, and confirm controls.

## Remaining

- Phase 4 checklist is complete.
