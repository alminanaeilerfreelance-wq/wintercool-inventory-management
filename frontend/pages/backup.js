import React, { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import BackupIcon from '@mui/icons-material/Backup';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import StorageIcon from '@mui/icons-material/Storage';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import MainLayout from '../components/Layout/MainLayout';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function BackupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fileInputRef = useRef(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wms-backup-${dayjs().format('YYYY-MM-DD')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      enqueueSnackbar('Backup exported successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Export failed', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      enqueueSnackbar('Please select a valid .json backup file', { variant: 'warning' });
      return;
    }
    setSelectedFile(file);
    setConfirmOpen(true);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!selectedFile) return;
    setConfirmOpen(false);
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('backup', selectedFile);
      const res = await api.post('/backup/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      enqueueSnackbar(`Import completed — ${res.data.totalRestored} records restored`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Import failed', { variant: 'error' });
    } finally {
      setImporting(false);
      setSelectedFile(null);
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout title="Backup">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 2.5, textAlign: 'center', px: 3 }}>
          <Box sx={{ width: 96, height: 96, borderRadius: '50%', bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <LockIcon sx={{ fontSize: 52, color: '#bdbdbd' }} />
          </Box>
          <Typography variant="h4" fontWeight={800}>Access Denied</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 360 }}>
            This page is restricted to administrators only.
          </Typography>
          <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')}
            sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3, py: 1.2, bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>
            Back to Dashboard
          </Button>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Backup">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar sx={{ bgcolor: '#1565c0', width: 48, height: 48 }}>
            <BackupIcon sx={{ fontSize: 26 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ background: 'linear-gradient(135deg, #1565c0 0%, #7b1fa2 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Database Backup
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Export your database or restore from a previous backup
            </Typography>
          </Box>
        </Box>
      </Box>

      <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
        <strong>Important:</strong> The import operation will overwrite existing data in the selected collections. Ensure you have a recent export before importing.
      </Alert>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Export Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%', background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#1565c0', width: 40, height: 40 }}>
                    <CloudDownloadIcon sx={{ color: 'white', fontSize: 22 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="#1565c0">Export Database</Typography>
                    <Typography variant="body2" color="text.secondary">Download a full backup</Typography>
                  </Box>
                </Box>
              }
              sx={{ pb: 1 }}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Creates a complete JSON backup of all database collections including inventory, invoices, customers, suppliers, employees, products, and more.
              </Typography>
              <Box sx={{ mb: 2 }}>
                {['Inventory & Products', 'Invoices & Purchase Orders', 'Customers & Suppliers', 'Employees & Users', 'Settings & Configuration'].map((item) => (
                  <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: '#1565c0' }} />
                    <Typography variant="caption" color="text.secondary">{item}</Typography>
                  </Box>
                ))}
              </Box>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <CloudDownloadIcon />}
                onClick={handleExport}
                disabled={exporting}
                sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' }, borderRadius: 2, fontWeight: 700, py: 1.5 }}
              >
                {exporting ? 'Exporting…' : 'Export Backup'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Import Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%', background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#c62828', width: 40, height: 40 }}>
                    <CloudUploadIcon sx={{ color: 'white', fontSize: 22 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="#c62828">Import Database</Typography>
                    <Typography variant="body2" color="text.secondary">Restore from backup file</Typography>
                  </Box>
                </Box>
              }
              sx={{ pb: 1 }}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Upload a previously exported JSON backup file to restore your database. This will overwrite existing data in the restored collections.
              </Typography>
              <Box sx={{ mb: 2 }}>
                {['Accepts .json backup files only', 'Restores all included collections', 'Skips empty collections', 'Reports results per collection'].map((item) => (
                  <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <WarningAmberIcon sx={{ fontSize: 16, color: '#c62828' }} />
                    <Typography variant="caption" color="text.secondary">{item}</Typography>
                  </Box>
                ))}
              </Box>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                sx={{ bgcolor: '#c62828', '&:hover': { bgcolor: '#b71c1c' }, borderRadius: 2, fontWeight: 700, py: 1.5 }}
              >
                {importing ? 'Importing…' : 'Import Backup'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Import Progress */}
      {importing && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <StorageIcon color="primary" />
            <Typography variant="body1" fontWeight={600}>Restoring database…</Typography>
          </Box>
          <LinearProgress sx={{ borderRadius: 1 }} />
        </Paper>
      )}

      {/* Import Results */}
      {importResult && (
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'success.light', mb: 3 }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight={700} color="success.dark">Import Completed</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {importResult.totalRestored} records restored
                    {importResult.exportedAt && ` · Backup from ${dayjs(importResult.exportedAt).format('MMM DD, YYYY HH:mm')}`}
                  </Typography>
                </Box>
              </Box>
            }
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Collection</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Result</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Records</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(importResult.results || {}).map(([col, result]) => (
                    <TableRow key={col} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{col}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={result.error ? 'Error' : result.skipped ? 'Skipped' : 'Restored'}
                          size="small"
                          color={result.error ? 'error' : result.skipped ? 'default' : 'success'}
                          sx={{ fontSize: '0.75rem', height: 22 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {result.error
                          ? <Typography variant="caption" color="error.main">{result.error}</Typography>
                          : result.skipped
                          ? <Typography variant="caption" color="text.disabled">—</Typography>
                          : <Typography variant="caption" fontWeight={600} color="success.main">{result.restored}</Typography>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Confirm Import Dialog */}
      <Dialog open={confirmOpen} onClose={() => { setConfirmOpen(false); setSelectedFile(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon /> Confirm Database Import
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ py: 2.5 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action will <strong>overwrite existing data</strong> in all restored collections. This cannot be undone.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            You are about to import: <strong>{selectedFile?.name}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            All documents in the backed-up collections will be replaced. Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setConfirmOpen(false); setSelectedFile(null); }} color="inherit">Cancel</Button>
          <Button variant="contained" color="error" onClick={handleImportConfirm} startIcon={<CloudUploadIcon />}>
            Yes, Import
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
