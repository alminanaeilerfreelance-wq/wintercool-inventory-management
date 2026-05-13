- [ ] Remove frontend SKU usage and use serialNo only for Add/Edit Inventory flow
- [ ] Add client-side validation for required select fields
- [ ] Add client-side validation for required input fields (serialNo, barcode, cost, srp, quantity, lowStockThreshold)
- [ ] Ensure payload uses serialNo (no sku fallback) for create/update
- [ ] Harden backend create/update validation messaging for unique serialNo/barcode if needed
- [ ] Run syntax checks for edited files
- [x] Update customer invoice form fields and details sections in `frontend/pages/invoices/customer.js`
- [x] Fix undefined `serialNo` and `barcode` rendering in inventory list
- [x] Verify installer source list and form submission compatibility
- [x] Replace customer dropdown with manual customer detail inputs in invoice form
- [x] Wire manual customer details into create/edit payload hydration
- [x] Update frontend customer invoice installer filtering (Installer/Engineer/Technician/Duct Installer only)
- [x] Add/strengthen frontend add-edit validation and payload normalization in customer invoice form
- [x] Update customer invoice UI detail sections (customer/employee/installer/store branch/product details fields)
- [x] Harden backend invoice POST/PUT validation and normalization for customer invoice flow
- [x] Add missing Invoice model fields needed for customer detail persistence
- [ ] Run quick verification checks for syntax/runtime issues
- [x] Add storeBranch field to Employee model
- [x] Update employee routes (GET/POST/PUT) to support storeBranch
- [x] Update master employees page add/edit form to include store branch select
- [x] Show store branch in employees table

- [ ] Run lint/verification for employee changes

modify the add, edit update  and validation to avoid error

installer option -git the data in the employee models to display the filtered the installer,engineer, technician, duct installer  in the installer option in the customer create invoices

customer details 
customer name,email, contact, address

Employee Details - name, store branch, contact

Installer Details- name contact store branch 

store branch - contact , store branch name, address 



product details sireal no,barcode, product name, srp,totalP@ssw0rd
