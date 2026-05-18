import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';

import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BusinessIcon from '@mui/icons-material/Business';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StoreIcon from '@mui/icons-material/Store';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import MessageIcon from '@mui/icons-material/Message';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import Link from 'next/link';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

import dayjs from 'dayjs';

import MainLayout from '../components/Layout/MainLayout';
import StatsCard from '../components/Dashboard/StatsCard';
import NotificationList from '../components/Dashboard/NotificationList';
import ChatWidget from '../components/Common/ChatWidget';
import api, { getDashboard, getNotifications } from '../utils/api';
import { useSocket } from '../utils/useSocket';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  paid: 'success',
  pending: 'warning',
  overdue: 'error',
  draft: 'default',
  cancelled: 'default',
  open: 'info',
};

const PIE_COLORS = ['#2e7d32', '#ed6c02', '#d32f2f'];

const MOCK_MONTHLY_SALES = [
  { month: 'Nov', sales: 42000, pos: 18000 },
  { month: 'Dec', sales: 68000, pos: 23000 },
  { month: 'Jan', sales: 53000, pos: 15000 },
  { month: 'Feb', sales: 71000, pos: 28000 },
  { month: 'Mar', sales: 60000, pos: 21000 },
  { month: 'Apr', sales: 85000, pos: 32000 },
];

const MOCK_STOCK_DISTRIBUTION = [
  { name: 'In Stock', value: 68 },
  { name: 'Low Stock', value: 22 },
  { name: 'Out of Stock', value: 10 },
];

const MOCK_TOP_PRODUCTS = [
  { name: 'Product A', quantity: 340 },
  { name: 'Product B', quantity: 280 },
  { name: 'Product C', quantity: 220 },
  { name: 'Product D', quantity: 190 },
  { name: 'Product E', quantity: 150 },
];

const fmtCurrency = (val) =>
  typeof val === 'number'
    ? val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

const fmtYAxis = (val) => `₱${(val / 1000).toFixed(0)}k`;

const renderPieLabel = ({ name, percent }) => `${(percent * 100).toFixed(0)}%`;

export default function DashboardPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalInventoryItems: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalBranches: 0,
    totalSubDealers: 0,
    monthlySales: 0,
    pendingPOs: 0,
    lowStockCount: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [monthlySalesChart, setMonthlySalesChart] = useState(MOCK_MONTHLY_SALES);
  const [stockDistribution, setStockDistribution] = useState(MOCK_STOCK_DISTRIBUTION);
  const [topProducts, setTopProducts] = useState(MOCK_TOP_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [noBranch, setNoBranch] = useState(false);
  const [branchInfo, setBranchInfo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [notifBadge, setNotifBadge] = useState(0);
  const [upcomingCalendarAlerts, setUpcomingCalendarAlerts] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [customerInvoicesLoading, setCustomerInvoicesLoading] = useState(false);
  const [customerInvoicesPage, setCustomerInvoicesPage] = useState(0);
  const [customerInvoicesRowsPerPage, setCustomerInvoicesRowsPerPage] = useState(10);
  const [customerInvoicesTotal, setCustomerInvoicesTotal] = useState(0);
  const [installerFilter, setInstallerFilter] = useState('n/a');
  const [customerInvoicesSearch, setCustomerInvoicesSearch] = useState('');

  const [serviceInvoices, setServiceInvoices] = useState([]);
  const [serviceInvoicesLoading, setServiceInvoicesLoading] = useState(false);
  const [serviceInvoicesPage, setServiceInvoicesPage] = useState(0);
  const [serviceInvoicesRowsPerPage, setServiceInvoicesRowsPerPage] = useState(10);
  const [serviceInvoicesTotal, setServiceInvoicesTotal] = useState(0);
  const [serviceInstallerFilter, setServiceInstallerFilter] = useState('na-only');
  const [serviceInvoicesSearch, setServiceInvoicesSearch] = useState('');

  const handleSocketNotification = useCallback((data) => {
    setNotifBadge((prev) => prev + 1);
    setNotifications((prev) => [{ _id: Date.now(), message: data.message || 'New notification', type: data.type, createdAt: new Date().toISOString(), read: false }, ...prev]);
  }, []);

  useSocket(user?._id || user?.id, handleSocketNotification);

  const isInstallerNA = (inv) => {
    const installerObjName = typeof inv.installer === 'object' ? inv.installer?.name : '';
    const installerDirect = typeof inv.installer === 'string' ? inv.installer : '';
    const normalizedInstaller = String(inv.installerName || installerObjName || installerDirect || '')
      .trim()
      .toLowerCase();

    return (
      normalizedInstaller.length === 0 ||
      normalizedInstaller === 'n/a' ||
      normalizedInstaller === 'na' ||
      normalizedInstaller === 'none' ||
      normalizedInstaller === 'null' ||
      normalizedInstaller === 'undefined' ||
      normalizedInstaller === '-'
    );
  };

  const fetchCustomerInvoices = useCallback(async () => {
    if (!isAdmin) return;
    setCustomerInvoicesLoading(true);
    try {
      const params = new URLSearchParams({
        page: (customerInvoicesPage + 1).toString(),
        limit: customerInvoicesRowsPerPage.toString(),
        invoiceType: 'customer',
      });
      const res = await api.get(`/invoices?${params.toString()}`);
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.invoices || [];
      const filteredItems = installerFilter === 'n/a' ? items.filter(isInstallerNA) : items;
      setCustomerInvoices(filteredItems);
      setCustomerInvoicesTotal(installerFilter === 'n/a'
        ? filteredItems.length
        : (res.data?.total || res.data?.pagination?.total || items.length));
    } catch (err) {
      console.error('Customer invoices fetch error:', err);
      setCustomerInvoices([]);
      setCustomerInvoicesTotal(0);
    } finally {
      setCustomerInvoicesLoading(false);
    }
  }, [isAdmin, customerInvoicesPage, customerInvoicesRowsPerPage, installerFilter]);

  const fetchServiceInvoices = useCallback(async () => {
    if (!isAdmin) return;
    setServiceInvoicesLoading(true);
    try {
      const params = new URLSearchParams({
        page: (serviceInvoicesPage + 1).toString(),
        limit: serviceInvoicesRowsPerPage.toString(),
        invoiceType: 'service',
      });
      const res = await api.get(`/invoices?${params.toString()}`);
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.invoices || [];
      const filteredItems = serviceInstallerFilter === 'na-only' ? items.filter(isInstallerNA) : items;
      setServiceInvoices(filteredItems);
      setServiceInvoicesTotal(serviceInstallerFilter === 'na-only'
        ? filteredItems.length
        : (res.data?.total || res.data?.pagination?.total || items.length));
    } catch (err) {
      console.error('Service invoices fetch error:', err);
      setServiceInvoices([]);
      setServiceInvoicesTotal(0);
    } finally {
      setServiceInvoicesLoading(false);
    }
  }, [isAdmin, serviceInvoicesPage, serviceInvoicesRowsPerPage, serviceInstallerFilter]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, notifRes] = await Promise.all([
          getDashboard(),
          getNotifications(),
        ]);

        const dashData = dashRes.data.data || dashRes.data;

        // Handle no-branch case for regular users
        if (dashData.noBranchAssigned) {
          setNoBranch(true);
          setLoading(false);
          return;
        }
        setIsAdmin(dashData.isAdmin !== false);
        setBranchInfo(dashData.branchInfo || null);

        setStats({
          totalInventoryItems: dashData.totalInventoryItems || dashData.totalInventory || 0,
          totalCustomers: dashData.totalCustomers || 0,
          totalSuppliers: dashData.totalSuppliers || 0,
          totalBranches: dashData.totalBranches || 0,
          totalSubDealers: dashData.totalSubDealers || 0,
          monthlySales: dashData.monthlySales || 0,
          pendingPOs: dashData.pendingPOs || dashData.pendingPurchaseOrders || 0,
          lowStockCount: dashData.lowStockCount || dashData.lowStockItems || 0,
        });

        const invoices = dashData.recentInvoices || dashData.invoices || [];
        setRecentInvoices(invoices);

        if (dashData.monthlySalesChart && Array.isArray(dashData.monthlySalesChart) && dashData.monthlySalesChart.length > 0) {
          setMonthlySalesChart(dashData.monthlySalesChart);
        }
        if (dashData.stockDistribution && Array.isArray(dashData.stockDistribution) && dashData.stockDistribution.length > 0) {
          setStockDistribution(dashData.stockDistribution);
        }
        if (dashData.topProducts && Array.isArray(dashData.topProducts) && dashData.topProducts.length > 0) {
          setTopProducts(dashData.topProducts);
        }

        const notifData = notifRes.data.data || notifRes.data;
        const notifItems = Array.isArray(notifData) ? notifData : notifData.items || [];

        let calendarNotifications = [];
        try {
          const startDate = dayjs().startOf('day');
          const endDate = startDate.add(30, 'day');
          const calRes = await api.get('/calendar', {
            params: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          });
          const calData = calRes.data?.data || calRes.data;
          const calItems = Array.isArray(calData) ? calData : calData.items || [];

          const upcoming = (calItems || [])
            .filter((ev) => {
              if (!ev || (!ev.startDate && !ev.start)) return false;
              const start = dayjs(ev.startDate || ev.start);
              if (!start.isValid()) return false;
              const startDay = start.startOf('day');
              return startDay.diff(startDate, 'day') >= 0 && startDay.diff(endDate, 'day') <= 0;
            })
            .sort((a, b) => {
              const aStart = dayjs(a.startDate || a.start);
              const bStart = dayjs(b.startDate || b.start);
              return aStart.diff(bStart);
            })
            .slice(0, 5);
          setUpcomingCalendarAlerts(upcoming);

          calendarNotifications = upcoming.map((ev) => ({
            id: ev._id || ev.id,
            type: 'calendar',
            message: `Upcoming: ${ev.title} on ${dayjs(ev.startDate || ev.start).format('MMM DD')}`,
            createdAt: ev.startDate || ev.start || new Date().toISOString(),
            read: false,
          }));
        } catch (calError) {
          console.error('Calendar fetch error:', calError);
          setUpcomingCalendarAlerts([]);
        }

        setNotifications([...calendarNotifications, ...notifItems]);
        setNotifBadge(calendarNotifications.length + notifItems.filter((n) => !n.read).length);

        // Fetch low stock items for alert panel
        try {
          const lsRes = await api.get('/inventory/low-stock');
          const lsData = lsRes.data?.items || lsRes.data?.data || lsRes.data || [];
          setLowStockItems(Array.isArray(lsData) ? lsData : []);
        } catch { /* silent */ }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    fetchCustomerInvoices();
  }, [fetchCustomerInvoices]);

  useEffect(() => {
    fetchServiceInvoices();
  }, [fetchServiceInvoices]);

  useEffect(() => {
    setCustomerInvoicesPage(0);
  }, [installerFilter]);

  useEffect(() => {
    setCustomerInvoicesPage(0);
  }, [customerInvoicesSearch]);

  useEffect(() => {
    setServiceInvoicesPage(0);
  }, [serviceInstallerFilter]);

  useEffect(() => {
    setServiceInvoicesPage(0);
  }, [serviceInvoicesSearch]);

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (noBranch) {
    return (
      <MainLayout title="Dashboard">
        <Box
          sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 3,
          }}
        >
          <Box
            sx={{
              width: 80, height: 80, borderRadius: '50%', bgcolor: '#fff3e0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 48, color: '#ed6c02' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} mb={1}>No Branch Assigned</Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={440}>
              Your account has not been assigned to a store branch yet.
              Please contact your administrator to set up your branch assignment.
            </Typography>
          </Box>
          <Box
            sx={{
              p: 2, bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffe0b2',
              maxWidth: 380,
            }}
          >
            <Typography variant="body2" color="#e65100">
              Once assigned, your dashboard will display sales, invoices, and inventory data specific to your store branch.
            </Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard">
      {/* Professional Header Section */}
      <Box sx={{ mb: 4 }}>
        {/* Branch banner for regular users */}
        {!isAdmin && branchInfo && (
          <Card
            elevation={0}
            sx={{
              mb: 3,
              background: 'linear-gradient(135deg, #66ea8b 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                  <StoreIcon sx={{ fontSize: 24 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                    {branchInfo.name}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Branch Dashboard — Showing data for your assigned store branch
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Main Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isAdmin ? 'System-wide overview and analytics' : `Branch: ${branchInfo?.name || 'Loading...'}`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Last updated: {dayjs().format('MMM DD, YYYY HH:mm')}
            </Typography>
            <Badge badgeContent={notifBadge} color="error">
              <IconButton
                onClick={() => setNotifBadge(0)}
                sx={{
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                  '&:hover': { bgcolor: 'grey.50' }
                }}
              >
                <NotificationsIcon />
              </IconButton>
            </Badge>
          </Box>
        </Box>
      </Box>

      {/* ── Key Metrics Cards ── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4} md={4} lg={4}>
          <Link href="/inventory" passHref legacyBehavior>
            <Box component="a" sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'linear-gradient(135deg, #ad8fee 0%, #764ba2 100%)',
                  color: 'white',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(102, 126, 234, 0.3)',
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                    <InventoryIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                    {stats.totalInventoryItems.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Inventory
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Items in stock
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Link>
        </Grid>

      
        <Grid item xs={12} sm={4} md={4} lg={4}>
          <Link href="/reports/sales" passHref legacyBehavior>
            <Box component="a" sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                  color: 'white',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(250, 112, 154, 0.3)',
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                    <AttachMoneyIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                    ₱{fmtCurrency(stats.monthlySales)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Monthly Sales
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    This month
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Link>
        </Grid>



        <Grid item xs={12} sm={4} md={4} lg={4}>
          <Link href="/master/calendar" passHref legacyBehavior>
            <Box component="a" sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
                  color: 'white',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(168, 237, 234, 0.3)',
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                    <CalendarMonthIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                    {upcomingCalendarAlerts.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Upcoming Events
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Next 30 days
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Link>
        </Grid>
      </Grid>

      {/* ── Analytics Section ── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Sales Trend Chart */}
        <Grid item xs={12} lg={8}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            }}
          >
            <CardHeader
              title={
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  Sales & Purchase Orders Trend
                </Typography>
              }
              subheader={
                <Typography variant="body2" color="text.secondary">
                  Last 12 months performance overview
                </Typography>
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySalesChart} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="posGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#764ba2" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#764ba2" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: '#666' }}
                      axisLine={{ stroke: '#e0e0e0' }}
                    />
                    <YAxis
                      tickFormatter={fmtYAxis}
                      tick={{ fontSize: 12, fill: '#666' }}
                      axisLine={{ stroke: '#e0e0e0' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: 8,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value, name) => [
                        `₱${value.toLocaleString('en-PH')}`,
                        name === 'sales' ? 'Sales' : 'Purchase Orders'
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#667eea"
                      strokeWidth={3}
                      fill="url(#salesGradient)"
                      name="Sales"
                    />
                    <Area
                      type="monotone"
                      dataKey="pos"
                      stroke="#764ba2"
                      strokeWidth={3}
                      fill="url(#posGradient)"
                      name="Purchase Orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Stock Distribution Pie Chart */}
        <Grid item xs={12} lg={4}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              background: 'linear-gradient(135deg, #7f72d3 100%)',
              color: 'white',
            }}
          >
            <CardHeader
              title={
                <Typography variant="h6" fontWeight={700}>
                  Stock Distribution
                </Typography>
              }
              subheader={
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Current inventory status
                </Typography>
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockDistribution}
                      cx="50%"
                      cy="45%"
                      outerRadius={85}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {stockDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#4facfe', '#f093fb', '#43e97b'][index % 3]}
                          stroke="rgba(59, 55, 55, 0.3)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(23, 23, 23, 0.95)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#333',
                      }}
                      formatter={(value) => [`${value}%`, 'Percentage']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Stack spacing={1}>
                  {stockDistribution.map((item, index) => (
                    <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: ['#4facfe', '#f093fb', '#43e97b'][index % 3],
                        }}
                      />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {item.value}%
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      


      {/* ── Upcoming Calendar Events ── */}
      {upcomingCalendarAlerts.length > 0 && (
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 4 }}
        >
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                  <CalendarMonthIcon sx={{ color: 'white', fontSize: 22 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Upcoming Events</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {upcomingCalendarAlerts.length} event{upcomingCalendarAlerts.length !== 1 ? 's' : ''} in the next 30 days
                  </Typography>
                </Box>
              </Box>
            }
            action={
              <Link href="/master/calendar" passHref legacyBehavior>
                <Button component="a" size="small" variant="outlined" startIcon={<CalendarMonthIcon fontSize="small" />}>
                  View Calendar
                </Button>
              </Link>
            }
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={1.5}>
              {upcomingCalendarAlerts.map((ev, idx) => {
                const evDate = dayjs(ev.startDate || ev.start);
                const today = dayjs().startOf('day');
                const daysUntil = evDate.startOf('day').diff(today, 'day');
                const isToday = daysUntil === 0;
                const isTomorrow = daysUntil === 1;
                const daysLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
                const evColor = ev.color || '#667eea';
                return (
                  <Box
                    key={ev._id || ev.id || idx}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 2, p: 1.5,
                      borderRadius: 2, bgcolor: 'background.paper',
                      border: '1px solid', borderColor: 'divider',
                      borderLeft: `4px solid ${evColor}`,
                      '&:hover': { bgcolor: 'grey.50' },
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <Box sx={{ textAlign: 'center', minWidth: 52 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                        {evDate.format('MMM')}
                      </Typography>
                      <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                        {evDate.format('DD')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                        {evDate.format('ddd')}
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{ev.title}</Typography>
                      {ev.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {ev.description}
                        </Typography>
                      )}
                      {ev.storeBranch?.name && (
                        <Typography variant="caption" color="primary.main">
                          {ev.storeBranch.name}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={daysLabel}
                      size="small"
                      color={isToday ? 'error' : isTomorrow ? 'warning' : 'default'}
                      sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ── Admin Customer Invoices Table ── */}
      {isAdmin && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            mb: 4,
          }}
        >
          <CardHeader
            title={
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Customer Invoices
              </Typography>
            }
            subheader={
              <Typography variant="body2" color="text.secondary">
                All customer invoices with pagination
              </Typography>
            }
            action={
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { xs: 220, sm: 420 } }}>
                <TextField
                  size="small"
                  placeholder="Search invoice no, customer, employee, installer..."
                  value={customerInvoicesSearch}
                  onChange={(e) => setCustomerInvoicesSearch(e.target.value)}
                  sx={{ minWidth: { xs: 220, sm: 260 } }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id="installer-filter-label">Installer</InputLabel>
                  <Select
                    labelId="installer-filter-label"
                    value={installerFilter}
                    label="Installer"
                    onChange={(e) => setInstallerFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="n/a">N/A only</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            }
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Invoice No</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Installer</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Store Branch</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="right">Total</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Payment Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Invoice Date</TableCell>

                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customerInvoicesLoading ? (
                    <TableRow>
                      <TableCell colSpan={15} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={22} />
                      </TableCell>
                    </TableRow>
                  ) : customerInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">No customer invoices found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    customerInvoices
                      .filter((inv) => {
                        const q = customerInvoicesSearch.trim().toLowerCase();
                        if (!q) return true;

                        const invoiceNo = String(inv.invoiceNo || inv.invoice_no || inv.invoiceNumber || '').toLowerCase();
                        const customerName = String(inv.customerName || inv.customer?.name || '').toLowerCase();
                        const employeeName = String(inv.employeeName || inv.employee?.name || '').toLowerCase();
                        const installerName = String(inv.installerName || inv.installer?.name || '').toLowerCase();
                        const storeBranch = String(inv.storeBranch?.name || inv.storeBranchName || inv.branchName || '').toLowerCase();
                        const totalRaw = Number(inv.total || inv.totalAmount || 0);
                        const totalFormatted = fmtCurrency(totalRaw).toLowerCase();
                        const totalWithPeso = `₱${fmtCurrency(totalRaw)}`.toLowerCase();
                        const paymentStatus = String(inv.paymentStatus || inv.status || '').toLowerCase();
                        const invoiceDateFormatted = inv.invoiceDate ? dayjs(inv.invoiceDate).format('MMM DD, YYYY').toLowerCase() : '';
                        const invoiceDateRaw = inv.invoiceDate ? String(inv.invoiceDate).toLowerCase() : '';

                        return (
                          invoiceNo.includes(q) ||
                          customerName.includes(q) ||
                          employeeName.includes(q) ||
                          installerName.includes(q) ||
                          storeBranch.includes(q) ||
                          String(totalRaw).includes(q) ||
                          totalFormatted.includes(q) ||
                          totalWithPeso.includes(q) ||
                          paymentStatus.includes(q) ||
                          invoiceDateFormatted.includes(q) ||
                          invoiceDateRaw.includes(q)
                        );
                      })
                      .map((inv, idx) => {
                      const statusRaw = inv.paymentStatus || inv.status || 'pending';
                      const statusLabel = String(statusRaw);
                      const statusKey = statusLabel.toLowerCase();
                      return (
                        <TableRow key={inv._id || inv.id || idx} hover>
                          <TableCell>{inv.invoiceNo || inv.invoice_no || inv.invoiceNumber || '—'}</TableCell>
                          <TableCell>{inv.customerName || inv.customer?.name || '—'}</TableCell>
                          <TableCell>{inv.employeeName || inv.employee?.name || '—'}</TableCell>
                          <TableCell>{inv.installerName || inv.installer?.name || 'n/a'}</TableCell>
                          <TableCell>{inv.storeBranch?.name || inv.storeBranchName || inv.branchName || '—'}</TableCell>
                          <TableCell align="right">₱{fmtCurrency(Number(inv.total || inv.totalAmount || 0))}</TableCell>
                          <TableCell>
                            <Chip
                              label={statusLabel}
                              size="small"
                              color={STATUS_COLORS[statusKey] || 'default'}
                              sx={{ textTransform: 'capitalize', fontSize: '0.75rem', height: 24 }}
                            />
                          </TableCell>
                          <TableCell>
                            {inv.invoiceDate ? dayjs(inv.invoiceDate).format('MMM DD, YYYY') : '—'}
                          </TableCell>
                        
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <Tooltip title="View">
                                <IconButton
                                  size="small"
                                  color="info"
                                  component={Link}
                                  href={`/invoices/customer?viewId=${inv._id || inv.id}`}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  component={Link}
                                  href={`/invoices/customer?editId=${inv._id || inv.id}`}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={customerInvoicesTotal}
              page={customerInvoicesPage}
              onPageChange={(_, newPage) => setCustomerInvoicesPage(newPage)}
              rowsPerPage={customerInvoicesRowsPerPage}
              onRowsPerPageChange={(e) => {
                setCustomerInvoicesRowsPerPage(parseInt(e.target.value, 10));
                setCustomerInvoicesPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Admin Service Invoices Table (N/A Match Focus) ── */}
      {isAdmin && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            mb: 4,
          }}
        >
          <CardHeader
            title={
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Service Invoices (Installer N/A Match)
              </Typography>
            }
            subheader={
              <Typography variant="body2" color="text.secondary">
                Service invoices with search, pagination, and quick action edit
              </Typography>
            }
            action={
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { xs: 220, sm: 420 } }}>
                <TextField
                  size="small"
                  placeholder="Search invoice no, customer, employee, installer..."
                  value={serviceInvoicesSearch}
                  onChange={(e) => setServiceInvoicesSearch(e.target.value)}
                  sx={{ minWidth: { xs: 220, sm: 260 } }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id="service-installer-filter-label">Installer</InputLabel>
                  <Select
                    labelId="service-installer-filter-label"
                    value={serviceInstallerFilter}
                    label="Installer"
                    onChange={(e) => setServiceInstallerFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="na-only">N/A only</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            }
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Invoice No</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Installer</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Store Branch</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="right">Total</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Payment Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>Invoice Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {serviceInvoicesLoading ? (
                    <TableRow>
                      <TableCell colSpan={15} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={22} />
                      </TableCell>
                    </TableRow>
                  ) : serviceInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">No service invoices found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    serviceInvoices
                      .filter((inv) => {
                        const q = serviceInvoicesSearch.trim().toLowerCase();
                        if (!q) return true;

                        const invoiceNo = String(inv.invoiceNo || inv.invoice_no || inv.invoiceNumber || '').toLowerCase();
                        const customerName = String(inv.customerName || inv.customer?.name || '').toLowerCase();
                        const employeeName = String(inv.employeeName || inv.employee?.name || '').toLowerCase();
                        const installerName = String(inv.installerName || inv.installer?.name || '').toLowerCase();
                        const storeBranch = String(inv.storeBranch?.name || inv.storeBranchName || inv.branchName || '').toLowerCase();
                        const totalRaw = Number(inv.total || inv.totalAmount || 0);
                        const totalFormatted = fmtCurrency(totalRaw).toLowerCase();
                        const totalWithPeso = `₱${fmtCurrency(totalRaw)}`.toLowerCase();
                        const paymentStatus = String(inv.paymentStatus || inv.status || '').toLowerCase();
                        const invoiceDateFormatted = inv.invoiceDate ? dayjs(inv.invoiceDate).format('MMM DD, YYYY').toLowerCase() : '';
                        const invoiceDateRaw = inv.invoiceDate ? String(inv.invoiceDate).toLowerCase() : '';

                        return (
                          invoiceNo.includes(q) ||
                          customerName.includes(q) ||
                          employeeName.includes(q) ||
                          installerName.includes(q) ||
                          storeBranch.includes(q) ||
                          String(totalRaw).includes(q) ||
                          totalFormatted.includes(q) ||
                          totalWithPeso.includes(q) ||
                          paymentStatus.includes(q) ||
                          invoiceDateFormatted.includes(q) ||
                          invoiceDateRaw.includes(q)
                        );
                      })
                      .map((inv, idx) => {
                        const statusRaw = inv.paymentStatus || inv.status || 'pending';
                        const statusLabel = String(statusRaw);
                        const statusKey = statusLabel.toLowerCase();
                        return (
                          <TableRow key={inv._id || inv.id || idx} hover>
                            <TableCell>{inv.invoiceNo || inv.invoice_no || inv.invoiceNumber || '—'}</TableCell>
                            <TableCell>{inv.customerName || inv.customer?.name || '—'}</TableCell>
                            <TableCell>{inv.employeeName || inv.employee?.name || '—'}</TableCell>
                            <TableCell>{inv.installerName || inv.installer?.name || 'n/a'}</TableCell>
                            <TableCell>{inv.storeBranch?.name || inv.storeBranchName || inv.branchName || '—'}</TableCell>
                            <TableCell align="right">₱{fmtCurrency(Number(inv.total || inv.totalAmount || 0))}</TableCell>
                            <TableCell>
                              <Chip
                                label={statusLabel}
                                size="small"
                                color={STATUS_COLORS[statusKey] || 'default'}
                                sx={{ textTransform: 'capitalize', fontSize: '0.75rem', height: 24 }}
                              />
                            </TableCell>
                            <TableCell>
                              {inv.invoiceDate ? dayjs(inv.invoiceDate).format('MMM DD, YYYY') : '—'}
                            </TableCell>
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                <Tooltip title="View">
                                  <IconButton
                                    size="small"
                                    color="info"
                                    component={Link}
                                    href={`/invoices/service?id=${inv._id || inv.id}`}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    component={Link}
                                    href={`/invoices/service?editId=${inv._id || inv.id}`}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={serviceInvoicesTotal}
              page={serviceInvoicesPage}
              onPageChange={(_, newPage) => setServiceInvoicesPage(newPage)}
              rowsPerPage={serviceInvoicesRowsPerPage}
              onRowsPerPageChange={(e) => {
                setServiceInvoicesRowsPerPage(parseInt(e.target.value, 10));
                setServiceInvoicesPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Stock Alerts Panel ── */}
      {lowStockItems.length > 0 && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'warning.light',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
          }}
        >
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 40, height: 40 }}>
                  <WarningAmberIcon sx={{ color: 'white' }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="warning.dark">
                    Stock Alerts
                  </Typography>
                  <Typography variant="body2" color="warning.main">
                    {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need{lowStockItems.length === 1 ? 's' : ''} attention
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
                  <TableRow sx={{ bgcolor: 'warning.light', opacity: 0.8 }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'warning.dark' }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'warning.dark' }}>Brand</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'warning.dark' }}>Warehouse</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'warning.dark' }} align="center">Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'warning.dark' }} align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStockItems.map((item, idx) => {
                    const isOut = item.stockStatus === 'out_of_stock' || item.stockStatus === 'Out of Stock';
                    return (
                      <TableRow
                        key={item._id || idx}
                        sx={{
                          bgcolor: isOut ? 'rgba(244, 67, 54, 0.08)' : 'transparent',
                          '&:hover': { bgcolor: isOut ? 'rgba(244, 67, 54, 0.12)' : 'rgba(255, 152, 0, 0.08)' },
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <TableCell sx={{ fontSize: '0.875rem' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {item.productName?.name || item.product?.name || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{item.brand?.name || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.875rem' }}>{item.warehouse?.name || '—'}</TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color={isOut ? 'error.main' : 'warning.main'}
                            sx={{ fontSize: '0.875rem' }}
                          >
                            {item.quantity ?? 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={isOut ? 'Out of Stock' : 'Low Stock'}
                            size="small"
                            color={isOut ? 'error' : 'warning'}
                            sx={{
                              fontSize: '0.75rem',
                              height: 24,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Chat widget removed from dashboard (chat lives in /messages page) */}
    </MainLayout>
  );
}
