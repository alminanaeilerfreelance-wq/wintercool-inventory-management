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
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
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
import Tooltip from '@mui/material/Tooltip';
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
  pending: 'warning',
  open: 'info',
  paid: 'success',
  cancelled: 'default',
  due: 'error',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'open', label: 'Open' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'due', label: 'Due' },
];

const POSITION_COLORS = {
  'Accounting Officer': 'info',
  Manager: 'primary',
  Installer: 'success',
  'Sales Representative': 'warning',
  Cashier: 'secondary',
  Supervisor: 'error',
  Admin: 'default',
  Engineer: 'info',
  Technician: 'success',
  'Duct Installer': 'success',
};

const DEFAULT_POSITION_COLOR = 'default';

const getPositionColor = (position) => {
  if (!position) return DEFAULT_POSITION_COLOR;
  if (POSITION_COLORS[position]) return POSITION_COLORS[position];
  const posLower = String(position).toLowerCase();
  for (const [key, color] of Object.entries(POSITION_COLORS)) {
    if (key.toLowerCase() === posLower) return color;
  }
  return DEFAULT_POSITION_COLOR;
};

const normalizeStatus = (status) => {
  if (!status) return 'Pending';
  const statusLower = String(status).toLowerCase();
  const statusMap = {
    pending: 'Pending',
    open: 'Open',
    paid: 'Paid',
    cancelled: 'Cancelled',
    due: 'Due',
  };
  return statusMap[statusLower] || 'Pending';
};

const normalizeStatusValue = (status) => {
  if (!status) return 'pending';
  return String(status).toLowerCase();
};

const EMPTY_FORM = {
  subDealerId: '',
  employeeId: '',
  storeBranchId: '',
  invoiceDate: dayjs(),
  notes: '',
  items: [],
  discountType: 'fixed',
  discountAmount: 0,
  vatType: 'exclusive',
  paymentStatus: 'pending',
  calendarDate: null,
  calendarTitle: '',
  enableCalendar: false,
};

export default function SubDealerInvoicesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { company } = useSettings();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subDealers, setSubDealers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [storeBranches, setStoreBranches] = useState([]);
  const [installers, setInstallers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');

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

  const vatRate = 12;

  const fetchLookups = useCallback(async () => {
    try {
      const [subRes, eRes, bRes, uRes] = await Promise.all([
        api.get('/sub-dealers').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
        api.get('/store-branches').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
      ]);
      const normalize = (r) => {
        const d = r.data?.data || r.data;
        return Array.isArray(d) ? d : d?.items || [];
      };
      setSubDealers(normalize(subRes));
      setEmployees(normalize(eRes));
      setStoreBranches(normalize(bRes));
      setInstallers(normalize(uRes));
    } catch (err) {
      console.error('Lookup load failed', err);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await getInventory({ search: inventorySearch, limit: 50 });
      const d = res.data?.data || res.data;
      setInventoryItems(Array.isArray(d) ? d : d?.items || d?.inventory || []);
    } catch (err) {
      console.error('Inventory load failed', err);
    }
  }, [inventorySearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        invoiceType: 'sub-dealer',
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('paymentStatus', statusFilter);

      const res = await api.get(`/invoices?${params}`);
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.invoices || [];
      setRows(items);
      setTotal(res.data?.total || res.data?.pagination?.total || items.length);
    } catch (err) {
      enqueueSnackbar('Failed to load sub-dealer invoices', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, enqueueSnackbar]);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (formOpen) fetchInventory(); }, [formOpen, fetchInventory]);

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setFormData({
      subDealerId: row.subDealerId || row.subDealer?._id || '',
      employeeId: row.employeeId || row.employee?._id || '',
      storeBranchId: row.storeBranchId || row.storeBranch?._id || '',
      invoiceDate: row.invoiceDate ? dayjs(row.invoiceDate) : dayjs(),
      notes: row.notes || '',
      items: (row.items || []).map((it) => ({
        inventoryId: it.inventory?._id || it.inventory || it.inventoryId || '',
        productName: it.itemName || it.productName || it.product?.name || '',
        unitPrice: it.price || it.unitPrice || 0,
        qty: it.quantity || it.qty || 1,
      })),
      discountType: row.discountType || 'fixed',
      discountAmount: row.discountAmount || row.discount || 0,
      vatType: row.vatType || 'exclusive',
      paymentStatus: normalizeStatusValue(row.paymentStatus || row.status) || 'pending',
      invoiceDate: row.invoiceDate ? dayjs(row.invoiceDate) : dayjs(),
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const setF = (field) => (event) => setFormData((prev) => ({ ...prev, [field]: event.target.value }));

  const addItemToCart = (inv) => {
    const id = inv._id || inv.id;
    setFormData((prev) => {
      if (prev.items.find((item) => item.inventoryId === id)) return prev;
      let productName = 'Unknown';
      if (typeof inv.product === 'string') productName = inv.product;
      else if (inv.product?.name) productName = inv.product.name;
      else if (typeof inv.productName === 'string') productName = inv.productName;
      else if (inv.productName?.name) productName = inv.productName.name;
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            inventoryId: id,
            productName: String(productName),
            unitPrice: inv.srp || inv.unitPrice || 0,
            qty: 1,
          },
        ],
      };
    });
  };

  const updateItem = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }));
  };

  const removeItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const subtotal = formData.items.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.qty) || 0), 0);
  const discountAmount = Number(formData.discountAmount) || 0;
  const discount =
    formData.discountType === 'percent'
      ? subtotal * (discountAmount / 100)
      : discountAmount;
  const afterDiscount = subtotal - discount;
  const vatAmount =
    formData.vatType === 'exclusive'
      ? 0
      : formData.vatType === 'inclusive'
      ? (afterDiscount * vatRate) / 100
      : 0;

  const grandTotal =
    formData.vatType === 'exclusive'
      ? afterDiscount
      : afterDiscount + vatAmount;


  const handleFormSubmit = async () => {
    if (!formData.subDealerId) {
      enqueueSnackbar('Sub-dealer is required', { variant: 'warning' });
      return;
    }
    if (formData.items.length === 0) {
      enqueueSnackbar('Please add at least one stock item to the cart', { variant: 'warning' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        invoiceType: 'sub-dealer',
        subDealerId: formData.subDealerId,
        employeeId: formData.employeeId || undefined,
        storeBranchId: formData.storeBranchId || undefined,
        invoiceDate: formData.invoiceDate?.toISOString(),
        notes: formData.notes,
        items: formData.items.map((item) => ({
          inventory: item.inventoryId,
          itemName: item.productName,
          quantity: item.qty,
          price: item.unitPrice,
        })),
        discountType: formData.discountType,
        discount: discountAmount,
        vatType: formData.vatType,
        vatRate: vatRate,
        subtotal,
        vatAmount,
        total: grandTotal,
        paymentStatus: normalizeStatusValue(formData.paymentStatus) || 'pending',
      };

      if (formData.enableCalendar && formData.calendarDate) {
        payload.calendarDate = formData.calendarDate.toISOString();
        payload.calendarTitle = formData.calendarTitle || `SubDealer Invoice ${dayjs().format('MMDD')}`;
      }

      if (editId) {
        await updateInvoice(editId, payload);
        enqueueSnackbar('Invoice updated successfully', { variant: 'success' });
      } else {
        await createInvoice(payload);
        enqueueSnackbar('Invoice created successfully', { variant: 'success' });
      }

      setFormOpen(false);
      setEditId(null);
      setFormData(EMPTY_FORM);
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
        enqueueSnackbar('Invoice deleted successfully', { variant: 'success' });
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
    setViewInvoice(row);
    setViewOpen(true);
    try {
      const res = await getInvoiceQR(row._id || row.id);
      const qrData = res.data?.qrCode || res.data?.qr || '';
      // Limit QR data length to avoid "Data too long" error
      const safeQrData = qrData.length > 200 ? qrData.substring(0, 200) : qrData;
      setViewQR(safeQrData);
    } catch {
      setViewQR('');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const lowercaseStatus = status.charAt(0).toLowerCase() + status.slice(1).toLowerCase();
      await updateInvoiceStatus(id, lowercaseStatus);
      enqueueSnackbar('Status updated', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Status update failed', { variant: 'error' });
    }
  };

  const columns = [
    {
      field: 'invoiceNo',
      headerName: 'Invoice No',
      renderCell: ({ row }) => String(row.invoiceNo || row.invoice_no || '—'),
    },
    {
      field: 'subDealer',
      headerName: 'Sub Dealer',
      renderCell: ({ row }) => {
        const sub = row.subDealer;
        return String((typeof sub === 'string' ? sub : sub?.name) || row.subDealerName || '—');
      },
    },
    {
      field: 'employee',
      headerName: 'Employee',
      renderCell: ({ row }) => {
        const employee = row.employee;
        const name = String((typeof employee === 'string' ? employee : employee?.name) || row.employeeName || '—');
        const position = employee?.position || '';
        if (position) {
          return (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="body2">{name}</Typography>
              <Chip label={position} size="small" color={getPositionColor(position)} sx={{ height: 20, fontSize: '0.7rem' }} />
            </Stack>
          );
        }
        return name;
      },
    },
    {
      field: 'storeBranch',
      headerName: 'Branch',
      renderCell: ({ row }) => {
        const branch = row.storeBranch;
        return String((typeof branch === 'string' ? branch : branch?.name) || row.branchName || '—');
      },
    },
    {
      field: 'subtotal',
      headerName: 'Subtotal',
      renderCell: ({ row }) => fmt(row.subtotal || 0),
    },
    {
      field: 'total',
      headerName: 'Total',
      renderCell: ({ row }) => fmt(row.total || 0),
    },
    {
      field: 'paymentStatus',
      headerName: 'Status',
      renderCell: ({ row }) => {
        const statusValue = normalizeStatusValue(row.paymentStatus || row.status);
        return (
          <Select
            size="small"
            value={statusValue}
            onChange={(e) => handleStatusChange(row._id || row.id, e.target.value)}
            variant="standard"
            disableUnderline
            renderValue={(value) => <Chip label={normalizeStatus(value)} size="small" color={STATUS_COLORS[value] || 'default'} />}
            sx={{ '& .MuiSelect-select': { p: 0 } }}
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
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
      },
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

  const invoiceStats = React.useMemo(() => ({
    total: total,
    paid: rows.filter((r) => ['Paid', 'paid'].includes(r.paymentStatus || r.status)).length,
    pending: rows.filter((r) => ['Pending', 'pending'].includes(r.paymentStatus || r.status)).length,
    overdue: rows.filter((r) => ['Due', 'due', 'Overdue', 'overdue'].includes(r.paymentStatus || r.status)).length,
    totalAmount: rows.reduce((sum, row) => sum + (row.total || row.totalAmount || 0), 0),
  }), [rows, total]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MainLayout title="Sub Dealer Invoices">
        <PageHeader
          title="Sub Dealer Invoices"
          subtitle="Create and manage sub-dealer invoices with stock selection and print support"
          icon={<ReceiptIcon />}
          color="#6a1b9a"
          breadcrumbs={[{ label: 'Invoices' }, { label: 'Sub Dealer Invoices' }]}
          actions={
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
              New Invoice
            </Button>
          }
        />

        <Grid container spacing={2} mb={2.5}>
          {[
            { label: 'Total Invoices', value: invoiceStats.total, color: '#6a1b9a' },
            { label: 'Paid', value: invoiceStats.paid, color: '#2e7d32' },
            { label: 'Pending', value: invoiceStats.pending, color: '#ed6c02' },
            { label: 'Due / Overdue', value: invoiceStats.overdue, color: '#d32f2f' },
          ].map((card) => (
            <Grid item xs={12} sm={6} md={3} key={card.label}>
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
        </Grid>

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          total={total}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); }}
          searchValue={search}
          onSearchChange={(value) => { setSearch(value); setPage(0); }}
        />

        <FormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editId ? 'Edit Sub-Dealer Invoice' : 'Create Sub-Dealer Invoice'}
          onSubmit={handleFormSubmit}
          loading={formLoading}
          maxWidth="lg"
        >
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sub Dealer</InputLabel>
                <Select value={formData.subDealerId} label="Sub Dealer" onChange={setF('subDealerId')}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {subDealers.map((sd) => (
                    <MenuItem key={sd._id || sd.id} value={sd._id || sd.id}>{sd.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Employee</InputLabel>
                <Select value={formData.employeeId} label="Employee" onChange={setF('employeeId')}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {employees.map((e) => {
                    const name = String(e?.name || e?.firstName || '—');
                    const position = e?.position ? ` (${e.position})` : '';
                    return <MenuItem key={e._id || e.id} value={e._id || e.id}>{name + position}</MenuItem>;
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Branch</InputLabel>
                <Select value={formData.storeBranchId} label="Branch" onChange={setF('storeBranchId')}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {storeBranches.map((branch) => (
                    <MenuItem key={branch._id || branch.id} value={branch._id || branch.id}>{branch.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Invoice Date"
                value={formData.invoiceDate}
                onChange={(value) => setFormData((prev) => ({ ...prev, invoiceDate: value }))}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                size="small"
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enableCalendar || false}
                    onChange={(event) => setFormData((prev) => ({ ...prev, enableCalendar: event.target.checked }))}
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
                    onChange={(value) => setFormData((prev) => ({ ...prev, calendarDate: value }))}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Event Title"
                    fullWidth
                    size="small"
                    value={formData.calendarTitle}
                    onChange={(event) => setFormData((prev) => ({ ...prev, calendarTitle: event.target.value }))}
                    placeholder="e.g. Delivery Schedule"
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Add Stock Items
              </Typography>
              <TextField
                size="small"
                placeholder="Search inventory…"
                value={inventorySearch}
                onChange={(event) => setInventorySearch(event.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                }}
                sx={{ mb: 1, minWidth: 260 }}
              />
              <Box sx={{ maxHeight: 160, overflowY: 'auto', mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {inventoryItems.map((inv) => {
                  let productName = 'Unknown';
                  if (typeof inv.product === 'string') productName = inv.product;
                  else if (inv.product?.name) productName = inv.product.name;
                  else if (typeof inv.productName === 'string') productName = inv.productName;
                  else if (inv.productName?.name) productName = inv.productName.name;

                  return (
                    <Box
                      key={inv._id || inv.id}
                      sx={{ p: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1 }}
                      onClick={() => addItemToCart(inv)}
                    >
                      <Typography variant="body2">
                        {productName} — SRP: {fmt(inv.srp || inv.unitPrice || 0)} — Stock: {inv.quantity || 0}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Unit Price</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                          <Typography variant="body2" color="text.secondary">No items added</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.productName || '—'}</TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={item.unitPrice || 0}
                              onChange={(event) => updateItem(index, 'unitPrice', Number(event.target.value))}
                              inputProps={{ min: 0, style: { width: 90 } }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={item.qty || 1}
                              onChange={(event) => updateItem(index, 'qty', Number(event.target.value))}
                              inputProps={{ min: 1, style: { width: 70 } }}
                            />
                          </TableCell>
                          <TableCell>{fmt((item.unitPrice || 0) * (item.qty || 0))}</TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeItem(index)}>
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
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Discount Type</InputLabel>
                    <Select value={formData.discountType} label="Discount Type" onChange={setF('discountType')}>
                      <MenuItem value="fixed">Fixed</MenuItem>
                      <MenuItem value="percent">Percent</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    label="Discount"
                    type="number"
                    value={formData.discountAmount}
                    onChange={(event) => setFormData((prev) => ({ ...prev, discountAmount: Number(event.target.value) }))}
                    inputProps={{ min: 0 }}
                  />
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
                    {STATUS_OPTIONS.map(({ value, label }) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
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

        <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Invoice Preview</Typography>
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
