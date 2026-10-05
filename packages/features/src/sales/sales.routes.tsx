import type { RouteObject } from 'react-router';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { QuotationListPage } from './pages/QuotationListPage.js';
import { BookingListPage } from './pages/BookingListPage.js';
import { AgreementListPage } from './pages/AgreementListPage.js';

export const salesRoutes: RouteObject[] = [
  {
    path: 'sales/quotations',
    element: (
      <PermissionGate permission={PERMISSIONS.QUOTATION_VIEW}>
        <QuotationListPage />
      </PermissionGate>
    ),
  },
  {
    path: 'sales/bookings',
    element: (
      <PermissionGate permission={PERMISSIONS.BOOKING_VIEW}>
        <BookingListPage />
      </PermissionGate>
    ),
  },
  {
    path: 'sales/agreements',
    element: (
      <PermissionGate permission={PERMISSIONS.AGREEMENT_VIEW}>
        <AgreementListPage />
      </PermissionGate>
    ),
  },
];
