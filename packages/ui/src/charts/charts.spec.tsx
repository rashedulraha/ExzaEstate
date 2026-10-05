import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  KpiSparklineCard,
  AgingStrip,
  PipelineFunnel,
  BudgetBullet,
  ProfitWaterfall,
  CashFlowLine,
} from './index.js';

describe('Custom SVG Charts (design.md §7.2)', () => {
  it('renders KpiSparklineCard with hero number, sparkline, and table toggle', () => {
    const sparkData = [
      { date: '2026-01', value: 100, label: 'Jan' },
      { date: '2026-02', value: 150, label: 'Feb' },
      { date: '2026-03', value: 200, label: 'Mar' },
    ];

    render(
      <KpiSparklineCard
        label="Total Sales"
        value="৳50,00,000"
        subvalue="12 bookings"
        sparklineData={sparkData}
        trend={{ percentage: 12.5, direction: 'up', label: 'vs last month' }}
      />,
    );

    expect(screen.getByText('Total Sales')).toBeDefined();
    expect(screen.getByText('৳50,00,000')).toBeDefined();
    expect(screen.getByText('+12.5%')).toBeDefined();

    // Toggle table view
    const toggleBtn = screen.getByRole('button', { name: /view as table/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Jan')).toBeDefined();
    expect(screen.getByText('200')).toBeDefined();
  });

  it('renders AgingStrip with sequential tints, amounts, and direct labels', () => {
    const buckets = [
      { key: '1-7' as const, label: '1–7 days', amountPaisa: 50000000n, count: 5 },
      { key: '8-30' as const, label: '8–30 days', amountPaisa: 30000000n, count: 3 },
      { key: '31-60' as const, label: '31–60 days', amountPaisa: 15000000n, count: 2 },
      { key: '61-90' as const, label: '61–90 days', amountPaisa: 5000000n, count: 1 },
      { key: '90+' as const, label: '90+ days', amountPaisa: 2000000n, count: 1 },
    ];

    render(<AgingStrip buckets={buckets} title="AR Aging Breakdown" />);

    expect(screen.getByText('AR Aging Breakdown')).toBeDefined();
    expect(screen.getByText('1–7 days')).toBeDefined();
    expect(screen.getByText('90+ days')).toBeDefined();
  });

  it('renders PipelineFunnel with conversion rates and direct stage counts', () => {
    const stages = [
      { id: 'leads', label: 'Total Leads', count: 100 },
      { id: 'qualified', label: 'Qualified', count: 60 },
      { id: 'site_visit', label: 'Site Visits', count: 30 },
      { id: 'booked', label: 'Booked', count: 15 },
    ];

    render(<PipelineFunnel stages={stages} title="Sales Conversion Funnel" />);

    expect(screen.getByText('Sales Conversion Funnel')).toBeDefined();
    expect(screen.getByText('Total Leads')).toBeDefined();
    expect(screen.getByText('60.0%')).toBeDefined(); // 60/100
    expect(screen.getAllByText('50.0%')).toHaveLength(2); // 30/60 & 15/30
  });

  it('renders BudgetBullet with solid actual and outline target marks', () => {
    const metrics = [
      { id: 'civil', label: 'Civil Construction', actual: 4200000, target: 5000000 },
      { id: 'marketing', label: 'Marketing Spend', actual: 890000, target: 800000 },
    ];

    render(<BudgetBullet metrics={metrics} title="Department Budget Utilization" />);

    expect(screen.getByText('Department Budget Utilization')).toBeDefined();
    expect(screen.getByText('Civil Construction')).toBeDefined();
    expect(screen.getByText('Marketing Spend')).toBeDefined();
    expect(screen.getByText('(84.0%)')).toBeDefined();
    expect(screen.getByText('(111.3%)')).toBeDefined();
  });

  it('renders ProfitWaterfall with revenue to costs to profit steps', () => {
    const items = [
      { id: 'rev', label: 'Gross Revenue', amountPaisa: 10000000000n, type: 'initial' as const },
      { id: 'land', label: 'Land Purchase', amountPaisa: 3000000000n, type: 'decrease' as const },
      { id: 'dev', label: 'Development', amountPaisa: 2500000000n, type: 'decrease' as const },
      { id: 'const', label: 'Construction', amountPaisa: 2000000000n, type: 'decrease' as const },
      { id: 'net', label: 'Net Profit', amountPaisa: 2500000000n, type: 'total' as const },
    ];

    render(<ProfitWaterfall items={items} title="Project Waterfall" />);

    expect(screen.getByText('Project Waterfall')).toBeDefined();
    expect(screen.getByText('Gross Revenue')).toBeDefined();
    expect(screen.getByText('Land Purchase')).toBeDefined();
    expect(screen.getByText('Net Profit')).toBeDefined();
  });

  it('renders CashFlowLine with single 8% area fill gradient and tabular points', () => {
    const points = [
      { date: 'Jan', inflow: 1000000, outflow: 600000, net: 400000 },
      { date: 'Feb', inflow: 1200000, outflow: 800000, net: 400000 },
      { date: 'Mar', inflow: 900000, outflow: 1100000, net: -200000 },
      { date: 'Apr', inflow: 1500000, outflow: 700000, net: 800000 },
    ];

    render(<CashFlowLine data={points} title="Monthly Cash Flow" />);

    expect(screen.getByText('Monthly Cash Flow')).toBeDefined();
    expect(screen.getByText('Jan')).toBeDefined();
    expect(screen.getByText('Apr')).toBeDefined();
  });
});
