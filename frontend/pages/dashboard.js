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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
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
  Tooltip,
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

  const handleSocketNotification = useCallback((data) => {
    setNotifBadge((prev) => prev + 1);
    setNotifications((prev) => [{ _id: Date.now(), message: data.message || 'New notification', type: data.type, createdAt: new Date().toISOString(), read: false }, ...prev]);
  }, []);

  useSocket(user?._id || user?.id, handleSocketNotification);

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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Link href="/inventory" passHref legacyBehavior>
            <Box component="a" sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Link href="/master/customers" passHref legacyBehavior>
            <Box component="a" sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(245, 87, 108, 0.3)',
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                    <PeopleIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                    {stats.totalCustomers.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Customers
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Registered users
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Link>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Link href="/master/suppliers" passHref legacyBehavior>
            <Box component="a" sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(79, 172, 254, 0.3)',
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                    <LocalShippingIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                    {stats.totalSuppliers.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Suppliers
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Active partners
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Link>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(67, 233, 123, 0.3)',
              },
            }}
          >
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                <BusinessIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                {stats.totalBranches.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                Branches
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Store locations
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Link href="/reports/sales" passHref legacyBehavior>
            <Box component="a" sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
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

<Grid item xs={12} sm={6} md={4} lg={2}>
          <Link href="/messages" passHref legacyBehavior>
            <Box component="a" sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
                  color: 'text.primary',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(178, 235, 242, 0.3)',
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.8)', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                    <MessageIcon sx={{ fontSize: 28, color: '#00796b' }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={800} sx={{ mb: 1, color: 'text.primary' }}>
                    Messages
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
                    Team Chat
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Realtime messaging
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Link>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Link href="/master/calendar" passHref legacyBehavior>
            <Box component="a" sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  color: 'text.primary',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(168, 237, 234, 0.3)',
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.8)', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                    <CalendarMonthIcon sx={{ fontSize: 28, color: '#667eea' }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={800} sx={{ mb: 1, color: 'text.primary' }}>
                    {upcomingCalendarAlerts.length}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
                    Upcoming Events
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
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
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
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

      {/* ── Activity & Insights Section ── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Calendar Preview */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            }}
          >
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonthIcon sx={{ color: '#667eea' }} />
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Upcoming Events
                  </Typography>
                </Box>
              }
              action={
                <Link href="/master/calendar" passHref legacyBehavior>
                  <Box component="a" sx={{
                    fontSize: 12,
                    color: 'primary.main',
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': { textDecoration: 'underline' }
                  }}>
                    View All →
                  </Box>
                </Link>
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              {upcomingCalendarAlerts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CalendarMonthIcon sx={{ fontSize: 48, color: 'grey.300', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No upcoming events in the next 30 days
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {upcomingCalendarAlerts.slice(0, 4).map((ev) => (
                    <Paper
                      key={ev._id || ev.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          boxShadow: 1,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Avatar sx={{ bgcolor: ev.color || '#667eea', width: 40, height: 40 }}>
                          <CalendarMonthIcon sx={{ fontSize: 20 }} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                            {ev.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {dayjs(ev.startDate || ev.start).format('MMM DD, YYYY')}
                          </Typography>
                          <Typography variant="body2" color="text.primary">
                            {dayjs(ev.startDate || ev.start).format('HH:mm')} - {dayjs(ev.endDate || ev.end).format('HH:mm')}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Notifications Panel */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsIcon />
                  <Typography variant="h6" fontWeight={700}>
                    Recent Activity
                  </Typography>
                </Box>
              }
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {stats.lowStockCount > 0 && (
                    <Chip
                      label={`${stats.lowStockCount} Low Stock`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                      }}
                      icon={<WarningAmberIcon style={{ color: '#ff9800' }} />}
                    />
                  )}
                  {upcomingCalendarAlerts.length > 0 && (
                    <Chip
                      label={`${upcomingCalendarAlerts.length} Events`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                      }}
                      icon={<CalendarMonthIcon style={{ color: '#4caf50' }} />}
                    />
                  )}
                </Box>
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
                <NotificationList items={notifications} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Recent Transactions & Top Products ── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Recent Invoices */}
        <Grid item xs={12} lg={7}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
            }}
          >
            <CardHeader
              title={
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  Recent Transactions
                </Typography>
              }
              subheader={
                <Typography variant="body2" color="text.secondary">
                  Latest invoice activity
                </Typography>
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Invoice #</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <AttachMoneyIcon sx={{ fontSize: 48, color: 'grey.300', mb: 2 }} />
                            <Typography variant="body1" color="text.secondary">
                              No recent transactions
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentInvoices.slice(0, 5).map((inv, idx) => (
                        <TableRow
                          key={inv._id || inv.id || idx}
                          hover
                          sx={{
                            '&:hover': { bgcolor: 'grey.50' },
                            transition: 'background-color 0.2s ease',
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {inv.invoiceNumber || inv.number || `INV-${idx + 1}`}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>
                            {inv.customerName || inv.customer?.name || '—'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'success.main', fontSize: '0.875rem' }}>
                            ₱{fmtCurrency(inv.total || inv.totalAmount || 0)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={inv.status || 'pending'}
                              size="small"
                              color={STATUS_COLORS[inv.status?.toLowerCase()] || 'default'}
                              sx={{
                                textTransform: 'capitalize',
                                fontSize: '0.75rem',
                                height: 24,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                            {inv.createdAt
                              ? dayjs(inv.createdAt).format('MMM DD')
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Products Chart */}
        <Grid item xs={12} lg={5}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
            }}
          >
            <CardHeader
              title={
                <Typography variant="h6" fontWeight={700}>
                  Top Products
                </Typography>
              }
              subheader={
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Best performing items by quantity
                </Typography>
              }
              sx={{ pb: 1 }}
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts}
                    layout="horizontal"
                    margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.2)" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: 'white' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'white' }}
                      width={70}
                      axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#333',
                      }}
                      formatter={(value) => [value, 'Quantity']}
                    />
                    <Bar
                      dataKey="quantity"
                      fill="rgba(255,255,255,0.8)"
                      radius={[0, 6, 6, 0]}
                      name="Quantity"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
