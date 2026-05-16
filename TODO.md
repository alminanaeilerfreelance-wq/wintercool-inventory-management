- [x] Add client-side memoized search filtering for customer invoices table
- [x] Ensure searchable fields include: Invoice No, Customer, Employee, Installer, Branch, Subtotal, Total, VAT, Status, Date
- [x] Wire DataTable rows to filtered dataset
- [ ] Verify no regressions in pagination/search behavior

## Dashboard Service Invoices N/A Match - TODO

- [ ] Add dashboard state for service invoices (rows/loading/page/rowsPerPage/total/search/filter)
- [ ] Implement `fetchServiceInvoices` with API params + N/A installer matching logic
- [ ] Add Service Invoices dashboard table UI with search/filter/actions
- [ ] Add pagination handlers for service invoices table
- [ ] Verify edit/view actions navigate to `/invoices/service` with query params
- [ ] Run frontend lint check and resolve issues if any
