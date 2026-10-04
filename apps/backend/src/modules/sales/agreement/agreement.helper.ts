import { ConflictException } from '@nestjs/common';
import { BOOKING_STATUSES, ERROR_CODES, formatMoney } from '@exzaestate/shared';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { AgreementPdfData } from './pdf/agreement-pdf.template.js';

export interface TemplateContext {
  agreementNumber: string;
  bookingNumber: string;
  customerName: string;
  customerPhone?: string;
  propertyCode: string;
  propertyTitle: string;
  projectName: string;
  netPricePaisa: bigint;
  bookingDate: Date;
  terms?: string | null;
}

export const DEFAULT_AGREEMENT_TEMPLATE_BODY = `
ARTICLE 1: PARTIES & ALLOTMENT
This Deed of Agreement for Allotment & Sale is executed between the First Party (Developer/Company) and the Second Party (Allottee/Purchaser) {{customer_name}}, regarding the allotment of {{property_title}} (Code: {{propertyCode}}), situated in project {{project_name}}.

ARTICLE 2: CONSIDERATION & PAYMENT TERMS
The total agreed consideration for the scheduled property is {{net_price}}. The Allottee covenants to pay the installments strictly according to the agreed payment schedule for Booking Ref: {{bookingNumber}}.

ARTICLE 3: POSSESSION & CONVEYANCE
Upon receipt of the full payment and adherence to all building and project covenants, the Developer shall execute the formal Deed of Sale / Conveyance and deliver physical possession of the property.

ARTICLE 4: SPECIAL COVENANTS
{{terms}}
`.trim();

export function renderAgreementContent(templateBody: string, context: TemplateContext): string {
  const formattedPrice = formatMoney(context.netPricePaisa);
  const formattedDate = context.bookingDate.toLocaleDateString('en-GB');

  return templateBody
    .replace(/\{\{agreement_number\}\}/g, context.agreementNumber)
    .replace(/\{\{booking_number\}\}/g, context.bookingNumber)
    .replace(/\{\{customer_name\}\}/g, context.customerName)
    .replace(/\{\{customer_phone\}\}/g, context.customerPhone ?? 'N/A')
    .replace(/\{\{property_code\}\}/g, context.propertyCode)
    .replace(/\{\{propertyCode\}\}/g, context.propertyCode)
    .replace(/\{\{property_title\}\}/g, context.propertyTitle)
    .replace(/\{\{project_name\}\}/g, context.projectName)
    .replace(/\{\{net_price\}\}/g, formattedPrice)
    .replace(/\{\{booking_date\}\}/g, formattedDate)
    .replace(
      /\{\{terms\}\}/g,
      context.terms ?? 'Standard institutional terms and conditions apply.',
    );
}

export function assertAgreementModifiable(status: string): void {
  if (status === 'Signed & Locked') {
    throw new ConflictException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: 'Locked agreements cannot be edited. Create a new version instead.',
    });
  }
  if (status === 'Superseded') {
    throw new ConflictException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: 'Superseded agreements are immutable historical versions.',
    });
  }
}

export function assertCanGenerateAgreement(status: string): void {
  if (
    status !== BOOKING_STATUSES.CONFIRMED &&
    status !== BOOKING_STATUSES.AGREEMENT_PENDING &&
    status !== BOOKING_STATUSES.AGREEMENT_COMPLETED
  ) {
    throw new ConflictException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: `Agreements can only be generated for confirmed bookings (current: ${status})`,
    });
  }
}

export async function resolveAgreementTemplateBody(
  tx: TenantPrisma,
  companyId: string,
  templateId?: string | null,
): Promise<{ templateBody: string; templateId: string | null }> {
  if (templateId) {
    const tmpl = await tx.agreementTemplate.findFirst({
      where: { id: templateId, companyId, isActive: true },
    });
    if (tmpl) {
      return { templateBody: tmpl.templateBody, templateId: tmpl.id };
    }
  }

  const defaultTmpl = await tx.agreementTemplate.findFirst({
    where: { companyId, isDefault: true, isActive: true },
  });
  if (defaultTmpl) {
    return { templateBody: defaultTmpl.templateBody, templateId: defaultTmpl.id };
  }

  return { templateBody: DEFAULT_AGREEMENT_TEMPLATE_BODY, templateId: null };
}

export interface PdfEntityContext {
  company: { name: string } | null;
  customer: { name: string; phone?: string | null } | null;
  property: { code: string; title: string | null } | null;
  agreement: {
    agreementNumber: string;
    version: number;
    status: string;
    title: string;
    content: string;
    terms?: string | null;
    signedAt?: Date | null;
    booking: {
      bookingNumber: string;
      netPricePaisa: bigint;
    };
  };
}

function resolveCustomerName(customer: { name: string } | null): string {
  if (customer && customer.name) return customer.name;
  return 'Valued Customer';
}

function resolvePropertyInfo(prop: { code: string; title: string | null } | null): {
  code: string;
  title: string;
} {
  if (prop) return { code: prop.code, title: prop.title ?? 'Property' };
  return { code: 'N/A', title: 'Property' };
}

export function buildAgreementPdfData(ctx: PdfEntityContext): AgreementPdfData {
  const companyName = ctx.company ? ctx.company.name : 'ExzaEstate Real Estate Ltd.';
  const customerName = resolveCustomerName(ctx.customer);
  const customerPhone = ctx.customer?.phone ?? undefined;
  const propInfo = resolvePropertyInfo(ctx.property);

  return {
    companyName,
    agreementNumber: ctx.agreement.agreementNumber,
    version: ctx.agreement.version,
    status: ctx.agreement.status,
    title: ctx.agreement.title,
    content: ctx.agreement.content,
    terms: ctx.agreement.terms,
    customerName,
    customerPhone,
    propertyCode: propInfo.code,
    propertyTitle: propInfo.title,
    netPricePaisa: ctx.agreement.booking.netPricePaisa,
    bookingNumber: ctx.agreement.booking.bookingNumber,
    signedAt: ctx.agreement.signedAt ? ctx.agreement.signedAt.toISOString() : undefined,
  };
}
