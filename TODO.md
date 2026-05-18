# TODO - Fix login ERR_CONNECTION_REFUSED

- [x] Verify backend is listening on port 5000
- [x] Start backend server if it is not running
- [x] Verify backend auth endpoint reachability
- [x] Validate frontend API base URL points to running backend
- [ ] Restart frontend if env/config changes are needed
- [ ] Re-test login flow

## TODO - Dashboard Service Invoices actions

- [x] Update dashboard Service Invoices table view action to open Service Invoice Details via `viewId`
- [x] Verify dashboard Service Invoices table edit action opens Edit Service Invoice via `editId`
- [x] Mark task complete after code update
## TODO - Fix Dashboard JSX syntax error

- [ ] Fix missing closing `</IconButton>` in Service Invoices "View" action
- [ ] Verify nearby JSX nesting in Service Invoices actions block
- [ ] Mark task complete after syntax fix
## TODO - Sales Report table details

- [x] Update `frontend/pages/reports/sales.js` row field mapping to ensure Date, Invoice No, Customer, Branch, Qty, Price, Subtotal, Total, Status are fully populated
- [x] Keep existing table headers unchanged

## TODO - Create a.md documentation

- [x] Draft comprehensive application documentation in `a.md`
- [x] Include setup, architecture, env vars, run commands, auth/roles, and troubleshooting
- [x] Mark task complete after file creation
- [x] Align print preview row mapping with same fallbacks
- [ ] Verify the report page displays complete table details after Generate Report
