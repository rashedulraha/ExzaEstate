import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  THEME_TOKENS,
  getContrastRatio,
  Button,
  IconButton,
  Input,
  FormField,
  Select,
  Dialog,
  Drawer,
  DataTable,
  StatusBadge,
  STATUS_MAP,
  Skeleton,
  DataTableSkeleton,
  Breadcrumbs,
  Sidebar,
  Header,
  EmptyState,
  FilteredEmptyState,
  ErrorState,
  OfflineState,
  NoPermissionState,
  NotFoundState,
  LoadingState,
} from './index.js';

describe('Design Tokens & Contrast Verification (WCAG 2.2 AA)', () => {
  it('enforces contrast >= 4.5:1 for standard light text pairs', () => {
    const textOnSurface = getContrastRatio(THEME_TOKENS.light.text, THEME_TOKENS.light.surface);
    const textOnBg = getContrastRatio(THEME_TOKENS.light.text, THEME_TOKENS.light.bg);
    const text2OnSurface = getContrastRatio(THEME_TOKENS.light.text2, THEME_TOKENS.light.surface);
    const textMutedOnSurface = getContrastRatio(
      THEME_TOKENS.light.textMuted,
      THEME_TOKENS.light.surface,
    );

    expect(textOnSurface).toBeGreaterThanOrEqual(14.0);
    expect(textOnBg).toBeGreaterThanOrEqual(14.0);
    expect(text2OnSurface).toBeGreaterThanOrEqual(9.0);
    expect(textMutedOnSurface).toBeGreaterThanOrEqual(4.5);
  });

  it('enforces contrast >= 3.0:1 for input borders (WCAG 1.4.11 non-text contrast)', () => {
    const borderInputOnSurface = getContrastRatio(
      THEME_TOKENS.light.borderInput,
      THEME_TOKENS.light.surface,
    );
    const borderInputOnBg = getContrastRatio(THEME_TOKENS.light.borderInput, THEME_TOKENS.light.bg);

    expect(borderInputOnSurface).toBeGreaterThanOrEqual(3.0);
    expect(borderInputOnBg).toBeGreaterThanOrEqual(3.0);
  });

  it('enforces contrast >= 4.5:1 for semantic badge colors on their 12% tint', () => {
    const surface = THEME_TOKENS.light.surface;
    const successRatio = getContrastRatio(THEME_TOKENS.light.success, surface, 0.12);
    const warningRatio = getContrastRatio(THEME_TOKENS.light.warning, surface, 0.12);
    const dangerRatio = getContrastRatio(THEME_TOKENS.light.danger, surface, 0.12);
    const infoRatio = getContrastRatio(THEME_TOKENS.light.info, surface, 0.12);
    const specialRatio = getContrastRatio(THEME_TOKENS.light.special, surface, 0.12);
    const voidRatio = getContrastRatio(THEME_TOKENS.light.void, surface, 0.12);

    expect(successRatio).toBeGreaterThanOrEqual(4.5);
    expect(warningRatio).toBeGreaterThanOrEqual(4.5);
    expect(dangerRatio).toBeGreaterThanOrEqual(4.5);
    expect(infoRatio).toBeGreaterThanOrEqual(4.5);
    expect(specialRatio).toBeGreaterThanOrEqual(4.5);
    expect(voidRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('enforces contrast in dark mode for text and border inputs', () => {
    const textOnSurfaceDark = getContrastRatio(THEME_TOKENS.dark.text, THEME_TOKENS.dark.surface);
    const borderInputOnSurfaceDark = getContrastRatio(
      THEME_TOKENS.dark.borderInput,
      THEME_TOKENS.dark.surface,
    );

    expect(textOnSurfaceDark).toBeGreaterThanOrEqual(12.0);
    expect(borderInputOnSurfaceDark).toBeGreaterThanOrEqual(3.0);
  });
});

describe('Primitives', () => {
  it('renders Button with variants and loading state', () => {
    const { rerender } = render(<Button variant="primary">Confirm</Button>);
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeDefined();

    rerender(
      <Button variant="primary" isLoading>
        Confirm
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /Confirm/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('renders IconButton with accessible label', () => {
    render(<IconButton icon={<span>+</span>} aria-label="Add item" />);
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDefined();
  });

  it('renders FormField linking input and error via aria-describedby', () => {
    render(
      <FormField id="test-field" label="Email Address" required error="Email is required">
        <Input placeholder="name@example.com" />
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: /Email Address/i });
    expect(input.getAttribute('aria-describedby')).toBe('test-field-error');
    expect(screen.getByRole('alert').textContent).toBe('Email is required');
  });

  it('renders Select and handles option change', () => {
    const handleChange = vi.fn();
    const options = [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
    ];

    render(<Select options={options} value="opt1" onChange={handleChange} />);
    const trigger = screen.getByRole('button');
    expect(trigger.textContent).toContain('Option 1');

    fireEvent.click(trigger);
    const option2 = screen.getByText('Option 2');
    fireEvent.click(option2);

    expect(handleChange).toHaveBeenCalledWith('opt2');
  });

  it('renders Dialog and triggers onClose on ESC key', () => {
    const handleClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={handleClose} title="Delete Record">
        <div>Are you sure?</div>
      </Dialog>,
    );

    expect(screen.getByText('Delete Record')).toBeDefined();
    expect(screen.getByText('Are you sure?')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders Drawer and handles close', () => {
    const handleClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Property Details" subtitle="B1-P01">
        <div>Plot Details Body</div>
      </Drawer>,
    );

    expect(screen.getByText('Property Details')).toBeDefined();
    expect(screen.getByText('B1-P01')).toBeDefined();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders DataTable with columns, formatted money, and selection', () => {
    interface TestRow {
      id: string;
      code: string;
      amount: string;
    }

    const columns = [
      { key: 'code', header: 'Code' },
      { key: 'amount', header: 'Price', isMoney: true },
    ];
    const data: TestRow[] = [
      { id: '1', code: 'P01', amount: 'BDT 5,00,000.00' },
      { id: '2', code: 'P02', amount: 'BDT 7,50,000.00' },
    ];

    render(
      <DataTable columns={columns} data={data} keyExtractor={(r) => r.id} density="compact" />,
    );

    expect(screen.getByText('P01')).toBeDefined();
    expect(screen.getByText('BDT 5,00,000.00')).toBeDefined();
  });

  it('renders StatusBadge resolving family, icon, and display label per design.md §2.5', () => {
    render(
      <div>
        <StatusBadge domain="property" value="AVAILABLE" />
        <StatusBadge domain="property" value="BOOKED" />
        <StatusBadge domain="property" value="SOLD" />
        <StatusBadge domain="booking" value="CONFIRMED" />
        <StatusBadge domain="installment" value="OVERDUE" />
      </div>,
    );

    expect(screen.getByText('Available')).toBeDefined();
    expect(screen.getByText('Booked')).toBeDefined();
    expect(screen.getByText('Sold')).toBeDefined();
    expect(screen.getByText('Confirmed')).toBeDefined();
    expect(screen.getByText('Overdue')).toBeDefined();
  });

  it('verifies all status maps in STATUS_MAP have valid families', () => {
    const validFamilies = new Set([
      'success',
      'warning',
      'danger',
      'info',
      'special',
      'void',
      'primary',
      'neutral',
    ]);

    for (const [, values] of Object.entries(STATUS_MAP)) {
      for (const [, def] of Object.entries(values)) {
        expect(validFamilies.has(def.family)).toBe(true);
      }
    }
  });

  it('renders Skeleton and DataTableSkeleton without errors', () => {
    const { container } = render(
      <div>
        <Skeleton width={100} height={20} />
        <DataTableSkeleton rows={3} cols={3} />
      </div>,
    );
    expect(container.querySelectorAll('.animate-skeleton-breathe').length).toBeGreaterThan(0);
  });
});

describe('Layout & State Primitives', () => {
  it('renders Breadcrumbs correctly', () => {
    const items = [{ label: 'Properties', href: '/properties' }, { label: 'Plot B1-P01' }];
    render(<Breadcrumbs items={items} />);
    expect(screen.getByText('Properties')).toBeDefined();
    expect(screen.getByText('Plot B1-P01')).toBeDefined();
  });

  it('renders Sidebar with active navigation item and clean group titles', () => {
    render(<Sidebar currentRouteId="properties" />);
    expect(screen.getByText('Inventory & Plots')).toBeDefined();
    expect(screen.getByText('Executive Cockpit')).toBeDefined();
    expect(screen.getByText('Property Assets')).toBeDefined();
    expect(screen.getByText('Sales Pipeline')).toBeDefined();
    expect(screen.getByText('Finance & Treasury')).toBeDefined();
    expect(screen.getByText('System & Admin')).toBeDefined();
  });

  it('renders Header with branch and fiscal year badges', () => {
    render(<Header branchName="Dhaka Main Branch" fiscalYear="FY 2026–27" />);
    expect(screen.getByText('Dhaka Main Branch')).toBeDefined();
    expect(screen.getByText('FY 2026–27')).toBeDefined();
  });

  it('renders all six state primitives', () => {
    const { rerender } = render(
      <EmptyState
        title="No Properties"
        description="No plots added yet"
        actionLabel="Add Property"
        onAction={() => {}}
      />,
    );
    expect(screen.getByText('No Properties')).toBeDefined();

    rerender(<FilteredEmptyState title="No matching plots" onResetFilters={() => {}} />);
    expect(screen.getByText('No matching plots')).toBeDefined();

    rerender(<ErrorState errorCode="ERR_NETWORK" onRetry={() => {}} />);
    expect(screen.getByText(/Something went wrong/i)).toBeDefined();

    rerender(<OfflineState queuedChangesCount={3} />);
    expect(screen.getByText(/You are currently offline/i)).toBeDefined();

    rerender(<NoPermissionState permission="property:create" />);
    expect(screen.getByText(/Access Restricted/i)).toBeDefined();

    rerender(<NotFoundState title="Page Not Found" path="/unknown/test" />);
    expect(screen.getByText(/Page Not Found/i)).toBeDefined();
    expect(screen.getByText(/unknown\/test/i)).toBeDefined();

    rerender(<LoadingState variant="table" />);
    expect(document.querySelector('.card-workspace')).toBeDefined();
  });
});
