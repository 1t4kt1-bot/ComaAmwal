
import { LedgerEntry, TransactionType, FinancialChannel, Record, Expense, Purchase, CashTransfer, DebtItem, PlaceLoan, BankAccount, InventorySnapshot, PricingConfig, DayCycle, PeriodLock, SavingPlan } from './types';
import { generateId, getLocalDate, getDaysInMonth, getAllDaysOfMonth, formatCurrency } from './utils';

// --- SINGLE SOURCE OF TRUTH FOR PARTNERS ---
export const GLOBAL_PARTNERS = [
    { id: 'abu_khaled', name: 'أبو خالد', percent: 34 },
    { id: 'khaled', name: 'خالد', percent: 33 },
    { id: 'abdullah', name: 'عبد الله', percent: 33 }
];

// --- CORE SELECTORS ---

export const getLedgerBalance = (ledger: LedgerEntry[], channel: FinancialChannel, accountId?: string): number => {
    return ledger.reduce((acc, entry) => {
        if (entry.channel !== channel) return acc;
        if (accountId && entry.accountId !== accountId) return acc;

        // استثناء الإيداعات الناتجة عن مشتريات الشركاء من حساب الرصيد النقدي (لأنها لا تزيد الكاش الفعلي)
        const isPartnerPurchaseDeposit = entry.type === TransactionType.PARTNER_DEPOSIT &&
                                         entry.direction === 'in' &&
                                         (entry.description.includes('شراء') || entry.description.includes('بضاعة'));

        if (isPartnerPurchaseDeposit) return acc;
        
        if (entry.direction === 'in') {
            if (channel === 'bank' && entry.transferStatus && entry.transferStatus !== 'confirmed') {
                return acc;
            }
            return acc + (entry.amount || 0);
        }
        if (entry.direction === 'out') return acc - (entry.amount || 0);
        return acc;
    }, 0);
};

export const getSavingsBalance = (ledger: LedgerEntry[]): number => {
    return ledger.reduce((acc, entry) => {
        if (entry.type === TransactionType.SAVING_DEPOSIT) return acc + entry.amount;
        if (entry.type === TransactionType.SAVING_WITHDRAWAL) return acc - entry.amount;
        return acc;
    }, 0);
};

export const resolveActorName = (entry: LedgerEntry): string => {
    if (entry.partnerName) return entry.partnerName;
    if (entry.partnerId) {
        const partner = GLOBAL_PARTNERS.find(p => p.id === entry.partnerId);
        if (partner) return partner.name;
    }
    if (entry.senderName) return entry.senderName;

    // Fix: Shadowed global Record utility type by domain model Record. Using index signature instead.
    const types: { [key: string]: string } = {
        [TransactionType.INCOME_SESSION]: "زبون (جلسة)",
        [TransactionType.INCOME_PRODUCT]: "زبون (منتجات)",
        [TransactionType.DEBT_PAYMENT]: "زبون (سداد دين)",
        [TransactionType.DEBT_CREATE]: "زبون (تسجيل دين)",
        [TransactionType.EXPENSE_OPERATIONAL]: "مصاريف تشغيلية",
        [TransactionType.EXPENSE_PURCHASE]: "مشتريات للمكان",
        [TransactionType.LOAN_RECEIPT]: "دائن (قرض)",
        [TransactionType.LOAN_REPAYMENT]: "دائن (سداد)",
        [TransactionType.SAVING_DEPOSIT]: "صندوق الادخار",
        [TransactionType.LIQUIDATION_TO_APP]: "تطبيق / بنك"
    };

    return types[entry.type] || 'جهة غير محددة';
};

export const getLedgerStatsForPeriod = (ledger: LedgerEntry[], startDate: string, endDate: string) => {
    const periodEntries = ledger.filter(e => e.dateKey >= startDate && e.dateKey <= endDate);
    
    const income = periodEntries
        .filter(e => e.type === TransactionType.INCOME_SESSION || e.type === TransactionType.INCOME_PRODUCT)
        .reduce((s, e) => s + (e.amount || 0), 0);
    
    const sessionIncome = periodEntries.filter(e => e.type === TransactionType.INCOME_SESSION).reduce((s,e) => s + (e.amount || 0), 0);
    const productIncome = periodEntries.filter(e => e.type === TransactionType.INCOME_PRODUCT).reduce((s,e) => s + (e.amount || 0), 0);
    
    const expenses = periodEntries
        .filter(e => e.type === TransactionType.EXPENSE_OPERATIONAL || e.type === TransactionType.EXPENSE_PURCHASE)
        .reduce((s, e) => s + (e.amount || 0), 0);
        
    const debtCreated = periodEntries
        .filter(e => e.type === TransactionType.DEBT_CREATE)
        .reduce((s, e) => s + (e.amount || 0), 0);
        
    const debtPaid = periodEntries
        .filter(e => e.type === TransactionType.DEBT_PAYMENT)
        .reduce((s, e) => s + (e.amount || 0), 0);
        
    const netCashFlow = periodEntries.reduce((acc, entry) => {
        if (entry.channel !== 'cash') return acc;
        if (entry.type === TransactionType.PARTNER_DEPOSIT && (entry.description.includes('شراء') || entry.description.includes('بضاعة'))) return acc;
        return entry.direction === 'in' ? acc + entry.amount : acc - entry.amount;
    }, 0);

    return { 
        income, sessionIncome, productIncome, expenses, debtCreated, debtPaid, 
        totalNetCash: getLedgerBalance(ledger, 'cash'), 
        totalNetBank: getLedgerBalance(ledger, 'bank'), 
        netCashFlow
    };
};

export const getLedgerTotals = (ledger: LedgerEntry[], period: 'today' | 'month' | 'custom', dateReference: string) => {
    let startDate = dateReference;
    let endDate = dateReference;
    if (period === 'month') {
        startDate = dateReference.slice(0, 7) + '-01';
        endDate = dateReference.slice(0, 7) + '-' + getDaysInMonth(startDate);
    }
    return getLedgerStatsForPeriod(ledger, startDate, endDate);
};

export const getPartnerStats = (ledger: LedgerEntry[], partnerId: string) => {
    const entries = ledger.filter(e => e.partnerId === partnerId);
    const withdrawals = entries.filter(e => e.type === TransactionType.PARTNER_WITHDRAWAL).reduce((s, e) => s + (e.amount || 0), 0);
    const repayments = entries.filter(e => e.type === TransactionType.PARTNER_DEPOSIT || e.type === TransactionType.PARTNER_DEBT_PAYMENT).reduce((s, e) => s + (e.amount || 0), 0);
    return { withdrawals, repayments, currentNet: withdrawals - repayments, entries };
};

export const getTreasuryStats = (ledger: LedgerEntry[], accounts: BankAccount[]) => {
    return {
        cashBalance: getLedgerBalance(ledger, 'cash'),
        totalBankBalance: getLedgerBalance(ledger, 'bank'),
        accountsStats: accounts.map(acc => ({
            ...acc,
            balance: getLedgerBalance(ledger, 'bank', acc.id),
            totalIn: ledger.filter(e => e.accountId === acc.id && e.direction === 'in' && (e.transferStatus === 'confirmed' || !e.transferStatus)).reduce((s,e) => s+e.amount, 0),
            totalOut: ledger.filter(e => e.accountId === acc.id && e.direction === 'out').reduce((s,e) => s+e.amount, 0)
        }))
    };
};

export const getPartnerDebtSummary = (debtsList: DebtItem[], partnerId: string) => {
    const items = debtsList.filter(d => d.partnerId === partnerId);
    const totalDebt = items.reduce((sum, d) => sum + (d.amount || 0), 0);
    const placeDebt = items.filter(d => d.debtSource === 'place' || !d.debtSource).reduce((sum, d) => sum + (d.amount || 0), 0);
    return { totalDebt, placeDebt, items };
};

export const getPlaceLoanStats = (loan: PlaceLoan) => {
    const paid = loan.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = loan.principal - paid;
    const progress = loan.principal > 0 ? Math.min(100, (paid / loan.principal) * 100) : 0;
    return { paid, remaining, progress, isFullyPaid: remaining <= 0.01 };
};

export const checkLoanStatusAfterPayment = (loan: PlaceLoan, newAmount: number): 'active' | 'closed' => {
     const currentPaid = loan.payments.reduce((s, p) => s + p.amount, 0);
     return (currentPaid + newAmount) >= (loan.principal - 0.01) ? 'closed' : 'active';
};

export const getCostAnalysisView = (ledger: LedgerEntry[], records: Record[], monthKey: string) => {
    const days = getAllDaysOfMonth(monthKey);
    return days.map(date => {
        const periodEntries = ledger.filter(e => e.dateKey === date);
        const dayRecords = records.filter(r => r.endTime.startsWith(date));

        const income = periodEntries.filter(e => e.type === TransactionType.INCOME_SESSION || e.type === TransactionType.INCOME_PRODUCT).reduce((s, e) => s + (e.amount || 0), 0);
        const expenses = periodEntries.filter(e => e.type === TransactionType.EXPENSE_OPERATIONAL || e.type === TransactionType.EXPENSE_PURCHASE).reduce((s, e) => s + (e.amount || 0), 0);
        const savings = periodEntries.filter(e => e.type === TransactionType.SAVING_DEPOSIT).reduce((s, e) => s + (e.amount || 0), 0);
        const loanRepayments = periodEntries.filter(e => e.type === TransactionType.LOAN_REPAYMENT).reduce((s, e) => s + (e.amount || 0), 0);

        const cogs = dayRecords.reduce((s, r) => s + (r.drinksCost || 0) + (r.internetCardsCost || 0) + (r.placeCost || 0), 0);

        return {
            date,
            totalRevenue: income,
            totalExpenses: expenses,
            totalSavings: savings,
            totalLoanRepayments: loanRepayments,
            totalCOGS: cogs,
            netProfit: income - expenses - savings - loanRepayments - cogs,
        };
    }).filter(d => d.totalRevenue > 0 || d.totalExpenses > 0 || d.totalSavings > 0 || d.totalLoanRepayments > 0);
};

export const getExpensesPageStats = (purchases: Purchase[], savingPlans: SavingPlan[], currentMonth: string) => {
    const totalDaily = purchases.filter(p => p.date?.startsWith(currentMonth)).reduce((s, p) => s + p.amount, 0);
    const fixedPlans = savingPlans.filter(p => p.category === 'expense');
    const totalFixedMonthly = fixedPlans.reduce((s, e) => s + e.amount, 0); 
    const daysInMonth = getDaysInMonth(currentMonth + '-01');
    const totalDailyFixed = fixedPlans.reduce((s, e) => s + (e.amount / daysInMonth), 0);
    return { totalDaily, totalFixedMonthly, totalDailyFixed, fixedCount: fixedPlans.length };
};

export const getSnapshotDistributionTotals = (snapshot: InventorySnapshot) => {
    const totalCashDist = snapshot.partners?.reduce((sum, p) => sum + (p.finalPayoutCash || 0), 0) || 0;
    const totalBankDist = snapshot.partners?.reduce((sum, p) => sum + (p.finalPayoutBank || 0), 0) || 0;
    return { totalCashDist, totalBankDist };
};

export const validateOperation = (date: string, lock: PeriodLock | null) => {
    if (lock && date <= lock.lockedUntil) throw new Error(`الفترة مغلقة حتى ${lock.lockedUntil}.`);
};

export const checkLedgerIntegrity = (ledger: LedgerEntry[]): string[] => {
    const errors: string[] = [];
    const cash = getLedgerBalance(ledger, 'cash');
    if (cash < -0.01) errors.push(`عجز نقدي حرج: ${cash.toFixed(2)} ₪`);
    return errors;
};

export const validateTransaction = (ledger: LedgerEntry[], amount: number, channel: FinancialChannel, accountId?: string): void => {
    if (channel === 'receivable') return;
    const balance = getLedgerBalance(ledger, channel, accountId);
    if ((balance - amount) < -0.01) throw new Error(`رصيد غير كافٍ (${balance.toFixed(2)} ₪).`);
};

export const createEntry = (type: TransactionType, amount: number, direction: 'in' | 'out', channel: FinancialChannel, description: string, accountId?: string, entityId?: string, partnerId?: string, date?: string, referenceId?: string, partnerName?: string, performedById?: string, performedByName?: string): LedgerEntry => {
    return { id: generateId(), timestamp: new Date().toISOString(), dateKey: date || getLocalDate(), type, amount, direction, channel, accountId, description, entityId, partnerId, partnerName, referenceId, performedById, performedByName };
};

export const processAutoSavings = (plans: SavingPlan[], ledger: LedgerEntry[], inventoryDate: string = getLocalDate()): { entries: LedgerEntry[], updatedPlans: SavingPlan[] } => {
    const newEntries: LedgerEntry[] = [];
    const updatedPlans: SavingPlan[] = [];
    const currentDate = new Date(inventoryDate);
    currentDate.setHours(12,0,0,0);

    for (const plan of plans) {
        if (!plan.isActive) { updatedPlans.push(plan); continue; }
        const lastDate = new Date(plan.lastAppliedAt);
        lastDate.setHours(12,0,0,0);
        
        const daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 0) { updatedPlans.push(plan); continue; }

        let amount = 0;
        if (plan.type === 'daily_saving') amount = daysDiff * plan.amount;
        else if (plan.type === 'monthly_payment') amount = (plan.amount / getDaysInMonth(inventoryDate)) * daysDiff;

        if (amount > 0) {
            const isExpense = plan.category === 'expense';
            newEntries.push(createEntry(isExpense ? TransactionType.EXPENSE_OPERATIONAL : TransactionType.SAVING_DEPOSIT, amount, 'out', plan.channel, `تلقائي: ${plan.name || 'التزام'} (${daysDiff} يوم)`, plan.bankAccountId, generateId(), undefined, inventoryDate, undefined, undefined, 'system', 'النظام الآلي'));
            updatedPlans.push({ ...plan, lastAppliedAt: inventoryDate });
        } else updatedPlans.push(plan);
    }
    return { entries: newEntries, updatedPlans };
};

export const calcEndDayPreviewFromLedger = (ledger: LedgerEntry[], startDate: string, bankAccounts: BankAccount[], pricingConfig: PricingConfig): DayCycle => {
    const now = new Date().toISOString();
    const cycleEntries = ledger.filter(e => e.timestamp >= startDate && e.timestamp <= now);
    const cashRevenue = cycleEntries.filter(e => e.channel === 'cash' && e.direction === 'in').reduce((s, e) => s + e.amount, 0);
    const bankRevenue = cycleEntries.filter(e => e.channel === 'bank' && e.direction === 'in').reduce((s, e) => s + e.amount, 0);
    const totalDebt = cycleEntries.filter(e => e.type === TransactionType.DEBT_CREATE).reduce((s, e) => s + e.amount, 0);
    return { id: 'PREVIEW', dateKey: startDate.split('T')[0], monthKey: startDate.slice(0, 7), startTime: startDate, endTime: now, totalRevenue: cashRevenue + bankRevenue, cashRevenue, bankRevenue, totalDiscounts: 0, bankBreakdown: [], totalDebt, totalInvoice: cashRevenue + bankRevenue + totalDebt, totalOperationalCosts: 0, netCashFlow: 0, netBankFlow: 0, grossProfit: 0, devCut: 0, netProfit: 0, recordCount: 0, createdAt: Date.now() };
};

export const calcLedgerInventory = (ledger: LedgerEntry[], records: Record[], startDate: string, endDate: string, expenses: Expense[], pricingConfig: PricingConfig, electricityCost: number = 0): InventorySnapshot => {
    const periodEntries = ledger.filter(e => e.dateKey >= startDate && e.dateKey <= endDate);
    const isVirtual = (e: LedgerEntry) => e.type === TransactionType.EXPENSE_OPERATIONAL && e.description.includes('تلقائي');

    // التدفقات النقدية (الداخلة)
    const cashIn = periodEntries.filter(e => e.channel === 'cash' && e.direction === 'in').reduce((s,e) => s + e.amount, 0);
    const bankIn = periodEntries.filter(e => e.channel === 'bank' && e.direction === 'in' && (e.transferStatus === 'confirmed' || !e.transferStatus)).reduce((s,e) => s + e.amount, 0);
    
    // التدفقات النقدية (الخارجة الفعلية - استثناء التلقائي لعدم تكرار الخصم من رصيد الصندوق)
    const cashOut = periodEntries.filter(e => e.channel === 'cash' && e.direction === 'out' && !isVirtual(e)).reduce((s,e) => s + e.amount, 0);
    const bankOut = periodEntries.filter(e => e.channel === 'bank' && e.direction === 'out' && !isVirtual(e)).reduce((s,e) => s + e.amount, 0);

    const netCashInPlace = cashIn - cashOut;
    const netBankInPlace = bankIn - bankOut;

    // حساب التكاليف المباشرة من السجلات
    const periodRecords = records.filter(r => r.endTime.split('T')[0] >= startDate && r.endTime.split('T')[0] <= endDate);
    const totalDirectCosts = periodRecords.reduce((s, r) => s + (r.drinksCost || 0) + (r.internetCardsCost || 0) + (r.placeCost || 0), 0);

    // حساب المصاريف التشغيلية الكلية (بما فيها الافتراضية والكهرباء)
    const totalOpsExpenses = periodEntries.filter(e => e.type === TransactionType.EXPENSE_OPERATIONAL || e.type === TransactionType.EXPENSE_PURCHASE).reduce((s, e) => s + e.amount, 0) + electricityCost;
    const totalLoanRepayments = periodEntries.filter(e => e.type === TransactionType.LOAN_REPAYMENT).reduce((s, e) => s + e.amount, 0);

    const totalInvoice = periodEntries.filter(e => e.type === TransactionType.INCOME_SESSION || e.type === TransactionType.INCOME_PRODUCT || e.type === TransactionType.DEBT_CREATE).reduce((s,e) => s+e.amount, 0);
    
    const grossProfit = totalInvoice - totalOpsExpenses - totalLoanRepayments - totalDirectCosts;
    const devCut = grossProfit > 0 ? grossProfit * (pricingConfig.devPercent / 100) : 0;
    const netProfitPaid = grossProfit - devCut;

    const partners = GLOBAL_PARTNERS.map(p => {
        const baseShare = Math.max(0, netProfitPaid * (p.percent / 100));
        
        // حساب أنشطة الشريك الخاصة لتعديل النسبة النقدية (كما في التقرير)
        const myPurchases = periodEntries.filter(e => e.partnerId === p.id && e.type === TransactionType.PARTNER_DEPOSIT && e.description.includes('شراء')).reduce((s,e) => s+e.amount, 0);
        const myWithdrawals = periodEntries.filter(e => e.partnerId === p.id && e.type === TransactionType.PARTNER_WITHDRAWAL).reduce((s,e) => s+e.amount, 0);

        const opsNetCash = netCashInPlace + myPurchases + myWithdrawals;
        const opsNetBank = netBankInPlace; // تبسيط: نفترض المشتريات والمسحوبات كاش غالباً
        const totalOpsNet = opsNetCash + opsNetBank;

        const cashRatio = totalOpsNet > 0 ? Math.max(0, opsNetCash) / totalOpsNet : 0.5;
        const bankRatio = 1 - cashRatio;

        const finalPayoutCash = (baseShare * cashRatio) + myPurchases - myWithdrawals;
        const finalPayoutBank = (baseShare * bankRatio);

        return {
            name: p.name, sharePercent: p.percent / 100, baseShare,
            cashShareAvailable: baseShare * cashRatio, bankShareAvailable: baseShare * bankRatio,
            purchasesReimbursement: myPurchases, loanRepaymentCash: 0, loanRepaymentBank: 0,
            placeDebtDeducted: myWithdrawals, finalPayoutCash, finalPayoutBank,
            finalPayoutTotal: finalPayoutCash + finalPayoutBank, remainingDebt: 0
        };
    });

    return {
        id: generateId(), type: 'manual', archiveId: 'SNAP-' + generateId(), archiveDate: new Date().toISOString(),
        periodStart: startDate, periodEnd: endDate, createdAt: Date.now(), 
        totalPaidRevenue: cashIn + bankIn, totalCashRevenue: cashIn, totalBankRevenue: bankIn,
        totalDiscounts: 0, totalDebtRevenue: totalInvoice - (cashIn + bankIn), totalInvoice,
        totalPlaceCost: periodRecords.reduce((s,r) => s+(r.placeCost||0), 0),
        totalDrinksCost: periodRecords.reduce((s,r) => s+(r.drinksCost||0), 0),
        totalCardsCost: periodRecords.reduce((s,r) => s+(r.internetCardsCost||0), 0),
        totalExpenses: totalOpsExpenses, totalLoanRepayments, totalSavings: 0, electricityCost,
        totalCashExpenses: cashOut, totalBankExpenses: bankOut, netCashInPlace, netBankInPlace,
        grossProfit, devCut, netProfitPaid, devPercentSnapshot: pricingConfig.devPercent, partners
    };
};

export const migrateLegacyDataToLedger = (records: Record[], expenses: Expense[], transfers: CashTransfer[], debts: DebtItem[], placeLoans: PlaceLoan[]): LedgerEntry[] => {
    const ledger: LedgerEntry[] = [];
    records.forEach(r => {
        const date = r.endTime.split('T')[0];
        if (r.cashPaid > 0) ledger.push(createEntry(TransactionType.INCOME_SESSION, r.cashPaid, 'in', 'cash', `جلسة: ${r.customerName}`, undefined, r.id, undefined, date));
        if (r.remainingDebt > 0) ledger.push(createEntry(TransactionType.DEBT_CREATE, r.remainingDebt, 'in', 'receivable', `دين: ${r.customerName}`, undefined, r.id, undefined, date));
    });
    return ledger.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};
