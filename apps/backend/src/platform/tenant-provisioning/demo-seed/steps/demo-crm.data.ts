export interface DemoLeadDef {
  leadNumber: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  status: string;
  lostReason?: string;
  interestNotes?: string;
  budgetPaisa?: bigint;
  preferredPropertyType?: string;
  assigneePrefix?: string;
  preferredProjectCode?: string;
}

export interface DemoFollowUpDef {
  leadNumber: string;
  type: string;
  status: string;
  priority: string;
  dueDate: string;
  dueTime?: string;
  notes?: string;
  outcome?: string;
}

export const DEMO_LEADS: DemoLeadDef[] = [
  {
    leadNumber: 'LEAD-2026-000001',
    name: 'Engr. Kabir Hossain',
    phone: '+8801711122233',
    email: 'kabir.hossain@example.com',
    source: 'Facebook',
    status: 'New',
    interestNotes: 'Looking for a 2000 sq ft flat facing South in Bashundhara.',
    budgetPaisa: 1500000000n,
    preferredPropertyType: 'Flat',
    assigneePrefix: 'executive',
    preferredProjectCode: 'PRJ-BRV-002',
  },
  {
    leadNumber: 'LEAD-2026-000002',
    name: 'Dr. Nazia Sultana',
    phone: '+8801811122234',
    email: 'nazia.sultana@example.com',
    source: 'Referral',
    status: 'Contacted',
    interestNotes: 'Inquired about 5 Katha plot in Purbachal Green City Block A.',
    budgetPaisa: 850000000n,
    preferredPropertyType: 'Plot',
    assigneePrefix: 'executive',
    preferredProjectCode: 'PRJ-PUR-001',
  },
  {
    leadNumber: 'LEAD-2026-000003',
    name: 'Mr. Mahbub Alam (NRB - UK)',
    phone: '+8801911122235',
    email: 'mahbub.alam.uk@example.com',
    source: 'WhatsApp',
    status: 'Interested',
    interestNotes: 'NRB investor seeking luxury duplex/penthouse with 2 car parking spaces.',
    budgetPaisa: 3200000000n,
    preferredPropertyType: 'Flat',
    assigneePrefix: 'executive',
    preferredProjectCode: 'PRJ-BRV-002',
  },
  {
    leadNumber: 'LEAD-2026-000004',
    name: 'Begum Rokeya Enterprise (Chairman: Anisur Rahman)',
    phone: '+8801611122236',
    email: 'anisur@rokeya-enterprise.com',
    source: 'Walk-in',
    status: 'Qualified',
    interestNotes: 'Commercial space / ground floor showroom requirement.',
    budgetPaisa: 4500000000n,
    preferredPropertyType: 'Shop',
    assigneePrefix: 'executive2',
    preferredProjectCode: 'PRJ-BRV-002',
  },
  {
    leadNumber: 'LEAD-2026-000005',
    name: 'Advocate Shahedul Islam',
    phone: '+8801511122237',
    email: 'shahedul.law@example.com',
    source: 'Google',
    status: 'Site Visit',
    interestNotes: 'Site visit scheduled for upcoming Saturday at Purbachal sector 17.',
    budgetPaisa: 1200000000n,
    preferredPropertyType: 'Plot',
    assigneePrefix: 'executive2',
    preferredProjectCode: 'PRJ-PUR-001',
  },
  {
    leadNumber: 'LEAD-2026-000006',
    name: 'Capt. Masud Rana',
    phone: '+8801711122238',
    email: 'capt.rana@example.com',
    source: 'Event',
    status: 'Negotiation',
    interestNotes: 'REHAB fair attendee. Negotiating payment plan and installment discount.',
    budgetPaisa: 2100000000n,
    preferredPropertyType: 'Flat',
    assigneePrefix: 'executive2',
    preferredProjectCode: 'PRJ-BRV-002',
  },
  {
    leadNumber: 'LEAD-2026-000007',
    name: 'Mrs. Taslima Akter',
    phone: '+8801811122239',
    email: 'taslima.akter@example.com',
    source: 'Website',
    status: 'Lost',
    lostReason:
      'Client decided to purchase a secondary property in Uttara due to immediate handover need.',
    interestNotes: 'Urgent handover requirement within 3 months.',
    budgetPaisa: 900000000n,
    preferredPropertyType: 'Flat',
    assigneePrefix: 'executive',
    preferredProjectCode: 'PRJ-BRV-002',
  },
  {
    leadNumber: 'LEAD-2026-000008',
    name: 'Rafiqul Islam Chowdhury',
    phone: '+8801911122240',
    email: 'rafiqul.chowdhury@example.com',
    source: 'Phone',
    status: 'New',
    interestNotes: 'Direct phone inquiry through hotline, needs general brochure.',
    budgetPaisa: 1000000000n,
    preferredPropertyType: 'Plot',
    preferredProjectCode: 'PRJ-PUR-001',
  },
];

export const DEMO_FOLLOW_UPS: DemoFollowUpDef[] = [
  {
    leadNumber: 'LEAD-2026-000001',
    type: 'CALL',
    status: 'PENDING',
    priority: 'HIGH',
    dueDate: '2026-10-10',
    notes: 'Initial phone call to explain project features and floor layouts.',
  },
  {
    leadNumber: 'LEAD-2026-000002',
    type: 'SITE_VISIT',
    status: 'PENDING',
    priority: 'URGENT',
    dueDate: '2026-10-12',
    dueTime: '11:00',
    notes: 'Plot visit at Purbachal Block A with client and family.',
  },
  {
    leadNumber: 'LEAD-2026-000003',
    type: 'WHATSAPP',
    status: 'PENDING',
    priority: 'HIGH',
    dueDate: '2026-09-25',
    notes: 'Send video walkthrough of duplex unit via WhatsApp.',
  },
  {
    leadNumber: 'LEAD-2026-000005',
    type: 'MEETING',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    dueDate: '2026-10-02',
    outcome: 'Client visited office, reviewed brochure and master layout plan.',
  },
];
