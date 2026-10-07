import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@exzaestate/api-client';
import { PlatformProvider, AuthProvider, initApiClient } from '@exzaestate/app-core';
import { routes } from '@exzaestate/features';
import { webPlatformAdapters, webApiConfig } from './platform/index.js';
import './index.css';

// Initialize API client base URL and client info
initApiClient(webApiConfig);

// Mount single route tree from packages/features
const router = createBrowserRouter(routes);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found in DOM');
}

const root = createRoot(container);
root.render(
  <QueryClientProvider client={queryClient}>
    <PlatformProvider adapters={webPlatformAdapters}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </PlatformProvider>
  </QueryClientProvider>,
);
