import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, BottomNav, DataTableSkeleton, useIsMobile } from './index.js';

describe('Responsive Components & Mobile Navigation (design.md §9)', () => {
  it('renders DataTable variant="cards" on mobile with selection and row click', () => {
    interface TestCardItem {
      id: string;
      title: string;
      unit: string;
      price: string;
    }
    const cols = [
      { key: 'title', header: 'Project' },
      { key: 'unit', header: 'Unit No' },
      { key: 'price', header: 'Price', isMoney: true },
    ];
    const data: TestCardItem[] = [
      { id: 'c1', title: 'Gulshan Grace', unit: 'A-401', price: 'BDT 2,50,00,000' },
      { id: 'c2', title: 'Banani Heights', unit: 'B-202', price: 'BDT 1,80,00,000' },
    ];

    const handleSelectRow = vi.fn();
    const handleRowClick = vi.fn();

    render(
      <DataTable
        columns={cols}
        data={data}
        keyExtractor={(r) => r.id}
        variant="cards"
        selectedIds={new Set(['c1'])}
        onSelectRow={handleSelectRow}
        onRowClick={handleRowClick}
      />,
    );

    expect(screen.getByText('Gulshan Grace')).toBeDefined();
    expect(screen.getByText('Banani Heights')).toBeDefined();
    expect(screen.getByText('BDT 2,50,00,000')).toBeDefined();

    // Verify touch targets and row clicks
    const card = screen.getByText('Gulshan Grace').closest('[role="button"]');
    expect(card).toBeDefined();
    if (card) fireEvent.click(card);
    expect(handleRowClick).toHaveBeenCalledWith(data[0]);

    // Verify checkbox click
    const checkbox = screen.getByLabelText('Select row c1');
    expect(checkbox).toBeDefined();
    fireEvent.click(checkbox);
    expect(handleSelectRow).toHaveBeenCalledWith('c1');
  });

  it('renders BottomNav with mobile destinations and triggers callbacks', () => {
    const handleNavigate = vi.fn();
    const handleOpenMenu = vi.fn();

    render(
      <BottomNav
        currentRouteId="properties"
        onNavigate={handleNavigate}
        onOpenMenu={handleOpenMenu}
      />,
    );

    const propertiesBtn = screen.getByLabelText('Properties');
    const bookingsBtn = screen.getByLabelText('Bookings');
    const menuBtn = screen.getByLabelText('Open full menu');

    expect(propertiesBtn).toBeDefined();
    expect(propertiesBtn.getAttribute('aria-current')).toBe('page');

    fireEvent.click(bookingsBtn);
    expect(handleNavigate).toHaveBeenCalledWith('bookings');

    fireEvent.click(menuBtn);
    expect(handleOpenMenu).toHaveBeenCalled();
  });

  it('renders responsive DataTableSkeleton with variant="cards"', () => {
    render(<DataTableSkeleton rows={4} variant="cards" />);
    const cardSkeletons = screen.getByLabelText('Loading records');
    expect(cardSkeletons).toBeDefined();
    expect(cardSkeletons.children.length).toBe(4);
  });

  it('provides useIsMobile hook returning boolean viewport indicator', () => {
    function HookTester() {
      const isMobile = useIsMobile(768);
      return <div data-testid="is-mobile">{String(isMobile)}</div>;
    }
    render(<HookTester />);
    expect(screen.getByTestId('is-mobile')).toBeDefined();
  });
});
