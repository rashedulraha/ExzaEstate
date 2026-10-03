export interface BanglaPersonFixture {
  banglaName: string;
  englishName: string;
  email: string;
  phone: string;
  role: string;
}

export const BANGLA_STAFF_FIXTURES: BanglaPersonFixture[] = [
  {
    banglaName: 'আনোয়ার হোসেন',
    englishName: 'Anwar Hossain',
    email: 'md@exzaestate.com',
    phone: '+8801700000001',
    role: 'MANAGING_DIRECTOR',
  },
  {
    banglaName: 'মোহাম্মদ রফিক',
    englishName: 'Mohammad Rafiq',
    email: 'gm@exzaestate.com',
    phone: '+8801700000002',
    role: 'GENERAL_MANAGER',
  },
  {
    banglaName: 'ফারহানা হক',
    englishName: 'Farhana Haque',
    email: 'accountant@exzaestate.com',
    phone: '+8801700000003',
    role: 'ACCOUNTANT',
  },
  {
    banglaName: 'তানভীর আহমেদ',
    englishName: 'Tanveer Ahmed',
    email: 'executive@exzaestate.com',
    phone: '+8801700000004',
    role: 'EXECUTIVE',
  },
  {
    banglaName: 'নুসরাত জাহান',
    englishName: 'Nusrat Jahan',
    email: 'executive2@exzaestate.com',
    phone: '+8801700000005',
    role: 'EXECUTIVE',
  },
];

export interface BanglaCompanyFixture {
  banglaName: string;
  englishName: string;
  code: string;
  address: string;
  tradeLicenseNo: string;
}

export const BANGLA_COMPANY_FIXTURES: BanglaCompanyFixture[] = [
  {
    banglaName: 'রূপায়ণ রিয়েল এস্টেট লি.',
    englishName: 'Rupayan Real Estate Ltd.',
    code: 'RUPAYAN',
    address: 'প্লট-৭, ব্লক-ডি, গুলশান-২, ঢাকা-১২১২',
    tradeLicenseNo: 'TRAD/DNCC/012345/2026',
  },
  {
    banglaName: 'পূর্বাচল গ্রিন সিটি লিমিটেড',
    englishName: 'Purbachal Green City Ltd.',
    code: 'PURBA',
    address: 'সেক্টর-৩, পূর্বাচল নতুন শহর, ঢাকা',
    tradeLicenseNo: 'TRAD/RAJUK/987654/2026',
  },
];

export function buildCompanyDto(
  overrides: Partial<
    import('../../src/platform/tenant-provisioning/provisioning-step.interface.js').ProvisionCompanyDto
  > = {},
): import('../../src/platform/tenant-provisioning/provisioning-step.interface.js').ProvisionCompanyDto {
  const fixture = BANGLA_COMPANY_FIXTURES[0]!;
  const uniqueCode = `${fixture.code}_${Date.now().toString().slice(-4)}`;

  return {
    name: fixture.englishName,
    code: uniqueCode,
    timezone: 'Asia/Dhaka',
    branchName: 'প্রধান কার্যালয় (গুলশান)',
    branchCode: 'HO',
    managingDirector: {
      email: `md-${uniqueCode.toLowerCase()}@exzaestate.test`,
      fullName: fixture.banglaName,
      phone: '+8801700000001',
      password: 'ExzaEstate@2026!',
      isLocalMode: true,
    },
    ...overrides,
  };
}
