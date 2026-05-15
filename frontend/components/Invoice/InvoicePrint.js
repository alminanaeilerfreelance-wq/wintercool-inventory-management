import React, { forwardRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { QRCodeCanvas } from 'qrcode.react';
import dayjs from 'dayjs';
import DownloadIcon from '@mui/icons-material/Download';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  Pending: 'warning',
  Open: 'info',
  Paid: 'success',
  Cancelled: 'default',
  Due: 'error',
};

const normalizeStatus = (status) => {
  if (!status) return 'Pending';
  const statusMap = {
    pending: 'Pending',
    open: 'Open',
    paid: 'Paid',
    cancelled: 'Cancelled',
    due: 'Due',
  };
  return statusMap[String(status).toLowerCase()] || String(status);
};

const InvoicePrint = forwardRef(function InvoicePrint({ invoice, company, qrValue }, ref) {
  if (!invoice) return null;

  const [qrScanOpen, setQrScanOpen] = useState(false);

  const items = invoice.items || [];
  const status = normalizeStatus(invoice.paymentStatus || invoice.status);

  const customerName = invoice.customer?.name || invoice.subDealer?.name || invoice.customerName || invoice.subDealerName || '—';
  const customerEmail = invoice.customer?.email || invoice.subDealer?.email || invoice.customerEmail || invoice.subDealerEmail || '—';
  const customerAddress = invoice.customer?.address || invoice.subDealer?.address || invoice.customerAddress || invoice.subDealerAddress || '—';
  const customerContact = invoice.customer?.contact || invoice.customer?.phone || invoice.subDealer?.contact || invoice.subDealer?.phone || invoice.customerContact || invoice.subDealerContact || '—';

  const employeeName = invoice.employee?.name || invoice.employeeName || '—';
  const employeeBranch = invoice.employee?.storeBranch?.name || invoice.employee?.storeBranchName || invoice.storeBranch?.name || invoice.branchName || '—';
  const employeeContact = invoice.employee?.contact || invoice.employee?.phone || invoice.employeeContact || '—';

  const installerName = invoice.installer?.name || invoice.installerName || '—';
  const installerContact = invoice.installer?.contact || invoice.installer?.phone || invoice.installerContact || '—';
  const installerBranch = invoice.installer?.storeBranch?.name || invoice.installer?.storeBranchName || invoice.storeBranch?.name || invoice.branchName || '—';

  const qrString =
    qrValue ||
    JSON.stringify({
      invoiceNo: invoice.invoiceNo || invoice.invoice_no,
      total: invoice.total,
      date: invoice.invoiceDate,
    });

  // Download invoice as PDF
  const downloadInvoice = () => {
    const element = ref?.current;
    if (!element) return;

    // Use browser's print dialog - user can save as PDF
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Invoice</title>');
    printWindow.document.write('<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap">');
    printWindow.document.write('<style>body { font-family: Roboto, sans-serif; font-size: 12px; } @media print { body { margin: 0; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(element.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Box
      ref={ref}
      sx={{
        p: 4,
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: '12px',
        color: '#000',
        bgcolor: '#fff',
        maxWidth: 800,
        mx: 'auto',
        '@media print': {
          p: 2,
          maxWidth: '100%',
        },
      }}
    >
      {/* Company Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          {company?.logo && (
            <Box
              component="img"
              src={company.logo}
              alt="logo"
              sx={{ height: 60, mb: 1, display: 'block' }}
            />
          )}
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: 18 }}>
            {company?.name || 'Company Name'}
          </Typography>
          {company?.slogan && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
              {company.slogan}
            </Typography>
          )}
          <Typography variant="body2" sx={{ fontSize: 11 }}>{company?.address}</Typography>
          <Typography variant="body2" sx={{ fontSize: 11 }}>{company?.phone}</Typography>
          {company?.tinNo && (
            <Typography variant="body2" sx={{ fontSize: 11 }}>TIN: {company.tinNo}</Typography>
          )}
        </Box>
        <Box textAlign="right">
          <Typography variant="h5" fontWeight={700} color="primary" sx={{ fontSize: 22 }}>
            INVOICE
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
            # {invoice.invoiceNo || invoice.invoice_no || 'N/A'}
          </Typography>
          <Chip
            label={status}
            size="small"
            color={STATUS_COLORS[status] || 'default'}
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Invoice Details */}
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          border: '1px solid',
          borderColor: 'grey.300',
          borderRadius: 1.5,
          bgcolor: 'grey.50',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: 13, letterSpacing: 0.4 }}>
            INVOICE DETAILS
          </Typography>
          <Box textAlign="right">
            <Typography variant="body2" sx={{ fontSize: 11.5 }}>
              <strong>Date:</strong> {invoice.invoiceDate ? dayjs(invoice.invoiceDate).format('MMM DD, YYYY') : '—'}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}>
              <strong>Company Contact:</strong> {company?.phone || company?.contact || '—'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ '& > *': { flex: 1 } }}>
          <Box sx={{ p: 1.25, bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: 11.5, mb: 0.75, color: 'primary.main' }}>Customer Details</Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}><strong>Name:</strong> {customerName}</Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}><strong>Email:</strong> {customerEmail}</Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}><strong>Address:</strong> {customerAddress}</Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}><strong>Contact:</strong> {customerContact}</Typography>
          </Box>

          <Box sx={{ p: 1.25, bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: 11.5, mb: 0.75, color: 'primary.main' }}>Employee Details</Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}><strong>Name:</strong> {employeeName}</Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}><strong>Store Branch:</strong> {employeeBranch}</Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}><strong>Contact:</strong> {employeeContact}</Typography>
          </Box>

          <Box sx={{ p: 1.25, bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: 11.5, mb: 0.75, color: 'primary.main' }}>Installer Details</Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}><strong>Name:</strong> {installerName}</Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}><strong>Contact:</strong> {installerContact}</Typography>
            <Typography variant="body2" sx={{ fontSize: 11.5 }}><strong>Store Branch:</strong> {installerBranch}</Typography>
          </Box>
        </Stack>
      </Box>

      {/* Items Table */}
      <Table size="small" sx={{ mb: 2, border: '1px solid', borderColor: 'grey.300' }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.main' }}>
            <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#fff' }}>Serial No</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#fff' }}>Barcode</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#fff' }}>Product Name</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: '#fff' }}>SRP</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, fontSize: 11, color: '#fff' }}>Qty</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: '#fff' }}>Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ fontSize: 11 }}>No items</TableCell>
            </TableRow>
          ) : (
            items.map((item, idx) => {
              const serialNo = item.serialNo || item.inventory?.serialNo || item.inventory?.serialNumber || item.inventory?.serial || '—';
              const barcode = item.barcode || item.inventory?.barcode || item.inventory?.barCode || '—';
              const productName =
                item.itemName ||
                item.productName ||
                item.inventory?.product?.name ||
                item.inventory?.productName?.name ||
                item.inventory?.productName ||
                item.product?.name ||
                '—';
              const srp = Number(item.price || item.unitPrice || item.srp || 0);
              const qty = Number(item.quantity || item.qty || 1);
              const lineTotal = srp * qty;

              return (
                <TableRow key={idx} sx={{ '&:nth-of-type(even)': { bgcolor: 'grey.50' } }}>
                  <TableCell sx={{ fontSize: 11 }}>{String(serialNo)}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{String(barcode)}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{String(productName)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(srp)}</TableCell>
                  <TableCell align="center" sx={{ fontSize: 11 }}>{qty}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 11 }}>{fmt(lineTotal)}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Totals + QR */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          {/* Notes */}
          {invoice.notes && (
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: 12 }}>Notes:</Typography>
              <Typography variant="body2" sx={{ fontSize: 11, maxWidth: 300 }}>
                {invoice.notes}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 10, mt: 4 }}>
            Thank you for your business!
          </Typography>
        </Box>

        <Box>
          {/* Totals Section */}
          <Box sx={{ minWidth: 260, mb: 2, p: 1.5, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, bgcolor: 'grey.50' }}>
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ fontSize: 12 }}>Subtotal</Typography>
                <Typography variant="body2" sx={{ fontSize: 12 }}>{fmt(invoice.subtotal)}</Typography>
              </Stack>
              {(invoice.discount > 0 || invoice.discountAmount > 0) && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: 12 }}>Discount</Typography>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    -{fmt(invoice.discount || invoice.discountAmount)}
                  </Typography>
                </Stack>
              )}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ fontSize: 12 }}>VAT</Typography>
                <Typography variant="body2" sx={{ fontSize: 12 }}>{fmt(invoice.vatAmount)}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: 14 }}>Grand Total</Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: 14 }}>
                  {fmt(invoice.total)}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {/* QR Code */}
          <Box textAlign="right">
            <Box
              onClick={() => setQrScanOpen(true)}
              sx={{
                cursor: 'pointer',
                display: 'inline-block',
                p: 1,
                border: '1px solid #ddd',
                borderRadius: 1,
                '&:hover': { bgcolor: 'grey.50' },
              }}
            >
              <QRCodeCanvas value={qrString} size={80} />
            </Box>
            <Typography variant="caption" display="block" sx={{ fontSize: 9, mt: 0.5 }}>
              Click to scan
            </Typography>
          </Box>
        </Box>
      </Stack>

      {/* QR Scan Dialog with Download */}
      <Dialog open={qrScanOpen} onClose={() => setQrScanOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invoice QR Code</DialogTitle>
        <DialogContent>
          <Box textAlign="center" py={3}>
            <QRCodeCanvas value={qrString} size={200} />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Scan this QR code to verify invoice
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Invoice: {invoice.invoiceNo || invoice.invoice_no}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrScanOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={() => {
              downloadInvoice();
              setQrScanOpen(false);
            }}
          >
            Download Invoice
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default InvoicePrint;
