import React, { useState, useEffect, useCallback } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import { useSnackbar } from 'notistack';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

import MainLayout from '../../components/Layout/MainLayout';
import PageHeader from '../../components/Common/PageHeader';
import DataTable from '../../components/Common/DataTable';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import { getCRUD } from '../../utils/api';

const api = getCRUD('sub-dealers');
const EMPTY_FORM = {
  name: '',
  email: '',
  contact: '',
  address: '',
  city: '',
  status: 'Active',
};

export default function SubDealersPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAll({ page: page + 1, limit: rowsPerPage, search });
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || [];
      setRows(items);
      setTotal(res.data.total || res.data.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Unable to load sub-dealers', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setFormData({
      name: row.name || '',
      email: row.email || '',
      contact: row.contact || '',
      address: row.address || '',
      city: row.city || '',
      status: row.status || 'Active',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const handleFormSubmit = () => {
    if (!formData.name) {
      enqueueSnackbar('Name is required', { variant: 'warning' });
      return;
    }
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    setFormLoading(true);
    try {
      if (editId) {
        await api.update(editId, formData);
        enqueueSnackbar('Sub-dealer updated successfully', { variant: 'success' });
      } else {
        await api.create(formData);
        enqueueSnackbar('Sub-dealer created successfully', { variant: 'success' });
      }
      setFormOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.remove(deleteId);
      enqueueSnackbar('Sub-dealer deleted', { variant: 'success' });
      setDeleteOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const columns = [
    { field: 'name', headerName: 'Name' },
    { field: 'email', headerName: 'Email' },
    { field: 'contact', headerName: 'Contact' },
    { field: 'city', headerName: 'City' },
    { field: 'status', headerName: 'Status', renderCell: ({ value }) => (
      <Chip size="small" label={value || 'Active'} color={value === 'Active' ? 'success' : 'default'} />
    )},
    {
      field: 'actions',
      headerName: 'Actions',
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small" color="warning" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => { setDeleteId(row._id || row.id); setDeleteOpen(true); }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <MainLayout title="Sub Dealers">
      <PageHeader
        title="Sub Dealers"
        subtitle={`Manage sub-dealers for your admin dashboard`}
        icon={<StorefrontIcon />}
        color="#00796b"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Sub Dealers' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Sub Dealer
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 3, background: '#e8f5e9' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Sub Dealers
            </Typography>
            <Typography variant="h4" fontWeight={800}>
              {total.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Add, edit, and remove sub-dealer accounts from the admin panel.
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 3, background: '#fff7e6' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PeopleAltIcon color="primary" />
              <Typography variant="subtitle2" color="text.secondary">
                Professional management panel for admin users
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Create and maintain a clean list of authorized sub-dealers with contact details and status.
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <DataTable
          title="Sub Dealer List"
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
          actions={
            <Button size="small" variant="outlined" onClick={openAdd} startIcon={<AddIcon />}>
              New Sub Dealer
            </Button>
          }
        />
      </Box>

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edit Sub Dealer' : 'Add Sub Dealer'}
        subtitle="Enter sub-dealer details"
        onSubmit={handleFormSubmit}
        loading={formLoading}
        maxWidth="md"
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Contact"
              value={formData.contact}
              onChange={(e) => setFormData((prev) => ({ ...prev, contact: e.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="City"
              value={formData.city}
              onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={12}>
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </FormDialog>

      <AdminConfirmDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onConfirm={handleAdminConfirm}
        title="Confirm Sub Dealer Change"
        description="Enter admin password to save this record."
      />

      <AdminConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Sub Dealer"
        description="Enter admin password to confirm deletion."
      />
    </MainLayout>
  );
}
