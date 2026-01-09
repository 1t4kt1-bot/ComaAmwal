
export type DrinkAvailability = 'small' | 'large' | 'both';
export type DrinkSize = 'small' | 'large';

export const SCHEMA_VERSION = 1;

// --- AUTH TYPES ---
export type UserRole = 'admin' | 'partner' | 'user';

export type Permission = 
  | 'manage_products' // Drinks, Internet Cards
  | 'view_financials' // Liabilities, Partners, Debts
  | 'view_reports'    // Cost Analysis, Archive
  | 'manage_treasury' // Treasury, Ledger
  | 'view_summary'    // Daily Summary
  | 'manage_system';  // Settings, Backup, Audit

export interface AppUser {
    id: string;
    username: string;
    password?: string; // Legacy plain text (to be migrated)
    passwordHash?: string; // New secure storage
    name: string;
    role: UserRole;
    permissions?: Permission[]; 
    createdAt: string;
}

// --- CENTRAL LEDGER TYPES ---

export enum TransactionType {
    INCOME_SESSION = 'INCOME_SESSION',
    INCOME_PRODUCT = 'INCOME_PRODUCT', 
    DEBT_PAYMENT = 'DEBT_PAYMENT',
    LOAN_RECEIPT = 'LOAN_RECEIPT',
    DEBT_CREATE = 'DEBT_CREATE',
    EXPENSE_OPERATIONAL = 'EXPENSE_OPERATIONAL', 
    EXPENSE_PURCHASE = 'EXPENSE_PURCHASE', 
    LOAN_REPAYMENT = 'LOAN_REPAYMENT', 
    SAVING_DEPOSIT = 'SAVING_DEPOSIT',
    SAVING_WITHDRAWAL = 'SAVING_WITHDRAWAL',
    PARTNER_WITHDRAWAL = 'PARTNER_WITHDRAWAL',
    PARTNER_DEPOSIT = 'PARTNER_DEPOSIT',
    PARTNER_DEBT_PAYMENT = 'PARTNER_DEBT_PAYMENT',
    LIQUIDATION_TO_APP = 'LIQUIDATION_TO_APP',
    INTERNAL_TRANSFER = 'INTERNAL_TRANSFER', 
    OPENING_BALANCE = 'OPENING_BALANCE'
}

export type FinancialChannel = 'cash' | 'bank' | 'receivable'; 

export interface LedgerEntry {
    id: string;
    timestamp: string;
    dateKey: string;
    type: TransactionType;
    amount: number;
    direction: 'in' | 'out'; 
    channel: FinancialChannel;
    accountId?: string;
    
    entityId?: string;
    referenceId?: string;
    description: string;
    
    partnerId?: string;
    partnerName?: string;
    
    performedById?: string;
    performedByName?: string;

    migrated?: boolean;
    transferStatus?: 'confirmed' | 'pending' | 'rejected'; 
    senderName?: string;
    senderPhone?: string;
}

export interface PeriodLock {
    lockedUntil: string;
    lockId: string;
    createdAt: string;
    notes?: string;
    performedById?: string;
}

// --- SAVINGS & AUTO PLANS ---
export interface SavingPlan {
    id: string;
    name?: string;
    category?: 'saving' | 'expense';
    type: 'daily_saving' | 'monthly_payment';
    amount: number;
    channel: 'cash' | 'bank';
    bankAccountId?: string;
    isActive: boolean;
    lastAppliedAt: string;
    createdById?: string;
}

// ----------------------------------------------------

export interface Customer {
  id: string;
  name: string;
  phone: string;
  isVIP: boolean;
  creditBalance: number;
  debtBalance: number;
  lastVisit?: string;
  createdAt: string; 
  notes?: string; 
}

export interface DrinkComponent {
  itemId: string; // Inventory Item ID
  qty: number;    // Quantity consumed per drink
}

export interface Drink {
  id: string;
  name: string;
  availability: DrinkAvailability;
  smallPrice?: number;
  largePrice?: number;
  components?: DrinkComponent[]; // Linked Inventory Items
}

export interface InternetCard {
  id: string;
  name: string;
  price: number;
  cost: number;
  inventoryItemId?: string; // Linked Inventory Item for Stock Tracking
  notes?: string;
}

export type BankAccountType = 'palpay' | 'jawwalpay' | 'bop' | 'isbk' | 'other';

export interface BankAccount {
  id: string;
  name: string;
  accountType?: BankAccountType; 
  accountNumber?: string; 
  phone?: string; 
  active: boolean;
  notes?: string;
}

export type OrderType = 'drink' | 'internet_card';

export interface Order {
  id: string;
  type: OrderType;
  itemId: string;
  itemName: string;
  size?: DrinkSize;
  priceAtOrder: number;
  costAtOrder: number;
  quantity: number;
  timestamp: string;
}

export type DeviceStatus = 'mobile' | 'laptop'; 

export interface Discount {
    type: 'fixed' | 'percent';
    value: number; 
    amount: number; 
    locked: boolean;
}

export interface PlaceLoan {
    id: string;
    lenderType: 'partner' | 'external';
    lenderName: string;
    partnerId?: string; 
    reason: string;
    principal: number; 
    loanType: 'operational' | 'development';
    channel: 'cash' | 'bank'; 
    accountId?: string;
    startDate: string;
    scheduleType: 'daily' | 'weekly' | 'monthly';
    installmentsCount: number;
    installmentAmount: number;
    status: 'active' | 'closed';
    createdAt: string;
    installments: LoanInstallment[];
    payments: LoanPayment[]; 
    performedById?: string;
    performedByName?: string;
}

export interface LoanInstallment {
    id: string;
    loanId: string;
    dueDate: string;
    amount: number;
    status: 'due' | 'paid' | 'partial';
}

export interface LoanPayment {
    id: string;
    loanId: string;
    installmentId?: string; 
    date: string;
    amount: number;
    channel: 'cash' | 'bank';
    note?: string;
    performedById?: string;
}

export interface CashTransfer {
    id: string;
    partnerId: string;
    amount: number;
    date: string;
    timestamp: string;
    note?: string;
    targetAccountId?: string; 
    performedById?: string;
    performedByName?: string;
}

export interface SessionEvent {
  id: string;
  type: 'device_change';
  timestamp: string; 
  fromDevice: DeviceStatus;
  toDevice: DeviceStatus;
  note?: string;
  performedById?: string;
}

export interface SessionSegment {
  start: string;
  end: string;
  device: DeviceStatus;
  durationMinutes: number;
  ratePerHour: number;
  cost: number;
  isCurrent?: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  entityType: 'session' | 'customer' | 'system' | 'loan' | 'ledger' | 'lock' | 'savings' | 'user' | 'auth' | 'inventory';
  entityId: string; 
  action: string; 
  details: string;
  performedByName?: string; 
  performedById?: string;
}

export interface Session {
  id: string;
  customerName: string;
  customerPhone?: string; 
  startTime: string;
  notes?: string;
  orders: Order[];
  deviceStatus: DeviceStatus;
  events: SessionEvent[];
  startedById?: string;
}

export interface Transaction {
    id: string;
    date: string; 
    amount: number;
    type: 'cash' | 'bank' | 'credit_usage'; 
    bankAccountId?: string; 
    senderPhone?: string; 
    senderAccountName?: string; 
    note?: string;
}

export interface Record {
  id: string;
  customerName: string;
  customerPhone?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  
  sessionInvoice: number;
  drinksInvoice: number;
  internetCardsInvoice?: number; 
  totalInvoice: number; 
  totalDue?: number;
  
  discountApplied?: Discount;

  placeCost: number;
  drinksCost: number;
  internetCardsCost?: number; 
  
  grossProfit: number;
  devPercentSnapshot: number;
  devCut: number;
  netProfit: number;
  
  paymentStatus: 'paid' | 'partial' | 'customer_debt';
  isPaid: boolean;
  
  cashPaid: number;
  bankPaid: number;
  
  creditApplied: number; 
  createdDebt: number;   
  createdCredit: number; 
  settledDebt: number;   
  
  bankAccountId?: string; 
  bankAccountNameSnapshot?: string;
  senderPhone?: string; 
  senderAccountName?: string;

  transactions?: Transaction[]; 
  
  paidTotal: number;
  remainingDebt: number; 
  lastPaymentDate?: string; 
  
  excuse?: string;
  timestamp: number;
  orders: Order[];
  deviceStatus: DeviceStatus; 
  
  hourlyRateSnapshot: number; 
  placeCostRateSnapshot: number;
  
  events?: SessionEvent[];
  segmentsSnapshot?: SessionSegment[]; 
  
  performedById?: string;
  performedByName?: string;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  type: 'fixed' | 'one_time' | 'auto_purchase' | 'loan_repayment'; 
  date?: string;
  notes?: string;
  linkedPurchaseId?: string; 
  linkedLoanPaymentId?: string; 
  
  paymentMethod?: 'cash' | 'bank';
  fromAccountId?: string; 
  fromAccountNameAtPaymentTime?: string;
  performedById?: string;
  performedByName?: string;
}

export interface Purchase {
  id: string;
  name: string;
  amount: number;
  date: string;
  fundingSource: 'place' | 'partner';
  buyer: string;
  source?: string;
  notes?: string;
  
  paymentMethod?: 'cash' | 'bank';
  fromAccountId?: string; 
  fromAccountNameAtPaymentTime?: string; 
  performedById?: string;
  performedByName?: string;
  // If this purchase was used to fund inventory, store which item and quantity
  stockItemId?: string;
  stockQty?: number;
}

export interface PricingConfig {
  mobileRate: number;
  laptopRate: number; 
  mobilePlaceCost: number;
  laptopPlaceCost: number;
  devPercent: number;
  kwhPrice: number; 
  lastMeterReading: number; 
}

export interface DebtItem {
    id: string;
    partnerId: string;
    amount: number;
    date: string;
    note: string;
    debtSource: 'place' | 'partner';
    debtChannel?: 'cash' | 'bank'; 
    bankAccountId?: string; 
    performedById?: string;
    performedByName?: string;
}

export interface DayCycle {
  id: string;
  dateKey: string; 
  monthKey: string; 
  startTime: string; 
  endTime: string; 
  totalRevenue: number;
  cashRevenue: number;
  bankRevenue: number;
  totalDiscounts: number; 
  bankBreakdown: { bankName: string; amount: number }[];
  totalDebt: number;
  totalInvoice: number;
  totalOperationalCosts: number;
  netCashFlow: number; 
  netBankFlow: number; 
  grossProfit: number;
  devCut: number;
  netProfit: number; 
  notes?: string;
  createdAt: number;
  recordCount?: number;
  closedById?: string;
}

export interface InventorySnapshot {
  id: string;
  type: 'manual' | 'auto'; 
  archiveId: string;
  archiveDate: string;
  periodStart: string;
  periodEnd: string;
  createdAt: number;
  totalPaidRevenue: number;
  totalCashRevenue: number; 
  totalBankRevenue: number; 
  totalDiscounts: number; 
  totalDebtRevenue: number; 
  totalInvoice: number; 
  totalPlaceCost: number;
  totalDrinksCost: number;
  totalCardsCost: number; 
  totalExpenses: number;
  totalLoanRepayments?: number; 
  totalSavings?: number; 
  electricityCost?: number; 
  startMeterReading?: number; 
  endMeterReading?: number; 
  electricityPaymentChannel?: 'cash' | 'bank'; 
  electricityBankAccountId?: string; 
  totalCashExpenses: number; 
  totalBankExpenses: number; 
  netCashInPlace: number;
  netBankInPlace: number;
  grossProfit: number;
  devCut: number;
  netProfitPaid: number;
  devPercentSnapshot?: number;
  partners: {
    name: string;
    sharePercent: number;
    baseShare: number;
    cashShareAvailable: number;
    bankShareAvailable: number;
    purchasesReimbursement: number;
    loanRepaymentCash: number; 
    loanRepaymentBank: number; 
    placeDebtDeducted: number;
    finalPayoutCash: number; 
    finalPayoutBank: number; 
    finalPayoutTotal: number;
    remainingDebt: number;
  }[];
  revenueDetails?: {
      sessions: number;
      drinks: number;
      cards: number;
  };
  expensesDetails?: {
      fixed: { name: string; amount: number; dailyShare: number; periodShare: number }[];
      oneTime: { name: string; amount: number; date: string }[];
      autoPurchases: { name: string; amount: number; date: string }[];
      loanRepayments: { name: string; amount: number; date: string; channel: 'cash' | 'bank' }[]; 
  };
  bankSummary?: { bankName: string; amount: number; count: number }[];
  debtsSummary?: { totalDebt: number; totalRepaid: number; remaining: number };
  performedById?: string;
}

export interface InventoryMovement {
  id: string;
  date: string;
  qty: number;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit?: string; 
  qty: number;
  costPrice?: number; // سعر التكلفة للوحدة
  movements?: InventoryMovement[];
}

export interface PartnerLedgerItem {
    id: string;
    date: string;
    type: 'profit_share' | 'loan_repayment' | 'withdrawal' | 'purchase_reimbursement' | 'adjustment' | 'debt_settlement' | 'cash_out_transfer';
    channel: 'cash' | 'bank';
    amount: number; 
    description: string;
    refId?: string; 
}

export interface OperationLog {
    id: string;
    type: 'start_cycle' | 'close_cycle' | 'auto_month_archive' | 'debt_payment' | 'audit_sync' | 'inventory_archive' | 'credit_added' | 'credit_applied' | 'debt_settled' | 'invoice_closed' | 'loan_payment' | 'archive_rebuild' | 'cash_transfer';
    dateTime: string;
    targetDate?: string;
    notes?: string;
    performedByName?: string;
}

export interface SystemState {
    currentDate: string; 
    currentMonth: string; 
    activeCycleId: string | null;
    currentCycleStartTime: string | null; 
    dayStatus: 'open' | 'closed'; 
    monthStatus: 'open' | 'closed'; 
    logs: OperationLog[];
    lastBackupDate?: string; 
}

export type ViewState = 'dashboard' | 'history' | 'records' | 'summary' | 'settings' | 'cost_analysis' | 'profit_dist' | 'partner_debts' | 'inventory' | 'inventory_archive' | 'drinks' | 'purchases' | 'monthly' | 'internet_cards' | 'treasury' | 'vip_customers' | 'liabilities' | 'partners' | 'audit_log' | 'ledger_viewer' | 'backup_restore' | 'users';
