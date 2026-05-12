import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import MainLayout from '../components/Layout/MainLayout';

export default function ChangePasswordPage() {
  return (
    <MainLayout pageTitle="Change Password">
      <Box sx={{ maxWidth: 720 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
          Change Password
        </Typography>
        <Typography color="text.secondary">
          This page is currently a placeholder. Connect this UI to the backend password-change endpoint.
        </Typography>
      </Box>
    </MainLayout>
  );
}

