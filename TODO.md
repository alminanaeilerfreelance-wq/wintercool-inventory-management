# TODO

- [x] Backend: add `/api/reports/sub-dealer-invoices` endpoint with dateFrom/dateTo, optional search/status/raw support and totals suitable for `ReportPrint`.
- [x] Frontend: add `frontend/pages/reports/sub-dealer-invoices.js` report page with date-range filters, generate button, and print/PDF preview using `ReportPrint`.

- [ ] Verify manually: call API with date range and confirm shape `{ items, totals }`.
- [ ] Verify UI: generate report + print preview.

