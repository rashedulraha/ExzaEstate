import type {
  ProjectCostBreakdownDto,
  ProjectProfitabilityItemDto,
} from '../../dto/profitability-response.dto.js';

export interface RawProjectJournalLine {
  accountCode: string;
  debitPaisa: bigint;
  creditPaisa: bigint;
}

export function aggregateProjectFinancials(
  projectId: string,
  projectCode: string,
  projectName: string,
  lines: RawProjectJournalLine[],
  estimatedBudgetPaisa?: bigint | null,
): ProjectProfitabilityItemDto {
  let totalRevenuePaisa = 0n;
  let landCostPaisa = 0n;
  let developmentCostPaisa = 0n;
  let marketingCostPaisa = 0n;
  let adminCostPaisa = 0n;
  let otherCostPaisa = 0n;

  for (const line of lines) {
    const code = line.accountCode;
    const netDebit = line.debitPaisa - line.creditPaisa;
    const netCredit = line.creditPaisa - line.debitPaisa;

    if (code.startsWith('4')) {
      // Revenue / Income accounts: Credit balance represents recognized revenue
      totalRevenuePaisa += netCredit;
    } else if (code === '1200' || code === '5100') {
      // Land inventory or cost of land sold
      landCostPaisa += netDebit;
    } else if (code === '1210' || code === '5200') {
      // Development WIP or development cost
      developmentCostPaisa += netDebit;
    } else if (code === '5300' || code === '5400') {
      // Marketing or commission expense
      marketingCostPaisa += netDebit;
    } else if (code === '5500' || code === '5600') {
      // Administrative / general expense
      adminCostPaisa += netDebit;
    } else if (code.startsWith('5')) {
      otherCostPaisa += netDebit;
    }
  }

  const totalCostPaisa =
    landCostPaisa + developmentCostPaisa + marketingCostPaisa + adminCostPaisa + otherCostPaisa;

  const netProfitPaisa = totalRevenuePaisa - totalCostPaisa;

  let profitMarginPercent = 0;
  if (totalRevenuePaisa > 0n) {
    profitMarginPercent = Number((netProfitPaisa * 10_000n) / totalRevenuePaisa) / 100;
  }

  const costBreakdown: ProjectCostBreakdownDto = {
    landCostPaisa: landCostPaisa.toString(),
    developmentCostPaisa: developmentCostPaisa.toString(),
    marketingCostPaisa: marketingCostPaisa.toString(),
    adminCostPaisa: adminCostPaisa.toString(),
    otherCostPaisa: otherCostPaisa.toString(),
    totalCostPaisa: totalCostPaisa.toString(),
  };

  const budgetVariancePaisa = estimatedBudgetPaisa
    ? (estimatedBudgetPaisa - totalCostPaisa).toString()
    : null;

  return {
    projectId,
    projectCode,
    projectName,
    totalRevenuePaisa: totalRevenuePaisa.toString(),
    costBreakdown,
    totalCostPaisa: totalCostPaisa.toString(),
    netProfitPaisa: netProfitPaisa.toString(),
    profitMarginPercent,
    isProfitable: netProfitPaisa > 0n,
    estimatedBudgetPaisa: estimatedBudgetPaisa?.toString() ?? null,
    budgetVariancePaisa,
  };
}
