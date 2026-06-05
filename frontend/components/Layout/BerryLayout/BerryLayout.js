import React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import ProSidebar from './ProSidebar';
import BerryHeader from './BerryHeader';

export default function BerryLayout({
  children,
  pageTitle,
  company,
  user,
  roleLabel,
  unreadCount,
  messages,
  navItems,
  routerPath,
  drawerWidth = 264,
  onNotificationsOpen,
  onNotificationsClose,
  onMessageNavigate,
  onUserMenuOpen,
  onUserMenuClose,
  userAnchor,
  messageAnchor,
  drawerOpen,
  onDrawerToggle,
  onDrawerClose,
  onLogout,
  onProfileNavigate,
  onChangePasswordNavigate,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const activeDrawerWidth = !isMobile && drawerOpen ? drawerWidth : 0;
  const drawerTransition = theme.transitions.create(['width', 'left'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={onDrawerClose || onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? drawerWidth : activeDrawerWidth,
          flexShrink: 0,
          transition: drawerTransition,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: isMobile ? '4px 0 24px rgba(0, 0, 0, 0.12)' : 'none',
            borderRadius: isMobile ? '0 16px 16px 0' : 0,
            overflow: 'hidden',
            background: '#fff',
            top: isMobile ? undefined : 0,
            height: isMobile ? undefined : '100vh',
            position: isMobile ? undefined : 'fixed',
            transition: drawerTransition,
          },
        }}
      >
        <ProSidebar
          company={company}
          navItems={navItems}
          routerPath={routerPath}
          drawerWidth={drawerWidth}
          onLeafNavigate={(href) => {
            // Close the drawer on mobile immediately; navigation itself is handled by ProSidebar (leaf click).
            if (isMobile) {
              if (onDrawerClose) onDrawerClose();
              else onDrawerToggle();
            }
          }}
          onDrawerToggle={onDrawerToggle}
        />
      </Drawer>


      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          minHeight: '100vh',
          bgcolor: '#f8fafc',
          width: '100%',
          overflowX: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            // Avoid covering the drawer: header follows open/closed drawer width on desktop.
            left: { md: activeDrawerWidth, xs: 0 },
            right: 0,
            zIndex: 1200,
            transition: drawerTransition,
          }}
        >
          <BerryHeader
            pageTitle={pageTitle}
            companyName={company?.name}
            user={user}
            roleLabel={roleLabel}
            unreadCount={unreadCount}
            drawerOpen={drawerOpen}
            onDrawerToggle={onDrawerToggle}
            messageAnchor={messageAnchor}
            onMessageOpen={onNotificationsOpen}
            onMessageClose={onNotificationsClose}
            messages={messages}
            onMessageNavigate={onMessageNavigate}
            userAnchor={userAnchor}
            onUserMenuOpen={onUserMenuOpen}
            onUserMenuClose={onUserMenuClose}
            onLogout={onLogout}
            onProfileNavigate={onProfileNavigate}
            onChangePasswordNavigate={onChangePasswordNavigate}
          />
        </Box>

        <Box sx={{ pt: 9 }}>{children}</Box>
      </Box>
    </Box>
  );
}
