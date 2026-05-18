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
import { useSnackbar } from 'notistack';
import { useReactToPrint } from 'react-to-print';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import HandymanIcon from '@mui/icons-material/Handyman';

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
  customerEmail: '',
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
};

export default function ServiceInvoicesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { company } = useSettings();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDeadlineAlert, setShowDeadlineAlert] = useState(false);
  const [upcomingInvoices, setUpcomingInvoices] = useState([]);
  const [installerFilter, setInstallerFilter] = useState('all');

  const [employees, setEmployees] = useState([]);
  const [storeBranches, setStoreBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
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
      const [, eRes, bRes] = await Promise.all([
        api.get('/customers').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
        api.get('/store-branches').catch(() => ({ data: [] })),
      ]);
      const norm = (r) => { const d = r.data?.data || r.data; return Array.isArray(d) ? d : d?.items || []; };
      const employeeRows = norm(eRes);
      setEmployees(employeeRows);
      setStoreBranches(norm(bRes));
      setInstallers(
        employeeRows.filter((emp) => {
          const pos = String(emp?.position || '').toLowerCase().trim();
          return (
            pos.includes('installer') ||
            pos.includes('duct') ||
            pos.includes('ducker') ||
            pos.includes('engineer') ||
            pos.includes('enger')
          );
        })
      );
    } catch (err) {
      console.error('Error loading lookups:', err);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/services', { params: { search: serviceSearch, limit: 50 } });
      const d = res.data?.data || res.data;
      setServices(Array.isArray(d) ? d : d?.items || d?.services || []);
    } catch (err) {
      console.error('Error loading services:', err);
    }
  }, [serviceSearch]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get('/products', { params: { search: productSearch, limit: 50 } });
      const d = res.data?.data || res.data;
      setProducts(Array.isArray(d) ? d : d?.items || d?.products || []);
    } catch (err) {
      console.error('Error loading products:', err);
      setProducts([]);
    }
  }, [productSearch]);

  const checkUpcomingDeadlines = useCallback((invoices) => {
    const now = dayjs();
    const upcoming = invoices.filter(inv => {
      if (!inv.invoiceDate) return false;
      const invoiceDate = dayjs(inv.invoiceDate);
      const daysUntilDue = invoiceDate.diff(now, 'day');
      const dueDateStatus = inv.paymentStatus || inv.status;
      // Show notification for invoices due within 7 days that are not yet paid
      return daysUntilDue > 0 && daysUntilDue <= 7 && !['Paid', 'paid'].includes(dueDateStatus);
    });
    if (upcoming.length > 0) {
      setUpcomingInvoices(upcoming);
      setShowDeadlineAlert(true);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage, search, invoiceType: 'service' };
      if (statusFilter) {
        params.paymentStatus = statusFilter.toLowerCase();
      }
      const res = await getInvoices(params);
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.invoices || [];
      setRows(items);
      setTotal(res.data?.total || res.data?.pagination?.total || items.length);
      // Check for upcoming deadlines
      if (page === 0) {
        checkUpcomingDeadlines(items);
      }
    } catch {
      enqueueSnackbar('Failed to load service invoices', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, enqueueSnackbar, checkUpcomingDeadlines]);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (formOpen) fetchServices(); }, [formOpen, fetchServices]);
  useEffect(() => { if (formOpen) fetchProducts(); }, [formOpen, fetchProducts]);

  const openAdd = () => { setFormData(EMPTY_FORM); setEditId(null); setFormOpen(true); };
  const openEdit = (row) => {
    setFormData({
      customerName: row.customerName || row.customer?.name || '',
      customerEmail: row.customerEmail || row.customer?.email || '',
      customerContact: row.customerContact || row.customer?.contact || row.customer?.phone || '',
      customerAddress: row.customerAddress || row.customer?.address || '',
      employeeId: row.employeeId || row.employee?._id || '',
      storeBranchId: row.storeBranchId || row.storeBranch?._id || '',
      installerId: row.installerId || row.installer?._id || '',
      invoiceDate: row.invoiceDate ? dayjs(row.invoiceDate) : dayjs(),
      notes: row.notes || '',
      items: (row.items || []).map((it) => ({
        serviceId: it.serviceId || it.service?._id || it.service || '',
        serialNo: it.serialNo || it.inventory?.serialNo || it.inventory?.serialNumber || it.inventory?.serial || '',
        productName:
          it.itemName ||
          it.productName ||
          it.inventory?.product?.name ||
          it.inventory?.productName?.name ||
          it.inventory?.productName ||
          it.product?.name ||
          '',
        serviceName: it.serviceName || it.service?.name || it.serviceTitle || '',
        unitPrice: Number(it.unitPrice ?? it.price ?? it.srp ?? 0),
        qty: Number(it.qty ?? it.quantity ?? 1),
      })),
      discountType: row.discountType || 'fixed',
      discountAmount: row.discountAmount || 0,
      vatType: row.vatType || 'exclusive',
      paymentStatus: normalizeStatus(row.paymentStatus || row.status || 'Pending'),
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const setF = (k) => (e) => setFormData((p) => ({ ...p, [k]: e.target.value }));

  const addProductModelToCart = (prod) => {
    const productName =
      prod?.name ||
      prod?.productName?.name ||
      prod?.productName ||
      'Unknown Product';

    const srp = Number(prod?.price ?? prod?.srp ?? prod?.unitPrice ?? 0);

    setFormData((p) => ({
      ...p,
      items: [
        ...p.items,
        {
          serviceId: '',
          serviceName: '',
          serialNo: '',
          productName,
          unitPrice: srp,
          qty: 1,
        },
      ],
    }));
  };

  const updateItem = (idx, field, value) => {
    setFormData((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));
  };

  const removeItem = (idx) => {
    setFormData((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const subtotal = formData.items.reduce((s, it) => s + (it.unitPrice * it.qty || 0), 0);
  const discount =
    formData.discountType === 'percent'
      ? subtotal * (Number(formData.discountAmount) / 100)
      : Number(formData.discountAmount) || 0;
  const afterDiscount = subtotal - discount;
  const vatAmount =
    formData.vatType === 'exclusive'
      ? 0
      : afterDiscount - afterDiscount / (1 + vatRate);
  const grandTotal =
    formData.vatType === 'exclusive' ? afterDiscount : afterDiscount + vatAmount;

const handleFormSubmit = async () => {
    const trimmedName = String(formData.customerName || '').trim();
    const trimmedEmail = String(formData.customerEmail || '').trim();
    const trimmedContact = String(formData.customerContact || '').trim();
    const trimmedAddress = String(formData.customerAddress || '').trim();

    if (!trimmedName) { enqueueSnackbar('Customer name is required', { variant: 'warning' }); return; }
    if (!trimmedEmail) { enqueueSnackbar('Customer email is required', { variant: 'warning' }); return; }
    if (!trimmedContact) { enqueueSnackbar('Customer contact is required', { variant: 'warning' }); return; }
    if (!trimmedAddress) { enqueueSnackbar('Customer address is required', { variant: 'warning' }); return; }
    if (formData.items.length === 0) { enqueueSnackbar('Add at least one item', { variant: 'warning' }); return; }

    setFormLoading(true);
    try {
      const normalizedStatus = formData.paymentStatus.toLowerCase();
      const mappedItems = formData.items.map(item => ({
        service: item.serviceId || undefined,
        serialNo: item.serialNo || '',
        itemName: item.productName || '',
        serviceName:
          item.serviceName ||
          services.find((svc) => String(svc._id || svc.id) === String(item.serviceId))?.name ||
          '',
        quantity: Number(item.qty) || 1,
        price: Number(item.unitPrice) || 0,
        subtotal: (Number(item.unitPrice) || 0) * (Number(item.qty) || 1),
      }));

      const payload = {
        customerName: trimmedName,
        customerEmail: trimmedEmail,
        customerContact: trimmedContact,
        customerAddress: trimmedAddress,
        employeeId: formData.employeeId,
        installerId: formData.installerId,
        storeBranchId: formData.storeBranchId,
        invoiceDate: formData.invoiceDate?.toISOString(),
        notes: formData.notes,
        items: mappedItems,
        paymentStatus: normalizedStatus,
        subtotal,
        discount,
        discountType: formData.discountType,
        vatAmount,
        vatType: formData.vatType,
        total: grandTotal,
        invoiceType: 'service',
      };
      if (editId) {
        await updateInvoice(editId, payload);
        enqueueSnackbar('Invoice updated', { variant: 'success' });
      } else {
        await createInvoice(payload);
        enqueueSnackbar('Invoice created', { variant: 'success' });
      }
      setFormOpen(false);
      setPage(0);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleAdminConfirm = async () => {
    if (pendingAction === 'save') {
      setFormLoading(true);
      try {
        // Normalize payment status to lowercase
        const normalizedStatus = formData.paymentStatus.toLowerCase();
        
        // Map items to backend schema
        const mappedItems = formData.items.map(item => ({
          service: item.serviceId || undefined,
          serialNo: item.serialNo || '',
          itemName: item.productName || '',
          serviceName:
            item.serviceName ||
            services.find((svc) => String(svc._id || svc.id) === String(item.serviceId))?.name ||
            '',
          quantity: Number(item.qty) || 1,
          price: Number(item.unitPrice) || 0,
          subtotal: (Number(item.unitPrice) || 0) * (Number(item.qty) || 1),
        }));

        const payload = {
          customerName: String(formData.customerName || '').trim(),
          customerEmail: String(formData.customerEmail || '').trim(),
          customerContact: String(formData.customerContact || '').trim(),
          customerAddress: String(formData.customerAddress || '').trim(),
          employeeId: formData.employeeId,
          installerId: formData.installerId,
          storeBranchId: formData.storeBranchId,
          invoiceDate: formData.invoiceDate?.toISOString(),
          notes: formData.notes,
          items: mappedItems,
          paymentStatus: normalizedStatus,
          subtotal,
          discount,
          discountType: formData.discountType,
          vatAmount,
          vatType: formData.vatType,
          total: grandTotal,
          invoiceType: 'service',
        };
        if (editId) {
          await updateInvoice(editId, payload);
          enqueueSnackbar('Invoice updated', { variant: 'success' });
        } else {
          await createInvoice(payload);
          enqueueSnackbar('Invoice created', { variant: 'success' });
        }
        setFormOpen(false);
        setPage(0);
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
        throw err;
      } finally {
        setFormLoading(false);
      }
    } else if (pendingAction === 'delete') {
      try {
        await deleteInvoice(deleteId);
        enqueueSnackbar('Invoice deleted', { variant: 'success' });
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
        throw err;
      }
    }
  };

  const handleViewInvoice = async (row) => {
    // Normalize status for display
    const normalizedRow = {
      ...row,
      paymentStatus: normalizeStatus(row.paymentStatus || row.status),
    };
    setViewInvoice(normalizedRow);
    setViewOpen(true);
    try {
      const res = await getInvoiceQR(row._id || row.id);
      setViewQR(res.data?.qr || res.data?.data || '');
    } catch {
      setViewQR('');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      // Convert capitalized status to lowercase for API
      const lowercaseStatus = status.charAt(0).toLowerCase() + status.slice(1).toLowerCase();
      await updateInvoiceStatus(id, lowercaseStatus);
      enqueueSnackbar('Status updated', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Status update failed', { variant: 'error' });
    }
  };

  const columns = [
    { field: 'invoiceNo', headerName: 'Invoice No', renderCell: ({ row }) => row.invoiceNo || row.invoice_no || '—' },
    { field: 'customer', headerName: 'Customer', renderCell: ({ row }) => row.customer?.name || row.customerName || '—' },
     { field: 'employee', headerName: 'Employee', renderCell: ({ row }) => {
           const e = row.employee;
           const name = String((typeof e === 'string' ? e : e?.name) || row.employeeName || '—');
           const position = e?.position || '';
           if (position) {
             return (
               <Stack direction="row" spacing={0.5} alignItems="center">
                 <Typography variant="body2">{name}</Typography>
                   <br />
                 <Chip label={position} size="small" color={getPositionColor(position)} sx={{ height: 20, fontSize: '0.7rem' }} />
               </Stack>
             );
           }
           return name;
         }},
    { field: 'installer', headerName: 'Installer', renderCell: ({ row }) => {
          const i = row.installer;
          const name = String((typeof i === 'string' ? i : i?.name) || row.installerName || '—');
          const position = i?.position || '';
          const contact = i?.contact || '';
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
    { field: 'storeBranch', headerName: 'Branch', renderCell: ({ row }) => row.storeBranch?.name || row.branchName || '—' },
    { field: 'subtotal', headerName: 'Subtotal', renderCell: ({ row }) => fmt(row.subtotal) },
    { field: 'total', headerName: 'Total', renderCell: ({ row }) => fmt(row.total) },
    { field: 'vatAmount', headerName: 'VAT', renderCell: ({ row }) => fmt(row.vatAmount) },
    {
      field: 'paymentStatus',
      headerName: 'Status',
      renderCell: ({ row }) => {
        const rawStatus = row.paymentStatus || row.status || 'Pending';
        const status = normalizeStatus(rawStatus);
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
    { field: 'invoiceDate', headerName: 'Date', renderCell: ({ row }) => row.invoiceDate ? dayjs(row.invoiceDate).format('MMM DD, YYYY') : '—' },
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

  const invoiceStats = React.useMemo(() => {
    // Normalize statuses for counting
    const normalizeForCompare = (status) => String(status || '').toLowerCase();
    return {
      total: total,
      paid: rows.filter(r => normalizeForCompare(r.paymentStatus || r.status) === 'paid').length,
      pending: rows.filter(r => normalizeForCompare(r.paymentStatus || r.status) === 'pending').length,
      overdue: rows.filter(r => ['due', 'overdue'].includes(normalizeForCompare(r.paymentStatus || r.status))).length,
      totalAmount: rows.reduce((s, r) => s + (r.total || r.totalAmount || 0), 0),
    };
  }, [rows, total]);

  const isInstallerNA = (inv) => {
    const installerObjName = typeof inv.installer === 'object' ? inv.installer?.name : '';
    const installerDirect = typeof inv.installer === 'string' ? inv.installer : '';
    const normalized = String(inv.installerName || installerObjName || installerDirect || '').trim().toLowerCase();
    return !normalized || ['n/a', 'na', 'none', 'null', 'undefined', '-'].includes(normalized);
  };

  const filteredRows = React.useMemo(() => {
    if (installerFilter === 'na-only') return rows.filter(isInstallerNA);
    return rows;
  }, [rows, installerFilter]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MainLayout title="Service Invoices">
        <PageHeader
          title="Service Invoices"
          subtitle="Manage and track all service invoices"
          icon={<HandymanIcon />}
          color="#6a1b9a"
          breadcrumbs={[{ label: 'Invoices' }, { label: 'Service Invoices' }]}
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

        {showDeadlineAlert && upcomingInvoices.length > 0 && (
          <Paper sx={{ p: 2, mb: 2.5, bgcolor: '#fff3cd', border: '1px solid #ffc107', borderRadius: 1 }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box sx={{ color: '#856404', fontSize: '1.5rem' }}>⏰</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#856404' }}>
                  {upcomingInvoices.length} Invoice{upcomingInvoices.length !== 1 ? 's' : ''} Due Soon
                </Typography>
                <Typography variant="body2" sx={{ color: '#856404', mt: 0.5 }}>
                  {upcomingInvoices.slice(0, 3).map(inv => `${inv.customer?.name || 'Unknown'}`).join(', ')}
                  {upcomingInvoices.length > 3 ? ` and ${upcomingInvoices.length - 3} more` : ''}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setShowDeadlineAlert(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>
        )}

        <Paper sx={{ mb: 2, p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              placeholder="Search invoices…"
              size="small"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                label="Filter by Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All Status</MenuItem>
                {Object.keys(STATUS_COLORS).map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
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
          </Stack>
        </Paper>

        <DataTable
          columns={columns}
          rows={filteredRows}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          total={total}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          searchValue=""
          onSearchChange={() => {}}
        />

        <FormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editId ? 'Edit Service Invoice' : 'Create Service Invoice'}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          maxWidth="lg"
        >
          <Grid container spacing={2} mt={0.5}>
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
                  {storeBranches.map((b) => (
                    <MenuItem key={b._id || b.id} value={b._id || b.id}>{b.name}</MenuItem>
                  ))}
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
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Customer Email"
                    fullWidth
                    size="small"
                    value={formData.customerEmail}
                    onChange={setF('customerEmail')}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Customer Contact"
                    fullWidth
                    size="small"
                    value={formData.customerContact}
                    onChange={setF('customerContact')}
                  />
                </Grid>
                <Grid item xs={12} sm={12} md={6}>
                  <TextField
                    label="Customer Address"
                    fullWidth
                    size="small"
                    value={formData.customerAddress}
                    onChange={setF('customerAddress')}
                  />
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

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1}>Add Product Models</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
                <TextField
                  size="small"
                  placeholder="Search product models…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                  }}
                  sx={{ minWidth: 260 }}
                />
              </Stack>
              <Box sx={{ maxHeight: 140, overflowY: 'auto', mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {products.map((prod) => {
                  const pid = prod._id || prod.id;
                  const pname = prod.name || prod.productName?.name || prod.productName || 'Unnamed Product';
                  const psrp = Number(prod.price ?? prod.srp ?? prod.unitPrice ?? 0);

                  return (
                    <Box
                      key={pid}
                      sx={{ p: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 0.5 }}
                      onClick={() => addProductModelToCart(prod)}
                    >
                      <Typography variant="body2">
                        {String(pname)} — SRP: {fmt(psrp)}
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
                      <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SRP</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 2 }}>
                          <Typography variant="body2" color="text.secondary">No services added</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <TextField
                              size="small"
                              value={it.serialNo || ''}
                              onChange={(e) => updateItem(idx, 'serialNo', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={it.productName || ''}
                              onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                              placeholder="Product name"
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" fullWidth sx={{ minWidth: 160 }}>
                              <Select
                                value={it.serviceId || ''}
                                displayEmpty
                                onChange={(e) => {
                                  const selected = services.find((svc) => String(svc._id || svc.id) === String(e.target.value));
                                  updateItem(idx, 'serviceId', e.target.value);
                                  if (selected) {
                                    updateItem(idx, 'serviceName', String(selected.name || ''));
                                    updateItem(idx, 'unitPrice', Number(selected.price || selected.srp || 0));
                                  }
                                }}
                              >
                                <MenuItem value=""><em>Select service</em></MenuItem>
                                {services.map((svc) => {
                                  const sid = svc._id || svc.id;
                                  return <MenuItem key={sid} value={sid}>{String(svc.name || 'Service')}</MenuItem>;
                                })}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={it.unitPrice}
                              onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                              inputProps={{ min: 0, style: { width: 90 } }} />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={it.qty}
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

        <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Service Invoice Details</Typography>
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
          <DialogContent>
            {viewInvoice && (
              <InvoicePrint ref={printRef} invoice={viewInvoice} company={company} qrValue={viewQR} />
            )}
          </DialogContent>
        </Dialog>

        <AdminConfirmDialog
          open={adminOpen}
          onClose={() => setAdminOpen(false)}
          onConfirm={handleAdminConfirm}
          title="Delete Invoice"
          description="Enter admin password to delete this invoice."
        />
      </MainLayout>
    </LocalizationProvider>
  );
}
