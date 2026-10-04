export interface BankSeedBranch {
  name: string;
  routingNumber: string;
  district?: string;
}

export interface BankSeedData {
  name: string;
  code: string;
  swiftCode: string;
  branches: BankSeedBranch[];
}

export const DEFAULT_BANKS: BankSeedData[] = [
  {
    name: 'Dutch-Bangla Bank PLC',
    code: 'DBBL',
    swiftCode: 'DBBLBDDH',
    branches: [
      { name: 'Gulshan Branch', routingNumber: '090261623', district: 'Dhaka' },
      { name: 'Motijheel Branch', routingNumber: '090262703', district: 'Dhaka' },
    ],
  },
  {
    name: 'BRAC Bank PLC',
    code: 'BRAC',
    swiftCode: 'BRAKBDDH',
    branches: [
      { name: 'Banani Branch', routingNumber: '060260438', district: 'Dhaka' },
      { name: 'Agrabad Branch', routingNumber: '060150341', district: 'Chittagong' },
    ],
  },
  {
    name: 'Eastern Bank PLC',
    code: 'EBL',
    swiftCode: 'EBLBBDDH',
    branches: [
      { name: 'Principal Branch', routingNumber: '095270114', district: 'Dhaka' },
      { name: 'Dhanmondi Branch', routingNumber: '095261053', district: 'Dhaka' },
    ],
  },
  {
    name: 'Islami Bank Bangladesh PLC',
    code: 'IBBL',
    swiftCode: 'IBBLBDDH',
    branches: [{ name: 'Dilkusha Branch', routingNumber: '125270389', district: 'Dhaka' }],
  },
  {
    name: 'Standard Chartered Bank',
    code: 'SCB',
    swiftCode: 'SCBLBDDX',
    branches: [{ name: 'City Centre Branch', routingNumber: '215261728', district: 'Dhaka' }],
  },
];
