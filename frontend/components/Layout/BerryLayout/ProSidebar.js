import React from 'react';

import { useRouter } from 'next/router';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import MenuIcon from '@mui/icons-material/Menu';

function NavLeaf({ label, href, icon, depth, onNavigate, active }) {
  return (
    <ListItemButton
      onClick={onNavigate}
      selected={active}
      sx={{
        pl: depth === 0 ? 2.5 : 2.5 + depth * 1.2,
        pr: 2,
        borderRadius: 2,
        mx: 1,
        mb: 0.25,
        minHeight: 40,
        '&.Mui-selected': {
          bgcolor: 'action.selected',
          '&:hover': { bgcolor: 'action.selected' },
        },
      }}
    >
      {icon ? (
        <ListItemIcon sx={{ minWidth: 34, color: active ? 'primary.main' : 'text.secondary' }}>
          {icon}
        </ListItemIcon>
      ) : null}
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: depth === 0 ? 13.5 : 13,
          fontWeight: active ? 700 : 600,
          letterSpacing: '-0.01em',
        }}
      />
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
        selected={isChildActive}
        sx={{
          borderRadius: 2,
          mx: 1,
          mb: 0.25,
          minHeight: 40,
        }}
      >
        {icon ? (
          <ListItemIcon sx={{ minWidth: 34, color: isChildActive ? 'primary.main' : 'text.secondary' }}>
            {icon}
          </ListItemIcon>
        ) : null}
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: 13.5,
            fontWeight: isChildActive ? 750 : 650,
            letterSpacing: '-0.01em',
          }}
        />
      </ListItemButton>

      <Collapse in={open} timeout={200} unmountOnExit>
        <Box sx={{ pl: 0.5, pr: 1 }}>
          {children.map((child) => {
            const active = routerPath === child.href || routerPath.startsWith(child.href + '/');
            return (
              <NavLeaf
                key={child.href}
                label={child.label}
                href={child.href}
                icon={child.icon}
                depth={1}
                onNavigate={() => onNavigate(child.href)}
                active={active}
              />
            );
          })}
        </Box>
      </Collapse>
    </>
  );
}

export default function ProSidebar({
  company,
  navItems,
  routerPath,
  drawerWidth,
  onLeafNavigate,
  onDrawerToggle,
}) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        height: '100%',
        bgcolor: '#fff',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Sidebar top */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 64,
        }}
      >
        {isMobile ? (
          <IconButton
            onClick={onDrawerToggle}
            aria-label="Close navigation"
            sx={{ mr: 0.5 }}
          >
            <MenuIcon />
          </IconButton>
        ) : null}

        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            flexShrink: 0,
          }}
        >
          {(company?.name || 'WMS Pro')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0])
            .join('')
            .toUpperCase()}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            noWrap
            sx={{ fontWeight: 850, fontSize: 14, letterSpacing: '-0.02em' }}
          >
            {company?.name || 'WMS Pro'}
          </Typography>
          <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
            Dashboard
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <List disablePadding>
          {navItems.map((item) => {
            const showGroupHeader = item.group;

            const groupKey = item.group || item.label;

            // Leaf
            if (!item.children) {
              const active = routerPath === item.href || routerPath.startsWith(item.href + '/');
              return (
                <React.Fragment key={item.href || item.label || groupKey}>
                  {showGroupHeader ? (
                    <Box sx={{ px: 2.5, py: 1 }}>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: 'text.secondary',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.group}
                      </Typography>
                    </Box>
                  ) : null}

                  <NavLeaf
                    label={item.label}
                    href={item.href}
                    icon={item.icon}
                    depth={0}
                    onNavigate={() => {
                      router.push(item.href);
                      if (onLeafNavigate) onLeafNavigate(item.href);
                    }}
                    active={active}
                  />
                </React.Fragment>
              );
            }

            // Group with children
            return (
              <Box key={item.href || item.label || groupKey}>
                {item.group ? (
                  <Box sx={{ px: 2.5, pt: 1.25, pb: 0.75 }}>
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: 'text.secondary',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.group}
                    </Typography>
                  </Box>
                ) : null}

                <NavCollapse
                  label={item.label}
                  icon={item.icon}
                  routerPath={routerPath}
                  onNavigate={(href) => {
                    router.push(href);
                    if (onLeafNavigate) onLeafNavigate(href);
                  }}
                  children={item.children}
                />
              </Box>
            );
          })}
        </List>
      </Box>

      <Divider />

      <Box sx={{ px: 2.5, py: 1.5 }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 650 }} noWrap>
          {company?.name || 'WMS Pro'}
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600 }} noWrap>
          v2.1.0 • Enterprise
        </Typography>
      </Box>
    </Box>
  );
}

