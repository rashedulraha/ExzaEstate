import type { ReactElement } from 'react';
import { Dialog, Button, StatusBadge } from '@exzaestate/ui';
import { formatMoney, formatDate } from '@exzaestate/shared';
import type { QuotationItem } from '../../schemas/quotation.schema.js';

interface QuotationPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationItem | null;
}

export function QuotationPdfPreviewModal({
  isOpen,
  onClose,
  quotation,
}: QuotationPdfPreviewModalProps): ReactElement {
  if (!quotation) return <></>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Quotation ${quotation.quotationNumber}`}
      description="Official commercial offer document"
      size="lg"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="secondary" onClick={handlePrint}>
            Print / Save PDF
          </Button>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="p-6 border border-border-subtle rounded-card bg-surface space-y-6 print:border-none print:p-0">
        <div className="flex justify-between items-start border-b border-border pb-4">
          <div>
            <div className="text-h2 font-bold text-text">EXZA ESTATE ERP</div>
            <div className="text-caption text-text-muted mt-0.5">Commercial Allotment Offer</div>
          </div>
          <div className="text-right">
            <div className="text-small font-semibold text-text">{quotation.quotationNumber}</div>
            <div className="text-caption text-text-muted mt-1">
              Issued: {formatDate(quotation.createdAt, 'Asia/Dhaka')}
            </div>
            <div className="text-caption text-danger font-medium mt-0.5">
              Valid until: {formatDate(quotation.validUntil, 'Asia/Dhaka')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-small bg-surface-sunken border border-border p-4 rounded-card">
          <div>
            <div className="text-caption text-text-muted uppercase">Client / Prospect</div>
            <div className="font-semibold text-text mt-1">
              {quotation.partyName ?? 'Prospective Buyer'}
            </div>
          </div>
          <div>
            <div className="text-caption text-text-muted uppercase">Property Unit</div>
            <div className="font-semibold text-text mt-1">
              {quotation.propertyCode ?? 'Selected Unit'}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-h5 font-semibold text-text-muted uppercase tracking-wider">
            Commercial Pricing Breakdown
          </h4>
          <table className="w-full text-small">
            <tbody>
              <tr className="border-b border-border-subtle py-2">
                <td className="py-1.5 text-text-2">Base Property Price</td>
                <td className="py-1.5 text-right font-medium">
                  {formatMoney(quotation.basePricePaisa)}
                </td>
              </tr>
              {quotation.premiumAmountPaisa !== '0' && (
                <tr className="border-b border-border-subtle py-2">
                  <td className="py-1.5 text-text-2">Location Premium (Corner / Road / View)</td>
                  <td className="py-1.5 text-right font-medium">
                    {formatMoney(quotation.premiumAmountPaisa)}
                  </td>
                </tr>
              )}
              {quotation.discountAmountPaisa !== '0' && (
                <tr className="border-b border-border-subtle py-2 text-accent">
                  <td className="py-1.5">Approved Commercial Discount</td>
                  <td className="py-1.5 text-right font-medium">
                    − {formatMoney(quotation.discountAmountPaisa)}
                  </td>
                </tr>
              )}
              <tr className="font-bold text-h3 border-t-2 border-border pt-3">
                <td className="py-2.5 text-text">Net Quotation Total</td>
                <td className="py-2.5 text-right text-primary">
                  {formatMoney(quotation.netPricePaisa)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center text-caption text-text-muted pt-4 border-t border-border">
          <span>
            Status: <StatusBadge domain="quotation" value={quotation.status} />
          </span>
          <span>Subject to ExzaEstate standard sales terms & conditions</span>
        </div>
      </div>
    </Dialog>
  );
}
