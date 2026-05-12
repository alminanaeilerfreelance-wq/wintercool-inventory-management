import React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';


import MenuIcon from '@mui/icons-material/Menu';

import Image from 'next/image';

function NavLeaf({ label, href, icon, depth, onNavigate, routerPath }) {
  const active = routerPath === href || routerPath.startsWith(href + '/');

  return (
    <ListItemButton
      onClick={onNavigate}
      selected={active}
      sx={{
        pl: depth === 0 ? 3 : depth * 2 + 2,
        pr: 2,
        borderRadius: 2.5,
        mx: 1.5,
        mb: 0.5,
        minHeight: 44,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateX(4px)',
        },
        '&.Mui-selected': {
          bgcolor: 'rgba(21, 101, 192, 0.14)',
          color: '#1565c0',
          borderLeft: '3px solid #1565c0',
          pl: depth === 0 ? 2.625 : depth * 2 + 1.625,
          boxShadow: '0 4px 12px rgba(21, 101, 192, 0.18)',
          '& .MuiListItemIcon-root': { color: '#1565c0' },
        },
        '&:not(.Mui-selected):hover': {
          bgcolor: 'rgba(21, 101, 192, 0.08)',
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

function NavCollapse({ label, icon, children, routerPath, onNavigate }) {
  const isChildActive = children.some(
    (c) => routerPath === c.href || routerPath.startsWith(c.href + '/')
  );
  const [open, setOpen] = React.useState(isChildActive);

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
      </ListItemButton>

      <Collapse in={open} timeout={300} unmountOnExit>
        <List disablePadding sx={{ mt: 0.5, mb: 1 }}>
          {children.map((child) => (
            <NavLeaf
              key={child.href}
              label={child.label}
              href={child.href}
              icon={child.icon}
              depth={1}
              onNavigate={onNavigate}
              routerPath={routerPath}
            />
          ))}
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

export default function BerrySidebar({
  drawerOpen,
  onDrawerToggle,
  company,
  user,
  navItems,
  routerPath,
  onLeafNavigate,
  drawerWidth = 264,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const renderedGroups = new Set();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: 2.5,
          py: 2,
          background: 'linear-gradient(180deg, rgba(26,35,126,1) 0%, rgba(57,73,171,1) 55%, rgba(94,53,177,1) 100%)',
          color: '#fff',
          minHeight: 76,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexShrink: 0,
          position: 'relative',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {isMobile ? (
          <Box sx={{ position: 'absolute', right: 12, top: 12, zIndex: 2 }}>
            <IconButton
              onClick={() => {
                // Close drawer on mobile; sidebar currently doesn't own drawer state.
                // This prop is wired from BerryLayout to call drawer toggle/close.
                if (onLeafNavigate) onLeafNavigate();
              }}
              aria-label="Close navigation"
              sx={{
                color: 'rgba(255,255,255,0.95)',
                backgroundColor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' },
              }}
            >
              <MenuIcon sx={{ transform: 'rotate(180deg)', fontSize: 22 }} />
            </IconButton>
          </Box>
        ) : null}

        <Box sx={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          {company.logo ? (
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                overflow: 'hidden',
                bgcolor: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Image src={company.logo} alt="logo" fill style={{ objectFit: 'contain' }} />
            </Box>
          ) : (
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                bgcolor: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            />
          )}
        </Box>

        <Box sx={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h6"
            fontWeight={800}
            lineHeight={1.2}
            noWrap
            sx={{
              color: '#fff',
              fontSize: 17,
              letterSpacing: '-0.025em',
              textShadow: '0 2px 4px rgba(0,0,0,0.18)',
              maxWidth: 180,
            }}
          >
            {company.name || 'WMS Pro'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4caf50' }} />
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}
            >
              Online
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 2,
          px: 1,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: 2 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 2,
            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.3)' },
          },
        }}
      >
        <List disablePadding sx={{ px: 0 }}>

          {navItems.map((item) => {
            const showGroupHeader = item.group && !renderedGroups.has(item.group);
            if (item.group) renderedGroups.add(item.group);
            return (
              <React.Fragment key={item.href || item.label}>
                {showGroupHeader && <NavGroupHeader label={item.group} />}
                {item.children ? (
                  <NavCollapse
                    label={item.label}
                    icon={item.icon}
                    routerPath={routerPath}
                    onNavigate={onLeafNavigate}
                    children={item.children}
                  />
                ) : (
                  <ListItemButton
                    onClick={() => onLeafNavigate(item.href)}
                    sx={{ display: 'block', width: '100%' }}
                    aria-label={item.label}
                  >
                    <NavLeaf
                      label={item.label}
                      href={item.href}
                      icon={item.icon}
                      depth={0}
                      routerPath={routerPath}
                      onNavigate={() => onLeafNavigate(item.href)}
                    />
                  </ListItemButton>
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
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', boxShadow: '0 0 8px rgba(76, 175, 80, 0.4)' }} />
        </Box>
      </Box>
    </Box>
  );
}

