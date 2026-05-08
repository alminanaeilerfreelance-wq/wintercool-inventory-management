import React, { useState, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
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
import { saveAs } from 'file-saver';

import AssessmentIcon from '@mui/icons-material/Assessment';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';

import MainLayout from '../../components/Layout/MainLayout';
import ReportPrint from '../../components/Reports/ReportPrint';
import PageHeader from '../../components/Common/PageHeader';
import { getReports } from '../../utils/api';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';



const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  pending: 'warning',
  open: 'info',
  paid: 'success',
  cancelled: 'default',
  due: 'error',
};

export default function SubDealerInvoicesReportPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { company } = useSettings();
  const { user } = useAuth();

  const [dateFrom, setDateFrom] = useState(dayjs().startOf('month'));
  const [dateTo, setDateTo] = useState(dayjs());

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const [reportData, setReportData] = useState([]);
  const [summaryTotals, setSummaryTotals] = useState(null);

  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);

  const printRef = useRef();
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const totals = reportData.reduce(
    (acc, row) => ({
      subtotal: acc.subtotal + (row.subtotal || 0),
      vatAmount: acc.vatAmount + (row.vatAmount || 0),
      total: acc.total + (row.total || 0),
    }),
    { subtotal: 0, vatAmount: 0, total: 0 }
  );

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await getReports('sub-dealer-invoices', {
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
        status: statusFilter || undefined,
        search: search || undefined,
        raw: true,
      });
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.rows || [];

      setReportData(items);
      setSummaryTotals(res.data?.totals || res.data?.data?.totals || null);
      setGenerated(true);
    } catch {
      enqueueSnackbar('Failed to generate report', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      // Not required by task, but keeps parity with other report pages.
      const res = await exportReportExcel('sub-dealer-invoices', {
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
        status: statusFilter || undefined,
        search: search || undefined,
      });

      const blob = new Blob([res.data], {
        type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, 'sub-dealer-invoices-report.xlsx');
    } catch {
      enqueueSnackbar('Export failed', { variant: 'error' });
    }
  };

  const columns = [
    { field: 'invoiceDate', headerName: 'Date' },
    { field: 'invoiceNo', headerName: 'Invoice No' },
    { field: 'subDealer', headerName: 'Sub Dealer' },
    { field: 'branch', headerName: 'Branch' },
    { field: 'subtotal', headerName: 'Subtotal' },
    { field: 'vatAmount', headerName: 'VAT' },
    { field: 'total', headerName: 'Total' },
    { field: 'status', headerName: 'Status' },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MainLayout title="Sub Dealer Invoices Report">
        <PageHeader
          title="Sub Dealer Invoices Report"
          subtitle="Generate sub-dealer invoice invoices using a date range and print"
          icon={<AssessmentIcon />}
          color="#6a1b9a"
          breadcrumbs={[{ label: 'Reports' }, { label: 'Sub Dealer Invoices' }]}
          actions={
            generated ? (
              <>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PrintIcon />}
                  onClick={() => setPrintPreviewOpen(true)}
                  sx={{ bgcolor: '#6a1b9a' }}
                >
                  Print Preview
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportExcel}
                >
                  Excel
                </Button>
              </>
            ) : null
          }
        />

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Date From"
                value={dateFrom}
                onChange={setDateFrom}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Date To"
                value={dateTo}
                onChange={setDateTo}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="due">Due</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={12} md={3}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<AssessmentIcon />}
                  onClick={handleGenerate}
                  disabled={loading}
                  sx={{ bgcolor: '#6a1b9a' }}
                >
                  {loading ? 'Generating…' : 'Generate Report'}
                </Button>
              </Stack>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={8} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                placeholder="Search by invoice no, sub-dealer, branch, status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {generated && (
          <>
            <Paper variant="outlined">
              <Box sx={{ p: 2, textAlign: 'center' }}>
                {company?.logo && (
                  <Box component="img" src={company.logo} alt="logo" sx={{ height: 60, mb: 1 }} />
                )}
                <Typography variant="h6" fontWeight={700}>{company?.name || 'Company Name'}</Typography>
                <Typography variant="body2" color="text.secondary">{company?.address}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sub Dealer Invoices — {dateFrom?.format('MMM DD, YYYY')} to {dateTo?.format('MMM DD, YYYY')}
                </Typography>
              </Box>
              <Divider />

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Invoice No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Sub Dealer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>VAT</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">No data found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {reportData.map((row, idx) => (
                          <TableRow key={row._id || row.id || idx} sx={{ bgcolor: idx % 2 === 0 ? 'background.paper' : 'grey.50' }}>
                            <TableCell>
                              {row.invoiceDate ? dayjs(row.invoiceDate).format('MMM DD, YYYY') : '—'}
                            </TableCell>
                            <TableCell>{row.invoiceNo || '—'}</TableCell>
                            <TableCell>{row.subDealer?.name || '—'}</TableCell>
                            <TableCell>{row.branch?.name || '—'}</TableCell>
                            <TableCell>{fmt(row.subtotal || 0)}</TableCell>
                            <TableCell>{fmt(row.vatAmount || 0)}</TableCell>
                            <TableCell>{fmt(row.total || 0)}</TableCell>
                            <TableCell>
                              <Chip
                                label={row.status || 'pending'}
                                size="small"
                                color={STATUS_COLORS[row.status] || 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}

                        <TableRow sx={{ bgcolor: 'grey.200' }}>
                          <TableCell colSpan={4} sx={{ fontWeight: 700 }}>TOTALS</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.subtotal)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.vatAmount)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.total)}</TableCell>
                          <TableCell />
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Box sx={{ display: 'none' }}>
              <ReportPrint
                ref={printRef}
                data={reportData}
                totals={{ subtotal: fmt(totals.subtotal), vatAmount: fmt(totals.vatAmount), total: fmt(totals.total) }}
                filters={{
                  dateFrom: dateFrom?.format('MMM DD, YYYY'),
                  dateTo: dateTo?.format('MMM DD, YYYY'),
                  status: statusFilter || 'All',
                }}
                reportType="Sub Dealer Invoices Report"
                company={company}
                columns={columns}
                summaryTotals={summaryTotals}
                preparedBy={user?.username || user?.customerName || user?.name || ''}
              />
            </Box>

            <Dialog open={printPreviewOpen} onClose={() => setPrintPreviewOpen(false)} maxWidth="md" fullWidth>
              <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 700 }}>
                Sub Dealer Invoices Report Preview
              </DialogTitle>
              <DialogContent dividers sx={{ maxHeight: '70vh', overflow: 'auto', bgcolor: '#f9f9f9', p: 3 }}>
                <Box sx={{ bgcolor: 'white', p: 3, borderRadius: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <Box sx={{ textAlign: 'center', mb: 3, pb: 2, borderBottom: '2px solid #2c3e50' }}>
                    <Typography variant="h5" fontWeight={700} sx={{ color: '#6a1b9a', mb: 1 }}>
                      SUB DEALER INVOICES REPORT
                    </Typography>
                    <Typography variant="body2">
                      {dateFrom?.format('MMM DD, YYYY')} to {dateTo?.format('MMM DD, YYYY')}
                    </Typography>
                    {statusFilter && (
                      <Typography variant="body2">Status: {statusFilter}</Typography>
                    )}
                  </Box>

                  <Table size="small" sx={{ mb: 2 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#ecf0f1' }}>
                        <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Invoice No</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Sub Dealer</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Branch</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50' }}>Subtotal</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50' }}>VAT</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50' }}>Total</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.map((row, idx) => (
                        <TableRow key={row._id || row.id || idx} sx={{ '&:nth-of-type(even)': { bgcolor: '#f8f9fa' } }}>
                          <TableCell sx={{ py: 1.5 }}>{row.invoiceDate ? dayjs(row.invoiceDate).format('MMM DD, YYYY') : '—'}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>{row.invoiceNo || '—'}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>{row.subDealer?.name || '—'}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>{row.branch?.name || '—'}</TableCell>
                          <TableCell align="right" sx={{ py: 1.5 }}>₱{fmt(row.subtotal || 0)}</TableCell>
                          <TableCell align="right" sx={{ py: 1.5 }}>₱{fmt(row.vatAmount || 0)}</TableCell>
                          <TableCell align="right" sx={{ py: 1.5, fontWeight: 600 }}>₱{fmt(row.total || 0)}</TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Chip
                              label={row.status || 'pending'}
                              size="small"
                              color={STATUS_COLORS[row.status] || 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableRow sx={{ bgcolor: '#e3f2fd', fontWeight: 700 }}>
                        <TableCell colSpan={4} sx={{ fontWeight: 700, py: 1.5 }}>TOTALS</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, py: 1.5 }}>₱{fmt(totals.subtotal)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, py: 1.5 }}>₱{fmt(totals.vatAmount)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, py: 1.5, color: '#6a1b9a' }}>₱{fmt(totals.total)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>

                  <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          Prepared By: <strong>{user?.username || user?.customerName || user?.name || '—'}</strong>
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2">
                          Generated: <strong>{dayjs().format('MMM DD, YYYY HH:mm')}</strong>
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Button onClick={() => setPrintPreviewOpen(false)} variant="outlined">Close</Button>
                <Button onClick={handlePrint} variant="contained" color="primary" startIcon={<PrintIcon />}>
                  Print / PDF
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </MainLayout>
    </LocalizationProvider>
  );
}

