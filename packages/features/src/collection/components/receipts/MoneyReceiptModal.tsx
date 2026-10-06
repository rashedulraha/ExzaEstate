import { useRef } from 'react';
import { formatMoney, formatDate, amountToWords } from '@exzaestate/shared';
import { Dialog, Button } from '@exzaestate/ui';
import { Printer, Download, QrCode } from 'lucide-react';
import type { PaymentItem } from '../../schemas/collection.schema.js';

export interface MoneyReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentItem | null;
  onReprint?: () => void;
  onDownloadPdf?: () => void;
}

function ReceiptWatermark({ isVoid }: { isVoid: boolean }) {
  if (isVoid) {
    return (
      <div
        data-testid="void-watermark"
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
      >
        <span className="text-danger/25 border-8 border-danger/30 rounded-card font-black tracking-widest text-[56px] -rotate-12 px-12 py-4 uppercase">
          REVERSED / VOID
        </span>
      </div>
    );
  }
  return (
    <div
      data-testid="authenticated-watermark"
      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
    >
      <span className="text-text-muted/10 font-bold tracking-widest text-[36px] -rotate-12 text-center uppercase leading-tight">
        EXZA AUTHENTICATED
        <br />
        IMMUTABLE RECORD
      </span>
    </div>
  );
}

function ReceiptHeader({
  receiptNumber,
  paymentDate,
}: {
  receiptNumber?: string;
  paymentDate: string;
}) {
  return (
    <div className="flex items-start justify-between border-b-2 border-border pb-4">
      <div>
        <h1 className="text-h1 font-bold tracking-tight text-text">EXZAESTATE PROPERTIES LTD.</h1>
        <p className="text-caption text-text-muted mt-0.5">
          Plot 42, Road 11, Block C, Banani, Dhaka-1213, Bangladesh
        </p>
        <p className="text-caption text-text-muted">
          Tel: +880 2 9876543 · accounts@exzaestate.com
        </p>
      </div>

      <div className="text-right flex flex-col items-end">
        <div className="bg-primary text-text-inverse px-3 py-1 text-small font-bold uppercase tracking-wider rounded-button">
          MONEY RECEIPT
        </div>
        <div className="mt-2 text-right">
          <span className="text-caption font-mono font-bold text-text block">
            VOUCHER: {receiptNumber ? receiptNumber : 'DRAFT VOUCHER'}
          </span>
          <span className="text-caption text-text-muted">Date: {formatDate(paymentDate)}</span>
        </div>
      </div>
    </div>
  );
}

function ReceiptDetailsGrid({ payment }: { payment: PaymentItem }) {
  return (
    <div className="grid grid-cols-3 gap-6 py-2 border-b border-border text-small">
      <div className="space-y-1">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Received From:
        </span>
        <p className="font-bold text-text text-h4">{payment.customerName}</p>
        <p className="text-text-muted text-caption">Customer ID: {payment.customerId || '—'}</p>
      </div>

      <div className="space-y-1">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Property / Booking:
        </span>
        <p className="font-semibold text-text">
          {payment.bookingCode ? payment.bookingCode : 'General Collection'}
        </p>
        {payment.propertyCode && (
          <p className="text-text-muted text-caption">Property: {payment.propertyCode}</p>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          Payment Method:
        </span>
        <p className="font-semibold text-text">{payment.paymentMethod.replace(/_/g, ' ')}</p>
        {payment.chequeNumber && (
          <p className="text-text-muted text-caption">
            Cheque #{payment.chequeNumber} ({payment.chequeBank})
          </p>
        )}
        {payment.mobileTrxId && (
          <p className="text-text-muted text-caption">TrxID: {payment.mobileTrxId}</p>
        )}
      </div>
    </div>
  );
}

function ReceiptDuesStrip({
  previousDuePaisa,
  currentDuePaisa,
  amountPaisa,
}: {
  previousDuePaisa?: string;
  currentDuePaisa?: string;
  amountPaisa: string;
}) {
  if (!previousDuePaisa && !currentDuePaisa) return null;
  return (
    <div className="grid grid-cols-3 gap-4 p-3 bg-surface-sunken/70 border border-border rounded-card text-small">
      <div>
        <span className="text-caption text-text-muted block">Previous Due:</span>
        <span className="font-semibold tabular-nums text-text">
          {formatMoney(previousDuePaisa || '0')}
        </span>
      </div>
      <div>
        <span className="text-caption text-text-muted block">Current Payment:</span>
        <span className="font-semibold tabular-nums text-success">-{formatMoney(amountPaisa)}</span>
      </div>
      <div>
        <span className="text-caption text-text-muted block">Remaining Due:</span>
        <span className="font-bold tabular-nums text-text">
          {formatMoney(currentDuePaisa || '0')}
        </span>
      </div>
    </div>
  );
}

function ReceiptSignatoryBlock({ verificationUrl }: { verificationUrl: string }) {
  return (
    <div className="pt-8 border-t border-border">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div
            data-testid="verification-qr"
            className="w-16 h-16 border border-border rounded-button p-1 bg-surface flex items-center justify-center text-text shadow-sm"
            title={`Verification URL: ${verificationUrl}`}
          >
            <QrCode className="w-14 h-14" />
          </div>
          <div className="text-caption text-text-muted space-y-0.5 max-w-[200px]">
            <p className="font-semibold text-text">SCAN TO VERIFY</p>
            <p className="text-caption leading-tight">
              Tamper-proof digital receipt verified on ExzaEstate network.
            </p>
          </div>
        </div>

        <div
          data-testid="signatory-block"
          className="grid grid-cols-3 gap-6 text-center text-caption"
        >
          <div className="w-32 border-t border-text-muted pt-1.5">
            <p className="font-semibold text-text">Prepared By</p>
            <p className="text-caption text-text-muted">Executive</p>
          </div>
          <div className="w-32 border-t border-text-muted pt-1.5">
            <p className="font-semibold text-text">Verified By</p>
            <p className="text-caption text-text-muted">Accounts</p>
          </div>
          <div className="w-36 border-t border-text-muted pt-1.5">
            <p className="font-bold text-text">Authorized Signatory</p>
            <p className="text-caption text-text-muted">MD / Director</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MoneyReceiptModal({
  isOpen,
  onClose,
  payment,
  onReprint,
  onDownloadPdf,
}: MoneyReceiptModalProps) {
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!payment) return null;

  const isVoid = payment.status === 'REVERSED' || payment.status === 'CANCELLED';
  const amountWords = amountToWords(BigInt(payment.amountPaisa || '0'), 'en');
  const verificationUrl = `https://exzaestate.com/verify?voucher=${payment.receiptNumber || payment.id}`;

  const handlePrint = () => {
    if (onReprint) onReprint();
    window.print();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Money Receipt Voucher"
      description={`Receipt #${payment.receiptNumber || 'DRAFT'}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-caption text-text-muted">
            Institutional Standard A4 Layout (design.md §12)
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {onDownloadPdf && (
              <Button variant="secondary" onClick={onDownloadPdf} className="gap-1.5">
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handlePrint}
              className="gap-1.5"
              data-testid="print-receipt-btn"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </Button>
          </div>
        </div>
      }
    >
      <div
        ref={printContainerRef}
        data-testid="money-receipt-voucher"
        className="relative bg-surface text-text border border-border p-8 rounded-card shadow-sm font-sans select-none overflow-hidden"
      >
        <ReceiptWatermark isVoid={isVoid} />

        <div className="relative z-1 space-y-6">
          <ReceiptHeader receiptNumber={payment.receiptNumber} paymentDate={payment.paymentDate} />

          <ReceiptDetailsGrid payment={payment} />

          {/* Amount In Words & Figures */}
          <div className="p-4 bg-surface-sunken border border-border rounded-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-small font-semibold text-text">Amount Received:</span>
              <span className="text-h1 font-extrabold text-text tabular-nums">
                {formatMoney(payment.amountPaisa)}
              </span>
            </div>
            <div className="text-small text-text">
              <span className="font-semibold">In Words: </span>
              <span className="italic">{amountWords}</span>
            </div>
          </div>

          <ReceiptDuesStrip
            previousDuePaisa={payment.previousDuePaisa}
            currentDuePaisa={payment.currentDuePaisa}
            amountPaisa={payment.amountPaisa}
          />

          <ReceiptSignatoryBlock verificationUrl={verificationUrl} />
        </div>
      </div>
    </Dialog>
  );
}
