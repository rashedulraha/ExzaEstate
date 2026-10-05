import { useState, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Breadcrumbs, LoadingState, ErrorState } from '@exzaestate/ui';
import {
  useCustomerDetail,
  type CustomerDetailRecord,
  type CustomerTimelineItem,
} from '../hooks/useCustomerDetail.js';
import { useCustomerActions } from '../hooks/useCustomerActions.js';
import { CustomerKycModal } from '../components/CustomerKycModal.js';
import { CustomerCoBuyerModal } from '../components/CustomerCoBuyerModal.js';
import { CustomerNomineeModal } from '../components/CustomerNomineeModal.js';
import { CustomerTimelineView } from '../components/CustomerTimelineView.js';
import {
  CustomerProfileHeader,
  CustomerDetailsTab,
  CustomerCoBuyersTab,
  CustomerNomineesTab,
  CustomerDocumentsTab,
} from './CustomerDetailSections.js';

type TabType = 'details' | 'co-buyers' | 'nominees' | 'documents' | 'timeline';

const TABS: { id: TabType; label: string }[] = [
  { id: 'details', label: 'Details & KYC' },
  { id: 'co-buyers', label: 'Joint Buyers' },
  { id: 'nominees', label: 'Nominees' },
  { id: 'documents', label: 'Documents' },
  { id: 'timeline', label: 'Activity Timeline' },
];

function CustomerActiveTab({
  activeTab,
  customer,
  timeline,
  onOpenCoBuyer,
  onOpenNominee,
}: {
  activeTab: TabType;
  customer: CustomerDetailRecord;
  timeline: CustomerTimelineItem[];
  onOpenCoBuyer: () => void;
  onOpenNominee: () => void;
}): ReactElement {
  switch (activeTab) {
    case 'details':
      return <CustomerDetailsTab customer={customer} />;
    case 'co-buyers':
      return (
        <CustomerCoBuyersTab coBuyers={customer.coBuyers ?? []} onOpenAddModal={onOpenCoBuyer} />
      );
    case 'nominees':
      return (
        <CustomerNomineesTab nominees={customer.nominees ?? []} onOpenAddModal={onOpenNominee} />
      );
    case 'documents':
      return <CustomerDocumentsTab documents={customer.documents ?? []} />;
    case 'timeline':
      return <CustomerTimelineView timeline={timeline} />;
  }
}

export function CustomerDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = id ?? '';

  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);
  const [isCoBuyerModalOpen, setIsCoBuyerModalOpen] = useState<boolean>(false);
  const [isNomineeModalOpen, setIsNomineeModalOpen] = useState<boolean>(false);

  const { customer, timeline, isLoading, isError, error, refetch } = useCustomerDetail(customerId);

  const { verifyKyc, addCoBuyer, addNominee, isVerifyingKyc, isAddingCoBuyer, isAddingNominee } =
    useCustomerActions(customerId);

  if (isLoading) {
    return <LoadingState variant="table" />;
  }

  if (isError || !customer) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Customer not found'}
        onRetry={() => {
          if (!customer) navigate('/customers');
          else refetch();
        }}
      />
    );
  }

  return (
    <div className="container-page space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Overview', href: '/' },
          { label: 'Customers', href: '/customers' },
          { label: customer.fullName },
        ]}
      />

      <CustomerProfileHeader customer={customer} onOpenKycModal={() => setIsKycModalOpen(true)} />

      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-btn font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <CustomerActiveTab
        activeTab={activeTab}
        customer={customer}
        timeline={timeline}
        onOpenCoBuyer={() => setIsCoBuyerModalOpen(true)}
        onOpenNominee={() => setIsNomineeModalOpen(true)}
      />

      <CustomerKycModal
        customerName={customer.fullName}
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSubmit={async (data) => {
          await verifyKyc(customer.id, data);
        }}
        isLoading={isVerifyingKyc}
      />

      <CustomerCoBuyerModal
        isOpen={isCoBuyerModalOpen}
        onClose={() => setIsCoBuyerModalOpen(false)}
        onSubmit={async (data) => {
          await addCoBuyer(customer.id, data);
        }}
        isLoading={isAddingCoBuyer}
      />

      <CustomerNomineeModal
        isOpen={isNomineeModalOpen}
        onClose={() => setIsNomineeModalOpen(false)}
        onSubmit={async (data) => {
          await addNominee(customer.id, data);
        }}
        isLoading={isAddingNominee}
      />
    </div>
  );
}
