import { formatMoney } from '@exzaestate/shared';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { SearchResultItem, UserSearchScopeContext } from '../search.types.js';

export async function searchPayments(
  db: TenantPrisma,
  companyId: string,
  query: string,
  _userCtx: UserSearchScopeContext,
  limit: number,
): Promise<SearchResultItem[]> {
  const payments = await db.payment.findMany({
    where: {
      companyId,
      OR: [
        { paymentNumber: { contains: query, mode: 'insensitive' } },
        { chequeNumber: { contains: query, mode: 'insensitive' } },
        { transactionReference: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { paymentDate: 'desc' },
  });

  return payments.map((p) => ({
    id: p.id,
    entityType: 'PAYMENT' as const,
    title: `Payment ${p.paymentNumber}`,
    subtitle: `Amount: ${formatMoney(p.amountPaisa)} | Method: ${p.paymentMethod} | Status: ${p.status}`,
    referenceNumber: p.paymentNumber,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function searchReceipts(
  db: TenantPrisma,
  companyId: string,
  query: string,
  _userCtx: UserSearchScopeContext,
  limit: number,
): Promise<SearchResultItem[]> {
  const receipts = await db.receipt.findMany({
    where: {
      companyId,
      receiptNumber: { contains: query, mode: 'insensitive' },
    },
    take: limit,
    orderBy: { issuedAt: 'desc' },
  });

  return receipts.map((r) => ({
    id: r.id,
    entityType: 'RECEIPT' as const,
    title: `Money Receipt ${r.receiptNumber}`,
    subtitle: `Amount: ${formatMoney(r.amountPaisa)} | Method: ${r.paymentMethod}`,
    referenceNumber: r.receiptNumber,
    status: r.isVoid ? 'VOID' : 'ACTIVE',
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function searchVouchers(
  db: TenantPrisma,
  companyId: string,
  query: string,
  _userCtx: UserSearchScopeContext,
  limit: number,
): Promise<SearchResultItem[]> {
  const vouchers = await db.expenseVoucher.findMany({
    where: {
      companyId,
      OR: [
        { voucherNumber: { contains: query, mode: 'insensitive' } },
        { payeeName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { expenseDate: 'desc' },
  });

  return vouchers.map((v) => ({
    id: v.id,
    entityType: 'VOUCHER' as const,
    title: `Voucher ${v.voucherNumber} (${v.payeeName})`,
    subtitle: `Amount: ${formatMoney(v.amountPaisa)} | Status: ${v.status}`,
    referenceNumber: v.voucherNumber,
    status: v.status,
    createdAt: v.expenseDate.toISOString(),
  }));
}

export async function searchVendors(
  db: TenantPrisma,
  companyId: string,
  query: string,
  _userCtx: UserSearchScopeContext,
  limit: number,
): Promise<SearchResultItem[]> {
  const vendors = await db.vendor.findMany({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        { vendorNumber: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return vendors.map((vn) => ({
    id: vn.id,
    entityType: 'VENDOR' as const,
    title: `Vendor: ${vn.name}`,
    subtitle: `Phone: ${vn.phone ?? 'N/A'} | Contact: ${vn.contactPerson ?? 'N/A'}`,
    referenceNumber: vn.vendorNumber,
    status: vn.isActive ? 'ACTIVE' : 'INACTIVE',
    createdAt: vn.createdAt.toISOString(),
  }));
}

export async function searchDocuments(
  db: TenantPrisma,
  companyId: string,
  query: string,
  _userCtx: UserSearchScopeContext,
  limit: number,
): Promise<SearchResultItem[]> {
  const documents = await db.document.findMany({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return documents.map((d) => ({
    id: d.id,
    entityType: 'DOCUMENT' as const,
    title: `Document: ${d.title}`,
    subtitle: `Category: ${d.category ?? 'General'} | Status: ${d.status}`,
    referenceNumber: d.id,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
  }));
}
