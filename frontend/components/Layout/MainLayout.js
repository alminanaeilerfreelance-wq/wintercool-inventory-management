import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import Image from 'next/image';

import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme, alpha } from '@mui/material/styles';

import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockResetIcon from '@mui/icons-material/LockReset';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import CategoryIcon from '@mui/icons-material/Category';
import PlaceIcon from '@mui/icons-material/Place';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TuneIcon from '@mui/icons-material/Tune';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import StorageIcon from '@mui/icons-material/Storage';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BuildIcon from '@mui/icons-material/Build';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PaymentsIcon from '@mui/icons-material/Payments';
import HistoryIcon from '@mui/icons-material/History';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';

import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { getNotifications } from '../../utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const DRAWER_WIDTH = 264;

const NAV_ITEMS = [
  { label: 'Messages', href: '/messages', icon: <MessageIcon /> },
  { label: 'Dashboard', icon: <DashboardIcon />, href: '/dashboard' },
  {
    group: 'Data Management',
    label: 'Master Data',
    icon: <StorageIcon />,
    children: [
      { label: 'Brands', href: '/master/brands' },
      { label: 'Designs', href: '/master/designs' },
      { label: 'Customers', href: '/master/customers', icon: <PeopleIcon /> },
      { label: 'Suppliers', href: '/master/suppliers', icon: <BusinessIcon /> },
      { label: 'Employees', href: '/master/employees', icon: <PeopleIcon /> },
      { label: 'Categories', href: '/master/categories', icon: <CategoryIcon /> },
      { label: 'Products', href: '/master/products', icon: <InventoryIcon /> },
      { label: 'Zones', href: '/master/zones', icon: <PlaceIcon /> },
      { label: 'Bins', href: '/master/bins', icon: <PlaceIcon /> },
      { label: 'Racks', href: '/master/racks', icon: <PlaceIcon /> },
      { label: 'Locations', href: '/master/locations', icon: <PlaceIcon /> },
      { label: 'Warehouses', href: '/master/warehouses', icon: <BusinessIcon /> },
      { label: 'Store Branches', href: '/master/store-branches', icon: <BusinessIcon /> },
      { label: 'Calendar', href: '/master/calendar', icon: <CalendarMonthIcon /> },
      { label: 'Types', href: '/master/types', icon: <TuneIcon /> },
      { label: 'Units', href: '/master/units', icon: <TuneIcon /> },
      { label: 'Services', href: '/master/services', icon: <BuildIcon /> },
      { label: 'Expenses', href: '/master/expenses', icon: <ReceiptIcon /> },
    ],
  },
  {
    group: 'Operations',
    label: 'Inventory',
    icon: <InventoryIcon />,
    children: [
      { label: 'Stock List', href: '/inventory' },
      { label: 'Adjustment', href: '/inventory/adjustment' },
      { label: 'Scanner', href: '/inventory/scanner', icon: <QrCodeScannerIcon /> },
      { label: 'Bulk Import', href: '/inventory/bulk-import', icon: <CloudUploadIcon /> },
    ],
  },
  {
    label: 'Invoices',
    icon: <ReceiptIcon />,
    children: [
      { label: 'Customer Invoices', href: '/invoices/customer' },
      { label: 'Service Invoices', href: '/invoices/service' },
      { label: 'Sub-Dealer Invoices', href: '/invoices/sub-dealers' },
      { label: 'Purchase Orders', href: '/invoices/purchase-orders', icon: <ShoppingCartIcon /> },
      { label: 'Return Orders', href: '/invoices/return-orders' },
      // { label: 'Payments', href: '/invoices/payments', icon: <PaymentsIcon /> },
    ],
  },

  {
    group: 'Analytics',
    label: 'Reports',
    icon: <AssessmentIcon />,
    children: [
      { label: 'Sales Report', href: '/reports/sales' },
      { label: 'Services Report', href: '/reports/services' },
      { label: 'Supplier Report', href: '/reports/supplier' },
      { label: 'Sub Dealer Invoices', href: '/reports/sub-dealer-invoices' },
    ],
  },
  {
    group: 'System',
    label: 'Users',
    icon: <ManageAccountsIcon />,
    href: '/users',
  },
  {
    group: 'System',
    label: 'Settings',
    icon: <SettingsIcon />,
    children: [
      { label: 'Company', href: '/settings/company' },
      { label: 'General', href: '/settings/general' },
    ],
  },
];

function NavLeaf({ label, href, icon, depth = 1, onNavigate, isActive }) {
  const router = useRouter();
  const active = router.pathname === href || router.pathname.startsWith(href + '/');
  
  return (
    <ListItemButton
      component={NextLink}
      href={href}
      onClick={onNavigate}
      selected={active}
      sx={{
        pl: depth === 0 ? 3 : depth * 2 + 2,
        pr: 2,
        borderRadius: 2.5,
        mx: 1.5,
        mb: 0.5,
        minHeight: 44,
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&.Mui-selected': {
          bgcolor: 'rgba(21, 101, 192, 0.12)',
          color: '#1565c0',
          borderLeft: '3px solid #1565c0',
          pl: depth === 0 ? 2.625 : depth * 2 + 1.625,
          boxShadow: '0 2px 8px rgba(21, 101, 192, 0.15)',
          '& .MuiListItemIcon-root': { color: '#1565c0' },
          '&:hover': {
            bgcolor: 'rgba(21, 101, 192, 0.16)',
            boxShadow: '0 4px 12px rgba(21, 101, 192, 0.2)',
          },
        },
        '&:not(.Mui-selected):hover': {
          bgcolor: 'rgba(21, 101, 192, 0.06)',
          transform: 'translateX(4px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
      }}
    >
      {icon && (
        <ListItemIcon
          sx={{
            minWidth: 36,
            color: active ? '#1565c0' : 'text.secondary',
            '& .MuiSvgIcon-root': { fontSize: 20, transition: 'all 0.2s ease' },
          }}
        >
          {icon}
        </ListItemIcon>
      )}
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: depth === 0 ? 15 : 14,
          fontWeight: active ? 600 : 500,
          lineHeight: 1.4,
          letterSpacing: '-0.01em',
        }}
      />
      {active && (
        <Box
          sx={{
            position: 'absolute',
            right: 8,
            width: 4,
            height: 4,
            borderRadius: '50%',
            bgcolor: '#1565c0',
            boxShadow: '0 0 8px rgba(21, 101, 192, 0.4)',
          }}
        />
      )}
    </ListItemButton>
  );
}

function NavParent({ label, icon, children, onNavigate, groupLabel }) {
  const router = useRouter();
  const isChildActive = children.some((c) => router.pathname === c.href || router.pathname.startsWith(c.href + '/'));
  const [open, setOpen] = useState(isChildActive);

  return (
    <>
      <ListItemButton
        onClick={() => setOpen((o) => !o)}
        sx={{
          borderRadius: 2.5,
          mx: 1.5,
          mb: 0.5,
          minHeight: 44,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          '&:hover': {
            bgcolor: 'rgba(21, 101, 192, 0.06)',
            transform: 'translateX(4px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          },
          ...(isChildActive && {
            bgcolor: 'rgba(21, 101, 192, 0.08)',
            color: '#1565c0',
            borderLeft: '3px solid #1565c0',
            pl: 2.625,
            boxShadow: '0 2px 8px rgba(21, 101, 192, 0.12)',
          }),
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 36,
            color: isChildActive ? '#1565c0' : 'text.secondary',
            '& .MuiSvgIcon-root': { fontSize: 20, transition: 'all 0.2s ease' },
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: 15,
            fontWeight: isChildActive ? 600 : 500,
            color: isChildActive ? '#1565c0' : 'text.primary',
            letterSpacing: '-0.01em',
          }}
        />
        <Box
          sx={{
            ml: 'auto',
            mr: 1,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: isChildActive ? '#1565c0' : 'text.secondary',
          }}
        >
          <ExpandMoreIcon sx={{ fontSize: 20 }} />
        </Box>
      </ListItemButton>

      <Collapse in={open} timeout={300} unmountOnExit>
        <List disablePadding sx={{ mt: 0.5, mb: 1 }}>
          {children.map((child) => {
            const childActive = router.pathname === child.href || router.pathname.startsWith(child.href + '/');
            return (
              <NavLeaf
                key={child.href}
                label={child.label}
                href={child.href}
                icon={child.icon}
                depth={1}
                onNavigate={onNavigate}
                isActive={childActive}
              />
            );
          })}
        </List>
      </Collapse>
    </>
  );
}

function NavGroupHeader({ label }) {
  return (
    <Box sx={{ px: 3, py: 1.5, mt: 2, mb: 1, position: 'relative' }}>
      <Typography
        variant="overline"
        sx={{
          fontSize: 11,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'text.secondary',
          position: 'relative',
          zIndex: 1,
          bgcolor: 'background.paper',
          px: 1,
          display: 'inline-block',
          borderRadius: 1,
        }}
      >
        {label}
      </Typography>
      <Divider
        sx={{
          position: 'absolute',
          top: '50%',
          left: 24,
          right: 24,
          borderColor: 'divider',
          borderWidth: '1px',
        }}
      />
    </Box>
  );
}

function DrawerContent({ onNavigate, company, user }) {
  const router = useRouter();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const navItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ group: 'System', label: 'Audit Log', icon: <HistoryIcon />, href: '/audit-log' }] : []),
  ];

  const renderedGroups = new Set();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: 3,
          py: 3,
          background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5e35b1 100%)',
          color: '#fff',
          minHeight: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexShrink: 0,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            borderRadius: '0 0 16px 16px',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {company.logo ? (
            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, overflow: 'hidden', position: 'relative', bgcolor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', flexShrink: 0, backdropFilter: 'blur(8px)' }}>
              <Image src={company.logo} alt="logo" fill style={{ objectFit: 'contain' }} />
            </Box>
          ) : (
            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(8px)' }}>
              <WarehouseIcon sx={{ fontSize: 24, color: '#fff' }} />
            </Box>
          )}
        </Box>
        <Box sx={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
          <Typography variant="h6" fontWeight={800} lineHeight={1.2} noWrap sx={{ color: '#fff', fontSize: 18, letterSpacing: '-0.025em', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            {company.name || 'WMS Pro'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4caf50', boxShadow: '0 0 8px rgba(76, 175, 80, 0.6)' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Online
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 2, px: 1, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: 2 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0, 0, 0, 0.2)', borderRadius: 2, '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.3)' } }}}>
        <List disablePadding sx={{ px: 0 }}>
          {navItems.map((item, idx) => {
            const showGroupHeader = item.group && !renderedGroups.has(item.group);
            if (item.group) renderedGroups.add(item.group);
            const isLeafActive = !item.children && (router.pathname === item.href);

            return (
              <React.Fragment key={item.href || item.label}>
                {showGroupHeader && <NavGroupHeader label={item.group} />}
                {item.children ? (
                  <NavParent label={item.label} icon={item.icon} children={item.children} onNavigate={onNavigate} />
                ) : (
                  <NavLeaf label={item.label} href={item.href} icon={item.icon} depth={0} onNavigate={onNavigate} isActive={isLeafActive} />
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)', bgcolor: 'rgba(0, 0, 0, 0.02)', mt: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, mb: 0.25 }}>
              {company.name || 'WMS Pro'}
            </Typography>
            <Typography variant="caption" color="text.disabled" display="block" sx={{ fontSize: 10, lineHeight: 1.2 }}>
              v2.1.0 • Enterprise
            </Typography>
          </Box>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', boxShadow: '0 0 8px rgba(76, 175, 80, 0.4)', animation: 'pulse 2s infinite' }} />
        </Box>
      </Box>
    </Box>
  );
}

function usePageTitle(navItems) {
  const router = useRouter();
  const findLabel = (items) => {
    for (const item of items) {
      if (item.href && router.pathname === item.href) return item.label;
      if (item.children) {
        const match = item.children.find((c) => router.pathname === c.href || router.pathname.startsWith(c.href + '/'));
        if (match) return match.label;
      }
    }
    return null;
  };
  return findLabel(navItems) || 'Dashboard';
}

export default function MainLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const { user, logout } = useAuth();
  const { company } = useSettings();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageAnchor, setMessageAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);

  const pageTitle = usePageTitle(NAV_ITEMS);

  useEffect(() => {
    getNotifications({ limit: 5 })
      .then((res) => {
        const data = res.data.data || res.data;
        const items = Array.isArray(data) ? data : data.items || [];
        setMessages(items);
        setUnreadCount(items.filter(n => !n.read).length);
      })
      .catch(() => {});
  }, []);

  const handleDrawerClose = useCallback(() => setMobileOpen(false), []);
  const handleDrawerToggle = useCallback(() => setMobileOpen((o) => !o), []);

  const handleUserMenuOpen = (e) => setUserAnchor(e.currentTarget);
  const handleUserMenuClose = () => setUserAnchor(null);
  const handleMessageOpen = (e) => setMessageAnchor(e.currentTarget);
  const handleMessageClose = () => setMessageAnchor(null);

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  const drawerSx = {
    width: DRAWER_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: DRAWER_WIDTH,
      boxSizing: 'border-box',
      border: 'none',
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
      borderRadius: '0 16px 16px 0',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
    },
  };

  const userInitials = user?.name ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'U';
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ minHeight: 72, gap: 2, px: { xs: 2, sm: 3 } }}>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              display: { md: 'none' },
              color: 'text.secondary',
              mr: 1,
              borderRadius: 2.5,
              p: 1.25,
              '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)', color: 'primary.main' },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <MenuIcon sx={{ fontSize: 24 }} />
          </IconButton>

          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5, flex: 1 }}>
            <Paper
              component="form"
              sx={{
                p: '2px 8px',
                display: 'flex',
                alignItems: 'center',
                width: 320,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <SearchIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
              <InputBase
                placeholder="Search inventory, invoices, customers..."
                sx={{ ml: 1, flex: 1, fontSize: 14 }}
                disabled
              />
            </Paper>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
            <Tooltip title={`${unreadCount} notifications`} arrow>
              <IconButton
                onClick={handleMessageOpen}
                sx={{
                  color: unreadCount > 0 ? 'primary.main' : 'text.secondary',
                  borderRadius: 2.5,
                  p: 1.25,
                  position: 'relative',
                  '&:hover': { bgcolor: unreadCount > 0 ? 'rgba(25, 118, 210, 0.08)' : 'rgba(0,0,0,0.04)' },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <Badge badgeContent={unreadCount} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', minWidth: 18, height: 18 } }}>
                  <MessageIcon sx={{ fontSize: 22 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Account" arrow>
              <Box
                onClick={handleUserMenuOpen}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: 3,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'rgba(21, 101, 192, 0.04)',
                    borderColor: 'primary.light',
                    boxShadow: '0 2px 12px rgba(21, 101, 192, 0.15)',
                  },
                }}
              >
                <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 8px rgba(21, 101, 192, 0.2)' }}>
                  {userInitials}
                </Avatar>
                <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: 14, color: 'text.primary', mb: 0.25 }}>
                    {user?.name || 'User'}
                  </Typography>
                  <Chip
                    label={roleLabel}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 600,
                      bgcolor: user?.role === 'admin' || user?.role === 'superadmin' ? 'primary.light' : 'secondary.light',
                      color: user?.role === 'admin' || user?.role === 'superadmin' ? 'primary.dark' : 'secondary.dark',
                      '& .MuiChip-label': { px: 1 },
                      borderRadius: 1,
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Messages Popover ── */}
      <Menu
        anchorEl={messageAnchor}
        open={Boolean(messageAnchor)}
        onClose={handleMessageClose}
        PaperProps={{
          sx: {
            minWidth: 360,
            maxWidth: 400,
            maxHeight: 400,
            borderRadius: 3,
            mt: 1,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(12px)',
            backgroundColor: 'rgba(255, 255, 255, 0.97)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 3, py: 2.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16 }}>
            Messages ({unreadCount})
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Most recent conversations
          </Typography>
        </Box>
        <Box sx={{ maxHeight: 300, overflow: 'auto', py: 1 }}>
          {messages.length === 0 ? (
            <MenuItem disabled sx={{ py: 4, justifyContent: 'center', textAlign: 'center' }}>
              <MessageIcon sx={{ fontSize: 48, color: 'action.active', mb: 1 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  No new messages
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Start a conversation
                </Typography>
              </Box>
            </MenuItem>
          ) : (
            messages.map((msg, idx) => (
              <MenuItem
                key={msg.id}
                onClick={() => {
                  handleMessageClose();
                  router.push('/messages');
                }}
                sx={{
                  py: 2,
                  borderRadius: 2,
                  mx: 1,
                  my: 0.5,
                  gap: 2,
                  '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.04)' },
                }}
              >
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                  {msg.senderName?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
                    {msg.senderName || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 0.25 }}>
                    {msg.content?.substring(0, 60)}...
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {dayjs(msg.createdAt).fromNow()}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            handleMessageClose();
            router.push('/messages');
          }}
          sx={{ justifyContent: 'center', py: 2 }}
        >
          <Typography variant="body2" fontWeight={600} color="primary">
            View all messages
          </Typography>
        </MenuItem>
      </Menu>

      {/* ── User Menu (same as before) ── */}
      <Menu
        anchorEl={userAnchor}
        open={Boolean(userAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            minWidth: 240,
            borderRadius: 3,
            mt: 1,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: 16, fontWeight: 700 }}>
              {userInitials}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                {user?.name || 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                {user?.email || user?.username || ''}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={roleLabel}
            size="small"
            sx={{
              fontSize: 10,
              fontWeight: 600,
              bgcolor: user?.role === 'admin' || user?.role === 'superadmin' ? 'primary.light' : 'secondary.light',
              color: user?.role === 'admin' || user?.role === 'superadmin' ? 'primary.dark' : 'secondary.dark',
              borderRadius: 1,
            }}
          />
        </Box>

        <MenuItem onClick={() => { handleUserMenuClose(); router.push('/profile'); }} sx={{ py: 1.5, gap: 2, mx: 1, my: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(21, 101, 192, 0.08)', color: 'primary.main' } }}>
          <AccountCircleIcon fontSize="small" sx={{ fontSize: 20 }} />
          <Typography variant="body2" fontWeight={500}>Profile</Typography>
        </MenuItem>

        <MenuItem onClick={() => { handleUserMenuClose(); router.push('/change-password'); }} sx={{ py: 1.5, gap: 2, mx: 1, my: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(21, 101, 192, 0.08)', color: 'primary.main' } }}>
          <LockResetIcon fontSize="small" sx={{ fontSize: 20 }} />
          <Typography variant="body2" fontWeight={500}>Change Password</Typography>
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem onClick={handleLogout} sx={{ py: 1.5, gap: 2, mx: 1, my: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.08)', color: 'error.main' } }}>
          <LogoutIcon fontSize="small" sx={{ fontSize: 20 }} />
          <Typography variant="body2" fontWeight={500}>Logout</Typography>
        </MenuItem>
      </Menu>

      {!isMobile && (
        <Drawer variant="permanent" sx={drawerSx} open>
          <Toolbar sx={{ minHeight: 64 }} />
          <DrawerContent onNavigate={() => {}} company={company} user={user} />
        </Drawer>
      )}

      {isMobile && (
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerClose} ModalProps={{ keepMounted: true }} sx={drawerSx}>
          <DrawerContent onNavigate={handleDrawerClose} company={company} user={user} />
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          minHeight: '100vh',
          bgcolor: '#f8fafc',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

