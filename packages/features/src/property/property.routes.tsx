import { type RouteObject } from 'react-router';
import { PropertyListPage } from './pages/PropertyListPage.js';
import { PropertyDetailPage } from './pages/PropertyDetailPage.js';

export const propertyRoutes: RouteObject[] = [
  {
    path: '/properties',
    element: <PropertyListPage />,
  },
  {
    path: '/properties/:id',
    element: <PropertyDetailPage />,
  },
];
