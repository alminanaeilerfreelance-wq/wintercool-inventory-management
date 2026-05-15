# TODO - Customer Invoice Details Table Update

- [x] Update `frontend/components/Invoice/InvoicePrint.js` table header for Invoice Details:
  - [x] Keep: Serial No
  - [x] Add: Barcode
  - [x] Keep: Product Name
  - [x] Remove: Service
  - [x] Keep: SRP
  - [x] Keep: Qty
  - [x] Keep: Total

- [x] Update table body mapping in `InvoicePrint.js`:
  - [x] Read and display barcode value per item (`item.barcode` or fallback from inventory).
  - [x] Remove service value rendering.

- [x] Update empty state column span to match new column count.

- [x] Verify no other customer invoice print columns depend on `Service` column.
