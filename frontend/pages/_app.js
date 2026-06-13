import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { SnackbarProvider } from 'notistack';
import { GoogleOAuthProvider } from '@react-oauth/google';

import theme from '../theme/index';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { PermissionsProvider } from '../context/PermissionsContext';

const PUBLIC_ROUTES = ['/login', '/signup'];

const isCancelledRouteChange = (error) => {
  if (!error) return false;
  return error.cancelled || String(error.message || '').includes('Abort fetching component');
};

const replaceRoute = (router, href) => {
  if (router.asPath === href) return;

  router.replace(href).catch((error) => {
    if (!isCancelledRouteChange(error)) {
      console.error(error);
    }
  });
};

const replaceDocument = (href) => {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname === href) return true;

  window.location.replace(href);
  return true;
};

const unregisterLegacyServiceWorkers = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    })
    .catch(() => {});

  if ('caches' in window) {
    window.caches
      .keys()
      .then((cacheNames) => {
        cacheNames.forEach((cacheName) => window.caches.delete(cacheName));
      })
      .catch(() => {});
  }
};

// Suppress react-to-print's findDOMNode deprecation warning
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const shouldSuppress = (...args) => {
    const message = String(args[0] || '');
    return message.includes('findDOMNode is deprecated') || 
           message.includes('Warning: findDOMNode is deprecated');
  };
  
  console.error = (...args) => {
    if (!shouldSuppress(...args)) {
      originalError.call(console, ...args);
    }
  };
  
  console.warn = (...args) => {
    if (!shouldSuppress(...args)) {
      originalWarn.call(console, ...args);
    }
  };
}

function AppContent({ Component, pageProps }) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    unregisterLegacyServiceWorkers();
  }, []);

  useEffect(() => {
    if (!loading && router.isReady) {
      const isPublic = PUBLIC_ROUTES.includes(router.pathname);
      if (!isAuthenticated && !isPublic) {
        replaceRoute(router, '/login');
      }
      if (isAuthenticated && isPublic) {
        if (!replaceDocument('/dashboard')) {
          replaceRoute(router, '/dashboard');
        }
      }
    }
  }, [loading, isAuthenticated, router.isReady, router.pathname, router]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const isPublic = PUBLIC_ROUTES.includes(router.pathname);

  // Not authenticated on protected route — redirect pending, render nothing
  if (!isAuthenticated && !isPublic) return null;

  // Authenticated but on a public route (login/signup) — redirect pending, render nothing
  if (isAuthenticated && isPublic) return null;

  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <Head>
        <title>WMS Pro</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <PermissionsProvider>
            <SettingsProvider>
              <SnackbarProvider
                maxSnack={3}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              >
                <AppContent Component={Component} pageProps={pageProps} />
              </SnackbarProvider>
            </SettingsProvider>
          </PermissionsProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
