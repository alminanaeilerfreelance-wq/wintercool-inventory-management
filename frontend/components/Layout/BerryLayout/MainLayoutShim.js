import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { getNotifications } from '../../../utils/api';

import BerryLayout from '../BerryLayout/BerryLayout';

import {
  AssessmentIcon,
  CalendarMonthIcon,
  CloudUploadIcon,
  DashboardIcon,
  InventoryIcon,
  ManageAccountsIcon,
  PeopleIcon,
  ReceiptIcon,
  SettingsIcon,
  ShoppingCartIcon,
  StorageIcon,
  TuneIcon,
  BusinessIcon,
  CategoryIcon,
  PlaceIcon,
  BuildIcon,
  WarehouseIcon,
} from './icons';

const DRAWER_WIDTH = 264;

const NAV_ITEMS_BASE = [
  // { label: 'Messages', href: '/messages', icon: <AssessmentIcon /> },
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
      { label: 'Bulk Import', href: '/inventory/bulk-import', icon: <CloudUploadIcon /> },
    ],
  },
  {
    label: 'Invoices',
    icon: <ReceiptIcon />,
    children: [
      { label: 'Customer Invoices', href: '/invoices/customer' },
      { label: 'Service Invoices', href: '/invoices/service' },
      // { label: 'Sub-Dealer Invoices', href: '/invoices/sub-dealers' },
      { label: 'Purchase Orders', href: '/invoices/purchase-orders', icon: <ShoppingCartIcon /> },
      { label: 'Return Orders', href: '/invoices/return-orders' },
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

function usePageTitle(navItems, pathname) {
  const findLabel = (items) => {
    for (const item of items) {
      if (item.href && pathname === item.href) return item.label;
      if (item.children) {
        const match = item.children.find(
          (c) => pathname === c.href || pathname.startsWith(c.href + '/')
        );
        if (match) return match.label;
      }
    }
    return null;
  };
  return findLabel(navItems) || 'Dashboard';
}

export default function MainLayoutShim({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { company } = useSettings();

  const [drawerOpen, setDrawerOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageAnchor, setMessageAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);

  useEffect(() => {
    getNotifications({ limit: 5 })
      .then((res) => {
        const data = res.data.data || res.data;
        const items = Array.isArray(data) ? data : data.items || [];
        setMessages(items);
        setUnreadCount(items.filter((n) => !n.read).length);
      })
      .catch(() => {});
  }, []);

  const handleDrawerToggle = useCallback(() => setDrawerOpen((o) => !o), []);
  const handleDrawerClose = useCallback(() => setDrawerOpen(false), []);


  const handleUserMenuOpen = (e) => setUserAnchor(e.currentTarget);
  const handleUserMenuClose = () => setUserAnchor(null);

  const handleMessageOpen = (e) => setMessageAnchor(e.currentTarget);
  const handleMessageClose = () => setMessageAnchor(null);

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'User';


  const baseNavItems =
    user?.role === 'user'
      ? NAV_ITEMS_BASE.filter((item) => item.label !== 'Dashboard' && item.label !== 'Settings')
      : NAV_ITEMS_BASE;

  const navItems = [
    ...baseNavItems,
    ...(user?.role === 'admin' || user?.role === 'superadmin'
      ? [{ group: 'System', label: 'Audit Log', icon: <AssessmentIcon />, href: '/audit-log' }]
      : []),
  ];




  const pageTitle = usePageTitle(navItems, router.pathname);

  return (
    <BerryLayout
      pageTitle={pageTitle}
      company={company}
      user={user}
      roleLabel={roleLabel}f
      unreadCount={unreadCount}
      messages={messages}
      navItems={navItems}
      routerPath={router.pathname}
      drawerWidth={DRAWER_WIDTH}
      drawerOpen={drawerOpen}
      onDrawerToggle={handleDrawerToggle}
      onDrawerClose={handleDrawerClose}
      onNotificationsOpen={handleMessageOpen}

      onNotificationsClose={handleMessageClose}
      onMessageNavigate={() => {
        handleMessageClose();
        router.push('/messages');
      }}
      onUserMenuOpen={handleUserMenuOpen}
      onUserMenuClose={handleUserMenuClose}
      userAnchor={userAnchor}
      messageAnchor={messageAnchor}
      onLogout={handleLogout}
      onProfileNavigate={() => {
        handleUserMenuClose();
        router.push('/profile');
      }}
      onChangePasswordNavigate={() => {
        handleUserMenuClose();
        router.push('/change-password');
      }}
    >
      {children}
    </BerryLayout>
  );
}

