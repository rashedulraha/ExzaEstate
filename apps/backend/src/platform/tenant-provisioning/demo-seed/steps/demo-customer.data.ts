export interface DemoCustomerNomineeDef {
  name: string;
  relationship: string;
  phone?: string;
  nid: string;
  sharePercentage?: number;
  isPowerOfAttorney?: boolean;
  poaDocumentNumber?: string;
}

export interface DemoCustomerCoBuyerDef {
  name: string;
  relationship?: string;
  phone: string;
  nid: string;
  sharePercentage?: number;
}

export interface DemoCustomerContactDef {
  name: string;
  relationship?: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

export interface DemoCustomerAddressDef {
  type: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  division?: string;
  postalCode?: string;
  country?: string;
  isPrimary?: boolean;
}

export interface DemoCustomerDef {
  customerNumber: string;
  name: string;
  customerType: string;
  fatherOrSpouseName?: string;
  motherName?: string;
  dateOfBirth?: string;
  occupation?: string;
  nationality?: string;
  isNrb?: boolean;
  phone: string;
  email?: string;
  nid: string;
  passport?: string;
  tin?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  bankRoutingNumber?: string;
  assigneePrefix?: string;
  contacts?: DemoCustomerContactDef[];
  addresses?: DemoCustomerAddressDef[];
  nominees?: DemoCustomerNomineeDef[];
  coBuyers?: DemoCustomerCoBuyerDef[];
}

export const DEMO_CUSTOMERS: DemoCustomerDef[] = [
  {
    customerNumber: 'CUST-2026-000001',
    name: 'Engr. Farhan Ahmed',
    customerType: 'INDIVIDUAL',
    fatherOrSpouseName: 'Late Nurul Ahmed',
    motherName: 'Begum Rokeya Ahmed',
    dateOfBirth: '1985-06-15',
    occupation: 'Software Architect',
    nationality: 'Bangladeshi',
    isNrb: false,
    phone: '+8801712000001',
    email: 'farhan.ahmed@example.com',
    nid: '19852692019283741',
    tin: '482910482910',
    bankName: 'BRAC Bank PLC',
    bankBranch: 'Dhanmondi Branch',
    bankAccount: '1501204829100001',
    bankRoutingNumber: '060261234',
    assigneePrefix: 'executive',
    contacts: [
      {
        name: 'Tasnim Farhan',
        relationship: 'Spouse',
        phone: '+8801712000002',
        email: 'tasnim.farhan@example.com',
        isPrimary: true,
      },
    ],
    addresses: [
      {
        type: 'PRESENT',
        addressLine1: 'House 42, Road 9/A, Dhanmondi R/A',
        city: 'Dhaka',
        division: 'Dhaka',
        postalCode: '1209',
        isPrimary: true,
      },
      {
        type: 'PERMANENT',
        addressLine1: 'Village: Uttarpara, P.O: Shantinagar',
        city: 'Cumilla Sadar',
        division: 'Chattogram',
        postalCode: '3500',
        isPrimary: false,
      },
    ],
    nominees: [
      {
        name: 'Tasnim Farhan',
        relationship: 'WIFE',
        phone: '+8801712000002',
        nid: '19882692019283742',
        sharePercentage: 100,
        isPowerOfAttorney: false,
      },
    ],
  },
  {
    customerNumber: 'CUST-2026-000002',
    name: 'Dr. Nazia Sultana',
    customerType: 'INDIVIDUAL',
    fatherOrSpouseName: 'Dr. Tariqul Islam',
    motherName: 'Shamsun Nahar',
    dateOfBirth: '1990-03-22',
    occupation: 'Associate Professor & Physician',
    nationality: 'Bangladeshi',
    isNrb: false,
    phone: '+8801812000003',
    email: 'nazia.sultana@example.com',
    nid: '19902692019283743',
    tin: '782910482911',
    bankName: 'City Bank PLC',
    bankBranch: 'Gulshan Avenue Branch',
    bankAccount: '2201938472001',
    bankRoutingNumber: '085261456',
    assigneePrefix: 'executive',
    addresses: [
      {
        type: 'PRESENT',
        addressLine1: 'Apartment B-4, Plot 16, Block E, Banani',
        city: 'Dhaka',
        division: 'Dhaka',
        postalCode: '1213',
        isPrimary: true,
      },
    ],
    coBuyers: [
      {
        name: 'Dr. Tariqul Islam',
        relationship: 'Husband',
        phone: '+8801812000004',
        nid: '19872692019283744',
        sharePercentage: 50,
      },
    ],
    nominees: [
      {
        name: 'Aryan Islam',
        relationship: 'SON',
        phone: '+8801812000003',
        nid: '20152692019283745',
        sharePercentage: 100,
      },
    ],
  },
  {
    customerNumber: 'CUST-2026-000003',
    name: 'Mr. Mahbub Alam',
    customerType: 'INDIVIDUAL',
    fatherOrSpouseName: 'Abdul Majid Alam',
    motherName: 'Fatema Begum',
    dateOfBirth: '1978-11-09',
    occupation: 'Director of Operations (NRB - UK)',
    nationality: 'Bangladeshi',
    isNrb: true,
    phone: '+447911123456',
    email: 'mahbub.alam.uk@example.com',
    nid: '19782692019283746',
    passport: 'A08291048',
    tin: '992019283012',
    bankName: 'Standard Chartered Bank',
    bankBranch: 'Gulshan Branch',
    bankAccount: '019283746501',
    bankRoutingNumber: '215260123',
    assigneePrefix: 'executive',
    addresses: [
      {
        type: 'OVERSEAS',
        addressLine1: '14 Elm Road, Canary Wharf',
        city: 'London',
        postalCode: 'E14 9QZ',
        country: 'United Kingdom',
        isPrimary: true,
      },
      {
        type: 'PERMANENT',
        addressLine1: 'Road 55, Gulshan-2',
        city: 'Dhaka',
        division: 'Dhaka',
        postalCode: '1212',
        isPrimary: false,
      },
    ],
    nominees: [
      {
        name: 'Rafiqul Alam',
        relationship: 'BROTHER',
        phone: '+8801712000005',
        nid: '19822692019283747',
        sharePercentage: 100,
        isPowerOfAttorney: true,
        poaDocumentNumber: 'POA-UK-2026-0091',
      },
    ],
  },
  {
    customerNumber: 'CUST-2026-000004',
    name: 'Apex Horizon Properties Ltd',
    customerType: 'COMPANY',
    occupation: 'Corporate Entity',
    nationality: 'Bangladeshi',
    isNrb: false,
    phone: '+8801712000006',
    email: 'info@apexhorizon.com.bd',
    nid: '19990000000000001',
    tin: '123456789012',
    bankName: 'Eastern Bank PLC',
    bankBranch: 'Principal Branch, Motijheel',
    bankAccount: '1011234567890',
    bankRoutingNumber: '095261111',
    assigneePrefix: 'executive',
    contacts: [
      {
        name: 'Ashfaqur Rahman',
        relationship: 'Managing Director',
        phone: '+8801712000007',
        email: 'ashfaq@apexhorizon.com.bd',
        isPrimary: true,
      },
    ],
    addresses: [
      {
        type: 'OFFICE',
        addressLine1: 'Level 14, City Centre, 90/1 Motijheel C/A',
        city: 'Dhaka',
        division: 'Dhaka',
        postalCode: '1000',
        isPrimary: true,
      },
    ],
  },
];
