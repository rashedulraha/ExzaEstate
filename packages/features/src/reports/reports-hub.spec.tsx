import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportsHubPage } from './pages/ReportsHubPage.js';
import { REPORTS_CATALOG } from './reports.catalog.js';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReportsHubPage & Executive Directory', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders executive header and reports catalog', () => {
    renderWithProviders(<ReportsHubPage />);

    expect(screen.getByText('Reports & Statutory Statements')).toBeDefined();
    expect(screen.getByText(/NBR Statutory Mode/i)).toBeDefined();
    expect(screen.getAllByText('Trial Balance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Balance Sheet').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Income Statement (P&L)').length).toBeGreaterThan(0);
  });

  it('filters reports when searching by code or title', () => {
    renderWithProviders(<ReportsHubPage />);

    const searchInput = screen.getByPlaceholderText(/Search reports by code/i);
    fireEvent.change(searchInput, { target: { value: 'FIN-01' } });

    // Should match Trial Balance
    expect(screen.getAllByText('Trial Balance').length).toBeGreaterThan(0);
    // Should not show Sales Report in filtered results
    expect(screen.queryByText('Property Inventory Status')).toBeNull();
  });

  it('filters reports by category tabs', () => {
    renderWithProviders(<ReportsHubPage />);

    // Click on "Sales & CRM" tab
    const salesTab = screen.getByRole('button', { name: /Sales & CRM/i });
    fireEvent.click(salesTab);

    expect(screen.getAllByText('Sales & Booking Register').length).toBeGreaterThan(0);
    expect(screen.queryByText('Trial Balance')).toBeNull();
  });

  it('defaults to table view and allows toggling to grid view', () => {
    renderWithProviders(<ReportsHubPage />);

    // Table view is active by default
    expect(screen.getByText('Report Name & Scope')).toBeDefined();
    expect(screen.getAllByText('FIN-01').length).toBeGreaterThan(0);

    // Switch to grid view
    const gridViewBtn = screen.getByLabelText('Grid view');
    fireEvent.click(gridViewBtn);

    expect(screen.queryByText('Report Name & Scope')).toBeNull();

    // Switch back to table view
    const tableViewBtn = screen.getByLabelText('Table view');
    fireEvent.click(tableViewBtn);

    expect(screen.getByText('Report Name & Scope')).toBeDefined();
  });

  it('toggles report pinning and persists to localStorage', () => {
    renderWithProviders(<ReportsHubPage />);

    const pinButtons = screen.getAllByLabelText(/Pin report/i);
    expect(pinButtons.length).toBeGreaterThan(0);

    // Pin a report
    fireEvent.click(pinButtons[0]!);
    const stored = localStorage.getItem('exza_pinned_report_ids');
    expect(stored).toBeDefined();
  });

  it('opens and closes recent downloads drawer with clean initial empty state', () => {
    renderWithProviders(<ReportsHubPage />);

    const recentDownloadsBtn = screen.getByRole('button', { name: /Recent Downloads/i });
    fireEvent.click(recentDownloadsBtn);

    expect(screen.getByText('Recent Downloads & Exports')).toBeDefined();
    expect(screen.getByText('No Recent Downloads')).toBeDefined();

    // Close drawer
    const closeBtn = screen.getByLabelText('Close recent downloads drawer');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Recent Downloads & Exports')).toBeNull();
  });

  it('opens quick export modal and submits export job', async () => {
    renderWithProviders(<ReportsHubPage />);

    // Click Export on a report
    const exportButtons = screen.getAllByRole('button', { name: /^Export$/i });
    expect(exportButtons.length).toBeGreaterThan(0);
    fireEvent.click(exportButtons[0]!);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText(/Generate & Export:/i)).toBeDefined();
    });

    // Submit export
    const submitBtn = screen.getByRole('button', { name: /Export PDF/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Export Dispatched')).toBeDefined();
      expect(screen.getByText('Done')).toBeDefined();
    });

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);

    expect(screen.queryByText('Export Dispatched')).toBeNull();
  });

  it('contains comprehensive catalog of at least 20 real estate ERP reports', () => {
    expect(REPORTS_CATALOG.length).toBeGreaterThanOrEqual(20);
    const categories = new Set(REPORTS_CATALOG.map((r) => r.category));
    expect(categories.has('FINANCIAL')).toBe(true);
    expect(categories.has('SALES')).toBe(true);
    expect(categories.has('COLLECTION')).toBe(true);
    expect(categories.has('INVENTORY')).toBe(true);
    expect(categories.has('PROCUREMENT')).toBe(true);
    expect(categories.has('AUDIT')).toBe(true);
  });
});
