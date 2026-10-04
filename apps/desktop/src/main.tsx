import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@exzaestate/api-client';
import { PlatformProvider, AuthProvider, initApiClient } from '@exzaestate/app-core';
import { routes } from '@exzaestate/features';
import { desktopPlatformAdapters, desktopApiConfig } from './platform/index.js';

// Initialize API client base URL and client info
initApiClient(desktopApiConfig);

// Mount single route tree from packages/features
const router = createBrowserRouter(routes);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found in DOM');
}

const root = createRoot(container);
root.render(
  <QueryClientProvider client={queryClient}>
    <PlatformProvider adapters={desktopPlatformAdapters}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </PlatformProvider>
  </QueryClientProvider>,
);
