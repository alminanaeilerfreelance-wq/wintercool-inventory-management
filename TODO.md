# Service Invoice Redesign TODO

- [x] Update service invoice form model to manual customer fields
- [x] Remove customer dropdown from `/invoices/service`
- [x] Add customer details inputs: name, address, email, contact
- [x] Filter installer dropdown by installer/ducter/engineer-like roles
- [x] Rework items table to: Serial No, Barcode, Product Name, SRP, Qty
- [x] Update payload mapping with manual customer + item fields
- [ ] Add product-model search/select support for Product Name in service items
- [ ] Update items table columns to: Serial No, Product Name, Service, SRP, Qty, Total
- [ ] Remove barcode usage from service item UI/payload
- [ ] Update backend invoice item schema to persist serialNo and serviceName
- [ ] Update backend invoice sanitizer to accept/store serialNo and serviceName
- [ ] Fix service invoice edit/submit mapping for full item fields
- [ ] Fix payment status update normalization bug in service invoices page
- [ ] Improve invoice print item field fallbacks for service invoice details
- [ ] Run quick validation/build check
