import React, { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { useReactToPrint } from 'react-to-print';

import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptIcon from '@mui/icons-material/Receipt';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import InvoicePrint from '../../components/Invoice/InvoicePrint';
import api, {
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  getInvoiceQR,
  getInventory,
} from '../../utils/api';
import { useSettings } from '../../context/SettingsContext';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  Pending: 'warning',
  Open: 'info',
  Paid: 'success',
  Cancelled: 'default',
  Due: 'error',
};

// Position colors mapping - each position gets a unique color indicator
const POSITION_COLORS = {
  'Accounting Officer': 'info',
  'Manager': 'primary',
  'Installer': 'success',
  'Sales Representative': 'warning',
  'Cashier': 'secondary',
  'Supervisor': 'error',
  'Admin': 'default',
  'Engineer': 'info',
  'Technician': 'success',
  'Duct Installer': 'success', 
};

// Default color for unknown positions
const DEFAULT_POSITION_COLOR = 'default';

// Get color for a position, returns the Chip color prop value
const getPositionColor = (position) => {
  if (!position) return DEFAULT_POSITION_COLOR;
  const posLower = String(position).toLowerCase();
  // Try exact match first
  if (POSITION_COLORS[position]) return POSITION_COLORS[position];
  // Try case-insensitive match
  for (const [key, color] of Object.entries(POSITION_COLORS)) {
    if (key.toLowerCase() === posLower) return color;
  }
  return DEFAULT_POSITION_COLOR;
};

// Helper to normalize status values from database (lowercase) to UI format (capitalized)
const normalizeStatus = (status) => {
  if (!status) return 'Pending';
  const statusLower = String(status).toLowerCase();
  const statusMap = {
    'pending': 'Pending',
    'open': 'Open',
    'paid': 'Paid',
    'cancelled': 'Cancelled',
    'due': 'Due',
  };
  return statusMap[statusLower] || 'Pending';
};

const EMPTY_FORM = {
  customerName: '',
  customerContact: '',
  customerAddress: '',
  employeeId: '',
  installerId: '',
  storeBranchId: '',
  invoiceDate: dayjs(),
  notes: '',
  items: [],
  discountType: 'fixed',
  discountAmount: 0,
  vatType: 'exclusive',
  paymentStatus: 'Pending',
  calendarDate: null,
  calendarTitle: '',
  enableCalendar: false,
};

export default function CustomerInvoicesPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { company } = useSettings();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [installerFilter, setInstallerFilter] = useState('all');

  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [storeBranches, setStoreBranches] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
const [inventorySearch, setInventorySearch] = useState('');
  const [installers, setInstallers] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewQR, setViewQR] = useState('');

  const printRef = useRef();
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const vatRate = 0.12;

const fetchLookups = useCallback(async () => {
    try {
      const [cRes, eRes, bRes] = await Promise.all([
        api.get('/customers').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
        api.get('/store-branches').catch(() => ({ data: [] })),
      ]);
      const norm = (r) => { const d = r.data?.data || r.data; return Array.isArray(d) ? d : d?.items || []; };
      const employeeRows = norm(eRes);
      setCustomers(norm(cRes));
      setEmployees(employeeRows);
      setStoreBranches(norm(bRes));
      const allowedInstallerPositions = ['installer', 'engineer', 'technician', 'duct installer'];
      setInstallers(
        employeeRows.filter((emp) => {
          const pos = String(emp?.position || '').toLowerCase().trim();
          return allowedInstallerPositions.includes(pos);
        })
      );
    } catch (err) {
      console.error('Error loading lookups:', err);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await getInventory({ search: inventorySearch, limit: 50 });
      const d = res.data?.data || res.data;
      setInventoryItems(Array.isArray(d) ? d : d?.items || d?.inventory || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  }, [inventorySearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        invoiceType: 'customer',
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('paymentStatus', statusFilter);

      const res = await api.get(`/invoices?${params}`);
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.invoices || [];
      setRows(items);
      setTotal(res.data?.total || res.data?.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load invoices', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, enqueueSnackbar]);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (formOpen) fetchInventory(); }, [formOpen, fetchInventory]);

  useEffect(() => {
    if (!router.isReady) return;

    const editId = router.query?.editId;
    if (!editId || rows.length === 0) return;

    const targetId = String(Array.isArray(editId) ? editId[0] : editId);
    const targetRow = rows.find((r) => String(r._id || r.id) === targetId);
    if (!targetRow) return;

    openEdit(targetRow);

    const nextQuery = { ...router.query };
    delete nextQuery.editId;
    router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true }
    );
  }, [router, rows]);

  useEffect(() => {
    if (!router.isReady) return;

    const viewId = router.query?.viewId;
    if (!viewId || rows.length === 0) return;

    const targetId = String(Array.isArray(viewId) ? viewId[0] : viewId);
    const targetRow = rows.find((r) => String(r._id || r.id) === targetId);
    if (!targetRow) return;

    handleViewInvoice(targetRow);

    const nextQuery = { ...router.query };
    delete nextQuery.viewId;
    router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true }
    );
  }, [router, rows]);

  const openAdd = () => { setFormData(EMPTY_FORM); setEditId(null); setFormOpen(true); };
const openEdit = (row) => {
    setFormData({
      customerName: row.customerName || row.customer?.name || '',
      customerContact: row.customerContact || row.customer?.contact || row.customer?.phone || '',
      customerAddress: row.customerAddress || row.customer?.address || '',
      employeeId: row.employeeId || row.employee?._id || '',
      installerId: row.installerId || row.installer?._id || '',
      storeBranchId: row.storeBranchId || row.storeBranch?._id || '',
      invoiceDate: row.invoiceDate ? dayjs(row.invoiceDate) : dayjs(),
      notes: row.notes || '',
      items: (row.items || []).map((it) => ({
        inventoryId: it.inventory?._id || it.inventory || it.inventoryId || '',
        serialNo: it.serialNo || it.inventory?.serialNo || '',
        barcode: it.barcode || it.inventory?.barcode || '',
        productName: it.itemName || it.productName || it.product?.name || '',
        unitPrice: it.price || it.unitPrice || 0,
        qty: it.quantity || it.qty || 1,
      })),
      discountType: row.discountType || 'fixed',
      discountAmount: row.discountAmount || row.discount || 0,
      vatType: row.vatType || 'exclusive',
      paymentStatus: normalizeStatus(row.paymentStatus || row.status || 'Pending'),
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const setF = (k) => (e) => setFormData((p) => ({ ...p, [k]: e.target.value }));

  const addItemToCart = (inv) => {
    const id = inv._id || inv.id;
    setFormData((p) => {
      if (p.items.find((it) => it.inventoryId === id)) return p;
      
      // Safely extract product name from nested objects
      let productName = 'Unknown';
      if (typeof inv.product === 'string') {
        productName = inv.product;
      } else if (typeof inv.product === 'object' && inv.product?.name) {
        productName = inv.product.name;
      } else if (typeof inv.productName === 'string') {
        productName = inv.productName;
      } else if (typeof inv.productName === 'object' && inv.productName?.name) {
        productName = inv.productName.name;
      }
      
      return {
        ...p,
        items: [
          ...p.items,
          {
            inventoryId: id,
            serialNo: inv.serialNo || inv.serialNumber || inv.serial || '',
            barcode: inv.barcode || inv.barCode || '',
            productName: String(productName),
            unitPrice: inv.srp || inv.unitPrice || 0,
            qty: 1,
          },
        ],
      };
    });
  };

  const updateItem = (idx, field, value) => {
    setFormData((p) => {
      const items = p.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
      return { ...p, items };
    });
  };

  const removeItem = (idx) => {
    setFormData((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const selectedEmployee = employees.find((e) => (e._id || e.id) === formData.employeeId) || null;
  const selectedInstaller = installers.find((i) => (i._id || i.id) === formData.installerId) || null;

const subtotal = formData.items.reduce(
  (s, it) => s + (it.unitPrice * it.qty || 0),
  0
);

const discount =
  formData.discountType === 'percent'
    ? subtotal * (Number(formData.discountAmount) / 100)
    : Number(formData.discountAmount) || 0;

  const afterDiscount = Math.max(subtotal - discount, 0);

  // VAT
  // const vatAmount =
  //   formData.vatType === 'exclusive'
  //     ? afterDiscount * vatRate
  //     : afterDiscount - afterDiscount / (1 + vatRate);

  // // GRAND TOTAL
  // const grandTotal =
  //   formData.vatType === 'exclusive'
  //     ? afterDiscount + vatAmount
  //     : afterDiscount;


    const vatAmount =
    formData.vatType === 'exclusive'
      ? 0
      : afterDiscount - afterDiscount / (1 + vatRate);
    const grandTotal =
    formData.vatType === 'exclusive' ? afterDiscount : afterDiscount + vatAmount;


  const handleFormSubmit = async () => {
    const trimmedName = String(formData.customerName || '').trim();
    const trimmedContact = String(formData.customerContact || '').trim();
    const trimmedAddress = String(formData.customerAddress || '').trim();

    if (!trimmedName) { enqueueSnackbar('Customer name is required', { variant: 'warning' }); return; }
    if (!trimmedContact) { enqueueSnackbar('Customer contact is required', { variant: 'warning' }); return; }
    if (!trimmedAddress) { enqueueSnackbar('Customer address is required', { variant: 'warning' }); return; }
    if (!formData.items.length) { enqueueSnackbar('At least one product item is required', { variant: 'warning' }); return; }

    const normalizedItems = formData.items
      .map((item) => ({
        inventory: item.inventoryId,
        itemName: String(item.productName || '').trim(),
        quantity: Number(item.qty) || 0,
        price: Number(item.unitPrice) || 0,
      }))
      .filter((item) => item.inventory && item.quantity > 0 && item.price >= 0);

    if (!normalizedItems.length) {
      enqueueSnackbar('Please add valid items with quantity and price', { variant: 'warning' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        invoiceType: 'customer',
        customerName: trimmedName,
        customerContact: trimmedContact,
        customerAddress: trimmedAddress,
        employeeId: formData.employeeId || undefined,
        installerId: formData.installerId || undefined,
        storeBranchId: formData.storeBranchId || undefined,
        items: normalizedItems,
        notes: formData.notes,
        discountType: formData.discountType,
        discount: Number(discount) || 0,
        vatType: formData.vatType,
        vatRate: 12,
        subtotal: Number(subtotal) || 0,
        vatAmount: Number(vatAmount) || 0,
        total: Number(grandTotal) || 0,
        paymentStatus: String(formData.paymentStatus || 'Pending').toLowerCase(),
      };

      // Add calendar event data if enabled
      if (formData.enableCalendar && formData.calendarDate) {
        payload.calendarDate = formData.calendarDate.toISOString();
        payload.calendarTitle = formData.calendarTitle || `Invoice-${dayjs().format('MMDD')}`;
      }
      if (editId) {
        await updateInvoice(editId, payload);
        enqueueSnackbar('Invoice updated', { variant: 'success' });
      } else {
        await createInvoice(payload);
        enqueueSnackbar('Invoice created', { variant: 'success' });
      }
      setFormOpen(false);
      setFormData(EMPTY_FORM);
      setEditId(null);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleAdminConfirm = async () => {
    if (pendingAction === 'delete') {
      setFormLoading(true);
      try {
        await deleteInvoice(deleteId);
        enqueueSnackbar('Invoice deleted', { variant: 'success' });
        fetchData();
        setAdminOpen(false);
        setDeleteId(null);
        setPendingAction(null);
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleViewInvoice = async (row) => {
    try {
      // Fetch fresh invoice data from backend to get recalculated VAT
      const invoiceRes = await api.get(`/invoices/${row._id || row.id}`);
      const freshInvoice = invoiceRes.data?.data || invoiceRes.data;
      setViewInvoice(freshInvoice);
      setViewOpen(true);
      
      // Get QR code
      const qrRes = await getInvoiceQR(row._id || row.id);
      setViewQR(qrRes.data?.qr || qrRes.data?.data || '');
    } catch (err) {
      console.error('Error loading invoice details:', err);
      setViewQR('');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      // Convert capitalized status (e.g., "Paid") to lowercase (e.g., "paid") for backend
      const lowercaseStatus = status.charAt(0).toLowerCase() + status.slice(1).toLowerCase();
      await updateInvoiceStatus(id, lowercaseStatus);
      enqueueSnackbar('Status updated', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Status update failed', { variant: 'error' });
    }
  };
  const columns = [
    { field: 'invoiceNo', headerName: 'Invoice No', renderCell: ({ row }) => String(row.invoiceNo || row.invoice_no || '—') },
    { field: 'customer', headerName: 'Customer', renderCell: ({ row }) => {
      const c = row.customer;
      return String((typeof c === 'string' ? c : c?.name) || row.customerName || '—');
    }},
{ field: 'employee', headerName: 'Employee', renderCell: ({ row }) => {
      const e = row.employee;
      const name = String((typeof e === 'string' ? e : e?.name) || row.employeeName || '—');
      const position = e?.position || '';
      if (position) {
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="body2">{name}</Typography>
            <Chip label={position} size="small" color={getPositionColor(position)} sx={{ height: 20, fontSize: '0.7rem' }} />
          </Stack>
        );
      }
      return name;
    }},
    { field: 'installer', headerName: 'Installer', renderCell: ({ row }) => {
      const i = row.installer;
      const hasInstallerAssigned = Boolean(i || row.installerName);
      const name = String((typeof i === 'string' ? i : i?.name) || row.installerName || 'n/a');
      const position = i?.position || '';
      const contact = i?.contact || (hasInstallerAssigned ? '' : '0000');
      if (position || contact) {
        return (
          <Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="body2">{name}</Typography>
              {position && <Chip label={position} size="small" color={getPositionColor(position)} sx={{ height: 20, fontSize: '0.7rem' }} />}
            </Stack>
            {contact && <Typography variant="caption" color="text.secondary">{contact}</Typography>}
          </Box>
        );
      }
      return name;
    }},
    { field: 'storeBranch', headerName: 'Branch', renderCell: ({ row }) => {
      const b = row.storeBranch;
      return String((typeof b === 'string' ? b : b?.name) || row.branchName || '—');
    }},
    { field: 'subtotal', headerName: 'Subtotal', renderCell: ({ row }) => fmt(row.subtotal || 0) },
    { field: 'total', headerName: 'Total', renderCell: ({ row }) => fmt(row.total || 0) },
    { field: 'vatAmount', headerName: 'VAT', renderCell: ({ row }) => fmt(row.vatAmount || 0) },
    {
      field: 'paymentStatus',
      headerName: 'Status',
      renderCell: ({ row }) => {
        const status = normalizeStatus(row.paymentStatus || row.status);
        return (
          <Select
            size="small"
            value={status}
            onChange={(e) => handleStatusChange(row._id || row.id, e.target.value)}
            variant="standard"
            disableUnderline
            renderValue={(v) => (
              <Chip label={v} size="small" color={STATUS_COLORS[v] || 'default'} />
            )}
            sx={{ '& .MuiSelect-select': { p: 0 } }}
          >
            {Object.keys(STATUS_COLORS).map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        );
      },
    },
    { 
      field: 'invoiceDate', 
      headerName: 'Date', 
      renderCell: ({ row }) => {
        const date = row.invoiceDate || row.invoice_date || row.createdAt;
        return date ? dayjs(date).format('MMM DD, YYYY') : '—';
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View">
            <IconButton size="small" color="info" onClick={() => handleViewInvoice(row)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" color="warning" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setDeleteId(row._id || row.id);
                setPendingAction('delete');
                setAdminOpen(true);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];
  const nameOf = (arr, id) => arr.find((x) => (x._id || x.id) === id)?.name || '—';

  const filteredRows = React.useMemo(() => {
    const term = String(search || '').trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) => {
      const invoiceNo = String(row.invoiceNo || row.invoice_no || '').toLowerCase();

      const customer = String(
        (typeof row.customer === 'string' ? row.customer : row.customer?.name) || row.customerName || ''
      ).toLowerCase();

      const employee = String(
        (typeof row.employee === 'string' ? row.employee : row.employee?.name) || row.employeeName || ''
      ).toLowerCase();

      const installer = String(
        (typeof row.installer === 'string' ? row.installer : row.installer?.name) || row.installerName || ''
      ).toLowerCase();

      const branch = String(
        (typeof row.storeBranch === 'string' ? row.storeBranch : row.storeBranch?.name) || row.branchName || ''
      ).toLowerCase();

      const subtotalValue = Number(row.subtotal || 0);
      const totalValue = Number(row.total || 0);
      const vatValue = Number(row.vatAmount || 0);

      const subtotal = fmt(subtotalValue).toLowerCase();
      const totalAmount = fmt(totalValue).toLowerCase();
      const vat = fmt(vatValue).toLowerCase();

      const status = normalizeStatus(row.paymentStatus || row.status).toLowerCase();

      const dateRaw = row.invoiceDate || row.invoice_date || row.createdAt;
      const date = dateRaw ? dayjs(dateRaw).format('MMM DD, YYYY').toLowerCase() : '';

      return [
        invoiceNo,
        customer,
        employee,
        installer,
        branch,
        subtotal,
        totalAmount,
        vat,
        status,
        date,
      ].some((value) => value.includes(term));
    });
  }, [rows, search]);

  const isInstallerNA = (inv) => {
    const installerObjName = typeof inv.installer === 'object' ? inv.installer?.name : '';
    const installerDirect = typeof inv.installer === 'string' ? inv.installer : '';
    const normalized = String(inv.installerName || installerObjName || installerDirect || '').trim().toLowerCase();
    return !normalized || ['n/a', 'na', 'none', 'null', 'undefined', '-'].includes(normalized);
  };

  const finalRows = React.useMemo(() => {
    if (installerFilter === 'na-only') return filteredRows.filter(isInstallerNA);
    return filteredRows;
  }, [filteredRows, installerFilter]);

  const invoiceStats = React.useMemo(() => ({
    total: total,
    paid: rows.filter(r => ['Paid','paid'].includes(r.paymentStatus || r.status)).length,
    pending: rows.filter(r => ['Pending','pending'].includes(r.paymentStatus || r.status)).length,
    overdue: rows.filter(r => ['Due','due','Overdue','overdue'].includes(r.paymentStatus || r.status)).length,
    totalAmount: rows.reduce((s, r) => s + (r.total || r.totalAmount || 0), 0),
  }), [rows, total]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MainLayout title="Customer Invoices">
        <PageHeader
          title="Customer Invoices"
          subtitle="Manage and track all customer invoices"
          icon={<ReceiptIcon />}
          color="#1565c0"
          breadcrumbs={[{ label: 'Invoices' }, { label: 'Customer Invoices' }]}
          actions={
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
              Create Invoice
            </Button>
          }
        />

        <Grid container spacing={2} mb={2.5}>
          {[
            { label: 'Total Invoices', value: invoiceStats.total, color: '#1565c0' },
            { label: 'Paid', value: invoiceStats.paid, color: '#2e7d32' },
            { label: 'Pending', value: invoiceStats.pending, color: '#ed6c02' },
            { label: 'Overdue / Due', value: invoiceStats.overdue, color: '#d32f2f' },
          ].map(card => (
            <Grid item xs={6} sm={3} key={card.label}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, borderLeft: `4px solid ${card.color}` }}>
                <Typography variant="h6" fontWeight={700} color={card.color}>{card.value}</Typography>
                <Typography variant="caption" color="text.secondary">{card.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                label="Filter by Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value=""><em>All Statuses</em></MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Due">Due</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Installer</InputLabel>
              <Select
                value={installerFilter}
                label="Installer"
                onChange={(e) => { setInstallerFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="na-only">N/A Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <DataTable
          columns={columns}
          rows={finalRows}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          total={total}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(0); }}
        />

        {/* Create / Edit Invoice Dialog */}
        <FormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editId ? 'Edit Invoice' : 'Create Invoice'}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          maxWidth="lg"
        >

        <hr></hr>

          <Grid container spacing={2} mt={0.5}>
            {/* Header Fields */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Customer Name"
                fullWidth
                size="small"
                value={formData.customerName}
                onChange={setF('customerName')}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Employee</InputLabel>
                <Select value={formData.employeeId} label="Employee" onChange={setF('employeeId')}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {employees.map((e) => {
                    const name = String(e?.name || e?.firstName || '—');
                    const position = e?.position || '';
                    const display = position ? `${name} - ${position}` : name;
                    return <MenuItem key={e._id || e.id} value={e._id || e.id}>{display}</MenuItem>;
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Installer</InputLabel>
                <Select value={formData.installerId} label="Installer" onChange={setF('installerId')}>
                  <MenuItem value=""><em>None</em></MenuItem>
                {installers.map((e) => {
                  const name = String(e?.name || e?.firstName || '—');
                  const position = e?.position || '';
                  const display = position ? `${name} (${position})` : name;
                  return <MenuItem key={e._id || e.id} value={e._id || e.id}>{display}</MenuItem>;
                })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Store Branch</InputLabel>
                <Select value={formData.storeBranchId} label="Store Branch" onChange={setF('storeBranchId')}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {storeBranches.map((b) => {
                    const name = String(b?.name || b?.branchName || '—');
                    return <MenuItem key={b._id || b.id} value={b._id || b.id}>{name}</MenuItem>;
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Invoice Date"
                value={formData.invoiceDate}
                onChange={(v) => setFormData((p) => ({ ...p, invoiceDate: v }))}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>Customer Details</Typography>
                    <TextField
                      label="Contact"
                      fullWidth
                      size="small"
                      value={formData.customerContact}
                      onChange={setF('customerContact')}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      label="Address"
                      fullWidth
                      size="small"
                      value={formData.customerAddress}
                      onChange={setF('customerAddress')}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>Employee Details</Typography>
                    <Typography variant="body2">Name: {selectedEmployee?.name || selectedEmployee?.firstName || '—'}</Typography>
                    <Typography variant="body2">Store Branch: {selectedEmployee?.storeBranch?.name || selectedEmployee?.storeBranchName || '—'}</Typography>
                    <Typography variant="body2">Contact: {selectedEmployee?.contact || selectedEmployee?.phone || '—'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>Installer Details</Typography>
                    <Typography variant="body2">Name: {selectedInstaller?.name || selectedInstaller?.firstName || '—'}</Typography>
                    <Typography variant="body2">Contact: {selectedInstaller?.contact || selectedInstaller?.phone || '—'}</Typography>
                    <Typography variant="body2">Store Branch: {selectedInstaller?.storeBranch?.name || selectedInstaller?.storeBranchName || '—'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>Store Branch Details</Typography>
                    <Typography variant="body2">Branch Name: {storeBranches.find((b) => (b._id || b.id) === formData.storeBranchId)?.name || '—'}</Typography>
                    <Typography variant="body2">Contact: {storeBranches.find((b) => (b._id || b.id) === formData.storeBranchId)?.contact || '—'}</Typography>
                    <Typography variant="body2">Address: {storeBranches.find((b) => (b._id || b.id) === formData.storeBranchId)?.address || '—'}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                size="small"
                value={formData.notes}
                onChange={setF('notes')}
              />
            </Grid>

            {/* Calendar Sync */}
            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enableCalendar || false}
                    onChange={(e) => setFormData((p) => ({ ...p, enableCalendar: e.target.checked }))}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonthIcon fontSize="small" color="primary" />
                    <Typography variant="body2" fontWeight={500}>Add to Calendar</Typography>
                  </Box>
                }
              />
            </Grid>
            {formData.enableCalendar && (
              <>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Calendar Date"
                    value={formData.calendarDate}
                    onChange={(v) => setFormData((p) => ({ ...p, calendarDate: v }))}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Event Title"
                    fullWidth
                    size="small"
                    value={formData.calendarTitle}
                    onChange={(e) => setFormData((p) => ({ ...p, calendarTitle: e.target.value }))}
                    placeholder="e.g. Delivery Schedule"
                  />
                </Grid>
              </>
            )}

            {/* Cart Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Add Items
              </Typography>
              <TextField
                size="small"
                placeholder="Search inventory…"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                }}
                sx={{ mb: 1, minWidth: 260 }}
              />
              <Box sx={{ maxHeight: 140, overflowY: 'auto', mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {inventoryItems.map((inv) => {
                  // Safely extract product name from nested objects
                  let prodName = 'Unknown';
                  if (typeof inv.product === 'string') {
                    prodName = inv.product;
                  } else if (typeof inv.product === 'object' && inv.product?.name) {
                    prodName = inv.product.name;
                  } else if (typeof inv.productName === 'string') {
                    prodName = inv.productName;
                  } else if (typeof inv.productName === 'object' && inv.productName?.name) {
                    prodName = inv.productName.name;
                  }
                  
                  const serialNo = inv.serialNo || inv.serialNumber || inv.serial || '—';
                  const barcode = inv.barcode || inv.barCode || '—';
                  const prodSRP = inv.srp || inv.unitPrice || 0;
                  const prodQty = inv.quantity || 0;

                  return (
                    <Box
                      key={inv._id || inv.id}
                      sx={{ p: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 0.5 }}
                      onClick={() => addItemToCart(inv)}
                    >
                      <Typography variant="body2">
                               {String(serialNo)} — {String(barcode)} — {String(prodName)} — SRP: {fmt(prodSRP)} — Qty: {prodQty}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Serial No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Barcode</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SRP</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                          <Typography variant="body2" color="text.secondary">No items added</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{String(it?.serialNo || '—')}</TableCell>
                          <TableCell>{String(it?.barcode || '—')}</TableCell>
                          <TableCell>{String(it?.productName || '—')}</TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={it?.unitPrice || 0}
                              onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                              inputProps={{ min: 0, style: { width: 80 } }} />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={it?.qty || 1}
                              onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                              inputProps={{ min: 1, style: { width: 60 } }} />
                          </TableCell>
                          <TableCell>{fmt(it.unitPrice * it.qty)}</TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Totals */}
            <Grid item xs={12} sm={6}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Discount Type</InputLabel>
                    <Select value={formData.discountType} label="Discount Type" onChange={setF('discountType')}>
                      <MenuItem value="fixed">Fixed</MenuItem>
                      <MenuItem value="percent">Percent</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Discount Amount" type="number"
                    value={formData.discountAmount}
                    onChange={setF('discountAmount')} inputProps={{ min: 0 }} />
                </Stack>
                <FormControl size="small" sx={{ maxWidth: 200 }}>
                  <InputLabel>VAT Type</InputLabel>
                  <Select value={formData.vatType} label="VAT Type" onChange={setF('vatType')}>
                    <MenuItem value="inclusive">Inclusive</MenuItem>
                    <MenuItem value="exclusive">Exclusive</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ maxWidth: 200 }}>
                  <InputLabel>Payment Status</InputLabel>
                  <Select value={formData.paymentStatus} label="Payment Status" onChange={setF('paymentStatus')}>
                    {Object.keys(STATUS_COLORS).map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Subtotal</Typography>
                    <Typography variant="body2">{fmt(subtotal)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Discount</Typography>
                    <Typography variant="body2">-{fmt(discount)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">VAT (12%)</Typography>
                    <Typography variant="body2">{fmt(vatAmount)}</Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="subtitle1" fontWeight={700}>Grand Total</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>{fmt(grandTotal)}</Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </FormDialog>

        {/* View Invoice Dialog */}
        <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Invoice Details</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<PrintIcon />} onClick={handlePrint} variant="outlined">
                  Print
                </Button>
                <IconButton size="small" onClick={() => setViewOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ maxHeight: 'calc(90vh - 120px)', overflow: 'auto', p: 2 }}>
            {viewInvoice && (
              <InvoicePrint ref={printRef} invoice={viewInvoice} company={company} qrValue={viewQR} />
            )}
          </DialogContent>
        </Dialog>

        {pendingAction === 'delete' && (
          <AdminConfirmDialog
            open={adminOpen}
            onClose={() => { setAdminOpen(false); setDeleteId(null); setPendingAction(null); }}
            onConfirm={handleAdminConfirm}
            title="Delete Invoice"
            description="Enter admin password to delete this invoice."
          />
        )}
      </MainLayout>
    </LocalizationProvider>
  );
}
