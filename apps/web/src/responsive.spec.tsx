import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell, DataTable, BottomNav } from '@exzaestate/ui';

// Enable React 19 act environment in happy-dom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderIntoDom(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('Task C2 — Web Responsive Layouts & Mobile Views (design.md §9)', () => {
  it('renders mobile card views for DataTable with full data and actions', () => {
    interface PropertyRow {
      id: string;
      code: string;
      project: string;
      price: string;
      status: string;
    }

    const columns = [
      { key: 'code', header: 'Unit Code' },
      { key: 'project', header: 'Development Project' },
      { key: 'price', header: 'Valuation', isMoney: true },
      { key: 'status', header: 'Status' },
    ];

    const data: PropertyRow[] = [
      {
        id: 'prop-1',
        code: 'BL-101',
        project: 'Banani Lakefront',
        price: 'BDT 4,50,00,000',
        status: 'Available',
      },
      {
        id: 'prop-2',
        code: 'GL-202',
        project: 'Gulshan Luminance',
        price: 'BDT 6,20,00,000',
        status: 'Booked',
      },
    ];

    const onRowClick = vi.fn();
    const onSelectRow = vi.fn();

    const { container, unmount } = renderIntoDom(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(r) => r.id}
        variant="cards"
        selectedIds={new Set(['prop-1'])}
        onRowClick={onRowClick}
        onSelectRow={onSelectRow}
      />,
    );

    // Verify card content rendered
    expect(container.textContent).toContain('BL-101');
    expect(container.textContent).toContain('Banani Lakefront');
    expect(container.textContent).toContain('BDT 4,50,00,000');
    expect(container.textContent).toContain('GL-202');

    // Verify selection checkbox on card
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    expect(checkbox).not.toBeNull();
    expect(checkbox?.checked).toBe(true);

    if (checkbox) {
      act(() => {
        checkbox.click();
      });
      expect(onSelectRow).toHaveBeenCalledWith('prop-1');
    }

    // Verify card element click
    const card = container.querySelector('[role="button"]') as HTMLElement | null;
    expect(card).not.toBeNull();
    if (card) {
      act(() => {
        card.click();
      });
      expect(onRowClick).toHaveBeenCalledWith(data[0]);
    }

    unmount();
  });

  it('renders AppShell with BottomNav on mobile viewports', () => {
    const onNavigateRoute = vi.fn();

    const { container, unmount } = renderIntoDom(
      <AppShell
        companyName="Exza Development Ltd."
        currentRouteId="properties"
        showBottomNav={true}
        onNavigateRoute={onNavigateRoute}
      >
        <div data-testid="workspace-content">
          <h1>Property Inventory Overview</h1>
          <p>Responsive mobile test workspace</p>
        </div>
      </AppShell>,
    );

    expect(container.textContent).toContain('Property Inventory Overview');
    const nav = container.querySelector('nav[aria-label="Mobile Bottom Navigation"]');
    expect(nav).not.toBeNull();

    // Bottom navigation has properties active
    const buttons = container.querySelectorAll('nav button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);

    // Find and click CRM navigation button
    const crmBtn = Array.from(buttons).find((b) => b.getAttribute('aria-label') === 'CRM') as
      | HTMLButtonElement
      | undefined;
    expect(crmBtn).toBeDefined();

    if (crmBtn) {
      act(() => {
        crmBtn.click();
      });
      expect(onNavigateRoute).toHaveBeenCalledWith('leads');
    }

    unmount();
  });

  it('verifies touch target accessibility compliance (>= 44px) on mobile interactive elements', () => {
    const { container, unmount } = renderIntoDom(
      <BottomNav currentRouteId="properties" onOpenMenu={() => {}} />,
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);

    for (const btn of Array.from(buttons)) {
      // Must contain touch-target class ensuring min-height 44px
      expect(btn.className).toContain('touch-target');
    }

    unmount();
  });
});
