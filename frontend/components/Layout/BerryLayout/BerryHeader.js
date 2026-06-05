import React from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import MenuIcon from '@mui/icons-material/Menu';
import MessageIcon from '@mui/icons-material/Message';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockResetIcon from '@mui/icons-material/LockReset';
import LogoutIcon from '@mui/icons-material/Logout';

export default function BerryHeader({
  pageTitle,
  companyName,
  user,
  roleLabel,
  unreadCount,
  drawerOpen,
  onDrawerToggle,
  messageAnchor,
  onMessageOpen,
  onMessageClose,
  messages,
  onMessageNavigate,
  userAnchor,
  onUserMenuOpen,
  onUserMenuClose,
  onLogout,
  onProfileNavigate,
  onChangePasswordNavigate,
}) {
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
      <Toolbar
      sx={{
        minHeight: 72,
        height: 72,
        gap: { xs: 1, sm: 2 },
        px: { xs: 1.5, sm: 3 },
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Tooltip title={drawerOpen ? 'Hide sidebar' : 'Show sidebar'} arrow>
        <IconButton
          edge="start"
          onClick={onDrawerToggle}
          aria-label={drawerOpen ? 'Hide navigation' : 'Show navigation'}
          aria-expanded={Boolean(drawerOpen)}
          sx={{
            color: drawerOpen ? 'primary.main' : 'text.secondary',
            mr: 1,
            borderRadius: 2.5,
            p: 1.25,
            '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)', color: 'primary.main' },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <MenuIcon sx={{ fontSize: 24 }} />
        </IconButton>
      </Tooltip>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          flexWrap: 'nowrap',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            maxWidth: { xs: 140, sm: 220, md: 280 },
            fontSize: { xs: 16, sm: 17 },
          }}
        >
          {companyName || 'WMS Pro'}
        </Typography>

        <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0, overflow: 'hidden' }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontWeight: 200,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 200,
            }}
          >
            {pageTitle}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
        <Tooltip title={`${unreadCount} notifications`} arrow>
          <IconButton
            onClick={onMessageOpen}
            sx={{
              color: unreadCount > 0 ? 'primary.main' : 'text.secondary',
              borderRadius: 2.5,
              p: 1.25,
              position: 'relative',
              '&:hover': {
                bgcolor: unreadCount > 0 ? 'rgba(25, 118, 210, 0.08)' : 'rgba(0,0,0,0.04)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <Badge
              badgeContent={unreadCount}
              color="primary"
              sx={{
                '& .MuiBadge-badge': { fontSize: '0.75rem', minWidth: 18, height: 18 },
              }}
            >
              <MessageIcon sx={{ fontSize: 22 }} />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Account" arrow>
          <Box
            onClick={onUserMenuOpen}
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
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontSize: 14,
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(21, 101, 192, 0.2)',
              }}
            >
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
                  bgcolor:
                    user?.role === 'admin' || user?.role === 'superadmin'
                      ? 'primary.light'
                      : 'secondary.light',
                  color:
                    user?.role === 'admin' || user?.role === 'superadmin'
                      ? 'primary.dark'
                      : 'secondary.dark',
                  '& .MuiChip-label': { px: 1 },
                  borderRadius: 1,
                }}
              />
            </Box>
          </Box>
        </Tooltip>
      </Box>

      {/* Messages Popover */}
      <Menu
        anchorEl={messageAnchor}
        open={Boolean(messageAnchor)}
        onClose={onMessageClose}
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
          {messages?.length ? (
            messages.map((msg) => (
              <MenuItem
                key={msg.id}
                onClick={() => {
                  onMessageNavigate?.();
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
                  {/* kept simple; parent can provide relative time if desired */}
                  <Typography variant="caption" color="text.disabled">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          ) : (
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
          )}
        </Box>
        <MenuItem
          onClick={() => {
            onMessageNavigate?.();
          }}
          sx={{ justifyContent: 'center', py: 2 }}
        >
          <Typography variant="body2" fontWeight={600} color="primary">
            View all messages
          </Typography>
        </MenuItem>
      </Menu>

      {/* User Menu */}
      <Menu
        anchorEl={userAnchor}
        open={Boolean(userAnchor)}
        onClose={onUserMenuClose}
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
              bgcolor:
                user?.role === 'admin' || user?.role === 'superadmin'
                  ? 'primary.light'
                  : 'secondary.light',
              color:
                user?.role === 'admin' || user?.role === 'superadmin'
                  ? 'primary.dark'
                  : 'secondary.dark',
              borderRadius: 1,
            }}
          />
        </Box>

        <MenuItem
          onClick={() => {
            onUserMenuClose?.();
            onProfileNavigate?.();
          }}
          sx={{
            py: 1.5,
            gap: 2,
            mx: 1,
            my: 0.5,
            borderRadius: 2,
            '&:hover': { bgcolor: 'rgba(21, 101, 192, 0.08)', color: 'primary.main' },
          }}
        >
          <AccountCircleIcon fontSize="small" sx={{ fontSize: 20 }} />
          <Typography variant="body2" fontWeight={500}>
            Profile
          </Typography>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onUserMenuClose?.();
            onChangePasswordNavigate?.();
          }}
          sx={{
            py: 1.5,
            gap: 2,
            mx: 1,
            my: 0.5,
            borderRadius: 2,
            '&:hover': { bgcolor: 'rgba(21, 101, 192, 0.08)', color: 'primary.main' },
          }}
        >
          <LockResetIcon fontSize="small" sx={{ fontSize: 20 }} />
          <Typography variant="body2" fontWeight={500}>
            Change Password
          </Typography>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onUserMenuClose?.();
            onLogout?.();
          }}
          sx={{
            py: 1.5,
            gap: 2,
            mx: 1,
            my: 0.5,
            borderRadius: 2,
            '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.08)', color: 'error.main' },
          }}
        >
          <LogoutIcon fontSize="small" sx={{ fontSize: 20 }} />
          <Typography variant="body2" fontWeight={500}>
            Logout
          </Typography>
        </MenuItem>
      </Menu>
    </Toolbar>
  );
}
