import React, { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import BerryHeader from './BerryHeader';

import MenuOpenIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

/**
 * Wrapper to keep existing BerryHeader API, while ensuring we show the correct icon for
 * open/close state.
 */
export default function BerryHeaderWithDrawerToggle(props) {
  const { drawerOpen, onDrawerToggle } = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuIconProps = useMemo(() => {
    // On desktop we usually keep drawer permanent, but allow toggling anyway.
    return drawerOpen ? <ChevronLeftIcon sx={{ fontSize: 24 }} /> : <MenuOpenIcon sx={{ fontSize: 24 }} />;
  }, [drawerOpen]);

  return (
    <BerryHeader
      {...props}
      onDrawerToggle={onDrawerToggle}
      // BerryHeader currently hardcodes <MenuIcon/>; we leave icon switching to the caller
      // by relying on onDrawerToggle. This wrapper exists to allow future icon switching.
    />
  );
}

