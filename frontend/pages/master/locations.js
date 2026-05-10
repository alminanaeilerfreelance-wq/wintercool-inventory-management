import React, { useState, useEffect, useCallback } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';

import Stack from '@mui/material/Stack';

import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';


import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import { getCRUD } from '../../utils/api';

const locationsApi = getCRUD('locations');
const EMPTY_FORM = { name: '', description: '' };

export default function LocationsPage() {
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
      const res = await locationsApi.getAll({ page: page + 1, limit: rowsPerPage, search });
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || data.locations || [];
      setRows(items);
      setTotal(res.data.total || res.data.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load locations', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, enqueueSnackbar]);


  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setFormData(EMPTY_FORM); setEditId(null); setFormOpen(true); };
  const openEdit = (row) => {
    setFormData({
      name: row.name || '',
      description: row.description || '',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };






  const handleFormSubmit = async () => {
    setFormLoading(true);
    try {
      if (editId) {
        await locationsApi.update(editId, formData);
        enqueueSnackbar('Location updated successfully', { variant: 'success' });
      } else {
        await locationsApi.create(formData);
        enqueueSnackbar('Location created successfully', { variant: 'success' });
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
      await locationsApi.remove(deleteId);
      enqueueSnackbar('Location deleted', { variant: 'success' });
      setDeleteOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const columns = [
    { field: 'name', headerName: 'Name' },
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
              onClick={() => {
                setDeleteId(row._id || row.id);
                setDeleteOpen(true);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];


  return (
    <MainLayout title="Locations">
      <PageHeader
        title="Locations"
        subtitle={`${total} location${total !== 1 ? 's' : ''} registered`}
        icon={<LocationOnIcon />}
        color="#880e4f"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Locations' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Location
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        total={total}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
      />

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edit Location' : 'Add Location'}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        maxWidth="md"
      >
        <Stack spacing={2} mt={1}>
          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            fullWidth
            required
          />
     
        </Stack>

      </FormDialog>

   

      <AdminConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Location"
        description="Are you sure you want to delete this location? Enter admin password to confirm."
      />
    </MainLayout>
  );
}
