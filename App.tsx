
import React, { useState, useMemo, useEffect } from 'react';
// Added InventoryItem and InventoryMovement to imports
import { Session, Record, ViewState, Order, DeviceStatus, Expense, Purchase, InventorySnapshot, DrinkSize, DebtItem, Transaction, DayCycle, Customer, Discount, PlaceLoan, CashTransfer, LedgerEntry, TransactionType, PeriodLock, AppUser, SavingPlan, InventoryItem, InventoryMovement } from './types';
import { generateId, getCurrentTimeOnly, mergeDateAndTime, getLocalDate, getDaysInMonth, formatCurrency, formatDuration, calculateDrinkCost } from './utils';
import { calcRecordFinancials, calculateCustomerTransaction } from './accounting';
import { validateTransaction, createEntry, calcLedgerInventory, calcEndDayPreviewFromLedger, validateOperation, GLOBAL_PARTNERS, processAutoSavings } from './accounting_core';
import { useAppState } from './hooks/useAppState';

// ... Components imports
import Layout from './components/ui/Layout';
import Toast from './components/ui/Toast';
import Dashboard from './pages/Dashboard';
import RecordsList from './pages/RecordsList';
import Settings from './pages/Settings';
import CostAnalysis from './pages/CostAnalysis';
import ProfitDistribution from './pages/ProfitDistribution';
import InventoryArchive from './pages/InventoryArchive';
import DrinksPage from './pages/DrinksPage';
import InventoryPage from './pages/InventoryPage';
import ExpensesPage from './pages/ExpensesPage';
import PartnerDebtsPage from './pages/PartnerDebtsPage';
import InternetCardsPage from './pages/InternetCardsPage';
import TreasuryPage from './pages/TreasuryPage'; 
import VipCustomersPage from './pages/VipCustomersPage';
import LiabilitiesPage from './pages/LiabilitiesPage';
import PartnersPage from './pages/PartnersPage';
import BankAccountsPage from './pages/BankAccountsPage';
import LedgerViewerPage from './pages/LedgerViewerPage';
import AuditLogPage from './pages/AuditLogPage';
import BackupRestorePage from './pages/BackupRestorePage';
import UsersPage from './pages/UsersPage';
import LoginPage from './components/auth/LoginPage';

// Modals & UI
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import FormInput from './components/ui/FormInput';
import { Lock, Search, Star, ArrowRightLeft, Percent, CreditCard, AlertTriangle, CheckCircle, X, Gauge, Zap, ArrowRight, ArrowDown, Banknote, Landmark, AlertCircle, ChevronLeft, ShieldCheck, UserCheck, Calculator, Box, Info, Save, Trash2, RotateCcw, Coins } from 'lucide-react';

const App: React.FC = () => {
  // --- UI STATE (View, Modals, Local Forms) ---
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [modals, setModals] = useState({ addSession: false, checkout: false, addOrder: false, inventory: false, endDay: false, audit: false, profile: false, inventoryConfirm: false });
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  
  // Local Form States
  const [newSessionData, setNewSessionData] = useState({ name: '', phone: '', time: getCurrentTimeOnly(), device: 'mobile' as DeviceStatus, notes: '', isVIP: false });
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [checkoutData, setCheckoutData] = useState<{ 
      session: Session | null, 
      time: string, 
      cash: string, 
      bank: string, 
      bankAccountId: string,
      senderPhone: string,
      senderAccountName: string,
      excuse: string,
      discount: Discount | undefined
  }>({ 
      session: null, time: '', cash: '', bank: '', bankAccountId: '', senderPhone: '', senderAccountName: '', excuse: '', discount: undefined
  });

  const [orderData, setOrderData] = useState<{ 
      target: Session | Record | null, 
      orderIdToEdit: string | null, 
      type: 'drink' | 'internet_card', 
      itemId: string, 
      size: DrinkSize, 
      qty: string, 
      time: string,
      lockType?: boolean
  }>({ target: null, orderIdToEdit: null, type: 'drink', itemId: '', size: 'small', qty: '1', time: '' });
  
  const [endDayData, setEndDayData] = useState<any>(null);
  const [endDayNotes, setEndDayNotes] = useState('');
  const [inventoryRange, setInventoryRange] = useState({ start: '', end: getLocalDate() });
  const [inventoryPreview, setInventoryPreview] = useState<any>(null);
  
  // Electricity Form State
  const [currentMeterReading, setCurrentMeterReading] = useState('');
  const [elecPaymentChannel, setElecPaymentChannel] = useState<'cash' | 'bank'>('cash');
  const [elecBankAccountId, setElecBankAccountId] = useState('');
  const [inventoryStep, setInventoryStep] = useState<'data' | 'review'>('data'); // Step tracking
  
  const [pendingAutoSavings, setPendingAutoSavings] = useState<{ entries: LedgerEntry[], updatedPlans: SavingPlan[] } | null>(null);

  // Profile Edit State
  const [profileData, setProfileData] = useState({ name: '', username: '', password: '' });

  // --- DATA STORE HOOK ---
  const {
      sessions, setSessions,
      records, setRecords,
      auditLogs, 
      drinks, setDrinks,
      internetCards, setInternetCards,
      bankAccounts, setBankAccounts,
      expenses, setExpenses,
      purchases, setPurchases,
      inventorySnapshots, setInventorySnapshots,
    inventoryItems, setInventoryItems,
      customers, setCustomers,
      placeLoans, setPlaceLoans,
      cashTransfers, setCashTransfers,
      savingPlans, setSavingPlans,
      periodLock, setPeriodLock,
      ledger, setLedger,
      dayCycles, setDayCycles,
      dailyClosings,
      systemState, setSystemState,
      pricingConfig, setPricingConfig,
      debtsList, setDebtsList,
      integrityErrors,
      daysSinceBackup,
      logAction,
      users, addUser, updateUser, deleteUser,
      currentUser, login, logout
  } = useAppState();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
  };

  // Helper to get attribution data
  const getPerformer = () => ({
      performedById: currentUser?.id,
      performedByName: currentUser?.name
  });

  // --- CALCULATED VALUES ---
  const checkoutFinancials = useMemo(() => {
    if (!checkoutData.session || !modals.checkout) return null;
    const endIso = mergeDateAndTime(systemState.currentDate, checkoutData.time);
    const financials = calcRecordFinancials(checkoutData.session, endIso, pricingConfig, undefined, checkoutData.discount);
    const totalDue = Math.round(financials.totalInvoice || 0);
    const phone = checkoutData.session.customerPhone;
    const existingCustomer = customers.find(c => c.phone === phone);
    const customerSnapshot: Customer = existingCustomer || { id: 'stub', name: checkoutData.session.customerName, phone: phone || 'unknown', isVIP: false, creditBalance: 0, debtBalance: 0, createdAt: '' };
    const cash = parseFloat(checkoutData.cash) || 0;
    const bank = parseFloat(checkoutData.bank) || 0;
    const result = calculateCustomerTransaction(totalDue, cash + bank, customerSnapshot);
    return { ...financials, ...result };
  }, [checkoutData, modals.checkout, pricingConfig, systemState.currentDate, customers]);

  // Recalculate Inventory Preview when meter reading changes
  useEffect(() => {
    if (modals.inventory && inventoryRange.start) {
        const reading = parseFloat(currentMeterReading) || pricingConfig.lastMeterReading || 0;
        const delta = Math.max(0, reading - (pricingConfig.lastMeterReading || 0));
        const elecCost = delta * (pricingConfig.kwhPrice || 0);

        const effectiveLedger = [...(pendingAutoSavings?.entries || []), ...ledger];
        const preview = calcLedgerInventory(effectiveLedger, records, inventoryRange.start, inventoryRange.end, expenses, pricingConfig, elecCost);
        
        setInventoryPreview({
            ...preview,
            startMeterReading: pricingConfig.lastMeterReading,
            endMeterReading: reading,
            electricityCost: elecCost
        });
    }
  }, [currentMeterReading, modals.inventory, pricingConfig, ledger, records, inventoryRange, expenses, pendingAutoSavings]);

  const canSubmitCheckout = useMemo(() => {
      if (!checkoutData.session) return false;
      const bankVal = parseFloat(checkoutData.bank) || 0;
      if (bankVal > 0) { if (!checkoutData.bankAccountId || !checkoutData.senderPhone || !checkoutData.senderAccountName) return false; }
      return true;
  }, [checkoutData]);

  const filteredCustomers = useMemo(() => {
      if (!customerSearch.trim()) return [];
      return customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).slice(0, 5);
  }, [customerSearch, customers]);

  // --- DERIVED STATE FOR ORDER MODAL ---
  const orderModalStockStatus = useMemo(() => {
    const qty = parseInt(orderData.qty) || 1;
    
    if (orderData.type === 'drink' && orderData.itemId) {
        const drink = drinks.find(d => d.id === orderData.itemId);
        if (!drink || !drink.components) return null;
        
        return drink.components.map(comp => {
            const invItem = inventoryItems.find(i => i.id === comp.itemId);
            const needed = comp.qty * qty;
            const available = invItem?.qty || 0;
            return {
                name: invItem?.name || 'صنف محذوف',
                unit: invItem?.unit || '',
                available,
                needed,
                isShort: available < needed
            };
        });
    }

    if (orderData.type === 'internet_card' && orderData.itemId) {
        const card = internetCards.find(c => c.id === orderData.itemId);
        if (!card || !card.inventoryItemId) return null;
        
        const invItem = inventoryItems.find(i => i.id === card.inventoryItemId);
        const needed = qty;
        const available = invItem?.qty || 0;
        
        return [{
            name: invItem?.name || 'صنف محذوف',
            unit: 'بطاقة',
            available,
            needed,
            isShort: available < needed
        }];
    }

    return null;
  }, [orderData.itemId, orderData.type, orderData.qty, drinks, internetCards, inventoryItems]);

  const canSaveOrder = useMemo(() => {
      if (!orderData.itemId) return false;
      if (!orderModalStockStatus) return true; // No linked stock? allow (old data fallback)
      return !orderModalStockStatus.some(s => s.isShort);
  }, [orderData.itemId, orderModalStockStatus]);

  // --- AUTH GUARD ---
  if (!currentUser) {
      return (
          <>
            {toast && <Toast msg={toast.msg} type={toast.type} />}
            <LoginPage onLogin={login} />
          </>
      );
  }

  // --- HANDLERS ---
  const handleBackupComplete = () => {
      setSystemState(prev => ({
          ...prev,
          lastBackupDate: new Date().toISOString()
      }));
      showToast('تم تحديث تاريخ آخر نسخ احتياطي', 'success');
  };

  const handleDeletePurchase = (purchaseId: string) => {
      const purchase = purchases.find(p => p.id === purchaseId);
      if (!purchase) return;
      try {
          validateOperation(purchase.date || getLocalDate(), periodLock);
          const linkedExpense = expenses.find(e => e.id && e.linkedPurchaseId === purchaseId);
          if (linkedExpense) {
              setExpenses(prev => prev.filter(e => e.id !== linkedExpense.id));
              setLedger(prev => prev.filter(e => e.entityId !== linkedExpense.id));
          }
          setLedger(prev => prev.filter(e => e.entityId !== purchaseId));
          // If this purchase funded inventory, revert the inventory quantities
          if ((purchase as any).stockItemId && (purchase as any).stockQty) {
              const stockItemId = (purchase as any).stockItemId as string;
              const stockQty = (purchase as any).stockQty as number;
              setInventoryItems(prev => prev.map(it => {
                  if (it.id !== stockItemId) return it;
                  const newQty = Math.max(0, (it.qty || 0) - stockQty);
                  const movement = { id: generateId(), date: new Date().toISOString(), qty: -Math.abs(stockQty), type: 'out' as const, notes: `تراجع عن توريد: ${purchase.name}` };
                  return { ...it, qty: newQty, movements: [...(it.movements || []), movement] };
              }));
              logAction('inventory', (purchase as any).stockItemId, 'REVERT_SUPPLY', `Reverted supply ${ (purchase as any).stockQty } due to purchase deletion`);
          }

          setPurchases(prev => prev.filter(p => p.id !== purchaseId));
          logAction('ledger', purchaseId, 'DELETE_PURCHASE', 'Deleted purchase and cleanup ledger');
          showToast('تم حذف المشتريات وتأثيرها المالي بنجاح');
      } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDeleteExpense = (expenseId: string) => {
      const exp = expenses.find(e => e.id === expenseId);
      if (!exp) return;
      try {
          validateOperation(exp.date || getLocalDate(), periodLock);
          if (exp.linkedPurchaseId) {
              setLedger(prev => prev.filter(e => e.entityId !== exp.linkedPurchaseId));
              setPurchases(prev => prev.filter(p => p.id !== exp.linkedPurchaseId));
              logAction('ledger', exp.linkedPurchaseId, 'DELETE_PURCHASE_VIA_EXPENSE', 'Deleted purchase via expense deletion');
          } else {
              setLedger(prev => prev.filter(e => e.entityId !== expenseId));
          }
          setExpenses(prev => prev.filter(e => e.id !== expenseId));
          logAction('ledger', expenseId, 'DELETE_EXPENSE', 'Deleted expense');
          showToast('تم حذف المصروف (والمشتريات المرتبطة) بنجاح');
      } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDeleteSavingPlan = (planId: string) => {
      setSavingPlans(prev => prev.filter(p => p.id !== planId));
      showToast('تم حذف الخطة');
  };

  const handleAddExpense = (newExpense: Expense) => {
      try {
          validateOperation(newExpense.date || getLocalDate(), periodLock);
          const u = getPerformer();
          if (newExpense.type !== 'fixed') {
              const channel = newExpense.paymentMethod || 'cash';
              validateTransaction(ledger, newExpense.amount, channel, newExpense.fromAccountId);
          }
          const entry = createEntry(TransactionType.EXPENSE_OPERATIONAL, newExpense.amount, 'out', newExpense.paymentMethod || 'cash', newExpense.name, newExpense.fromAccountId, newExpense.id, undefined, newExpense.date, undefined, undefined, u.performedById, u.performedByName);
          setLedger(prev => [entry, ...prev]);
          setExpenses(prev => [...prev, { ...newExpense, ...u }]);
          logAction('ledger', entry.id, 'ADD_EXPENSE', `Added expense: ${newExpense.name} (${newExpense.amount})`);
          showToast('تم تسجيل المصروف بنجاح');
      } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleAddPurchase = (newPurchase: Purchase, newExpense?: Expense) => {
      try {
          validateOperation(newPurchase.date, periodLock);
          const u = getPerformer();
          const newEntries: LedgerEntry[] = [];
          if (newPurchase.fundingSource === 'place') {
              const channel = newPurchase.paymentMethod || 'cash';
              validateTransaction(ledger, newPurchase.amount, channel, newPurchase.fromAccountId);
              const entry = createEntry(TransactionType.EXPENSE_PURCHASE, newPurchase.amount, 'out', channel, `شراء: ${newPurchase.name}`, newPurchase.fromAccountId, newPurchase.id, undefined, newPurchase.date, undefined, undefined, u.performedById, u.performedByName);
              newEntries.push(entry);
          } else if (newPurchase.fundingSource === 'partner') {
              const partnerName = GLOBAL_PARTNERS.find(p => p.id === newPurchase.buyer)?.name;
              const methodLabel = newPurchase.paymentMethod === 'bank' ? 'تحويل بنكي' : 'كاش';
              const actualChannel = newPurchase.paymentMethod || 'cash';
              const entry = createEntry(TransactionType.PARTNER_DEPOSIT, newPurchase.amount, 'in', actualChannel, `شراء للمكان: ${newPurchase.name} (${methodLabel})`, undefined, newPurchase.id, newPurchase.buyer, newPurchase.date, undefined, partnerName, u.performedById, u.performedByName);
              newEntries.push(entry);
          }
          setLedger(prev => [...newEntries, ...prev]);
          setPurchases(prev => [...prev, { ...newPurchase, ...u }]);
          if (newExpense) setExpenses(prev => [...prev, { ...newExpense, ...u }]);
          logAction('ledger', newPurchase.id, 'ADD_PURCHASE', `Added purchase: ${newPurchase.name}`);
          showToast('تم تسجيل المشتريات بنجاح');
      } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleAddPlaceLoan = (newLoan: PlaceLoan) => {
      try {
          validateOperation(newLoan.startDate, periodLock);
          const u = getPerformer();
          setPlaceLoans(prev => [...prev, { ...newLoan, ...u }]);
          if (newLoan.loanType === 'operational') {
              const entry = createEntry(TransactionType.LOAN_RECEIPT, newLoan.principal, 'in', newLoan.channel, `استلام دين تشغيلي: ${newLoan.lenderName} (${newLoan.reason})`, newLoan.accountId, newLoan.id, undefined, newLoan.startDate, undefined, undefined, u.performedById, u.performedByName);
              setLedger(prev => [entry, ...prev]);
              logAction('loan', newLoan.id, 'ADD_LOAN_OP', `Added operational loan: ${newLoan.principal}`);
              showToast('تم إضافة الدين التشغيلي وإيداع المبلغ في الرصيد');
          } else {
              logAction('loan', newLoan.id, 'ADD_LOAN_DEV', `Added development loan: ${newLoan.principal}`);
              showToast('تم إضافة الدين التطويري (التزام)');
          }
      } catch(err: any) { showToast(err.message, 'error'); }
  };

  const handlePayLoanInstallment = (updatedLoan: PlaceLoan, newExpense: Expense) => {
      try {
          validateOperation(newExpense.date || getLocalDate(), periodLock);
          const u = getPerformer();
          const channel = newExpense.paymentMethod || 'cash';
          validateTransaction(ledger, newExpense.amount, channel, newExpense.fromAccountId);
          const entry = createEntry(TransactionType.LOAN_REPAYMENT, newExpense.amount, 'out', channel, newExpense.name, newExpense.fromAccountId, newExpense.id, undefined, newExpense.date, undefined, undefined, u.performedById, u.performedByName);
          setLedger(prev => [entry, ...prev]);
          setPlaceLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
          setExpenses(prev => [...prev, { ...newExpense, ...u }]);
          logAction('loan', updatedLoan.id, 'PAY_INSTALLMENT', `Paid ${newExpense.amount} for loan ${updatedLoan.lenderName}`);
          showToast('تم سداد القسط بنجاح');
      } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleAddPartnerDebt = (newDebt: DebtItem) => {
      try {
          validateOperation(newDebt.date, periodLock);
          const u = getPerformer();
          if (newDebt.debtSource === 'place' || !newDebt.debtSource) {
              const channel = newDebt.debtChannel || 'cash';
              const isRepayment = newDebt.amount < 0;
              const absAmount = Math.abs(newDebt.amount);
              if (!isRepayment) validateTransaction(ledger, absAmount, channel, newDebt.bankAccountId);
              const partnerName = GLOBAL_PARTNERS.find(p => p.id === newDebt.partnerId)?.name || 'شريك غير معروف';
              const entry = createEntry(isRepayment ? TransactionType.PARTNER_DEPOSIT : TransactionType.PARTNER_WITHDRAWAL, absAmount, isRepayment ? 'in' : 'out', channel, `${isRepayment ? 'إيداع/سداد' : 'سحب'} شريك: ${newDebt.note}`, newDebt.bankAccountId, newDebt.id, newDebt.partnerId, newDebt.date, undefined, partnerName, u.performedById, u.performedByName);
              setLedger(prev => [entry, ...prev]);
          }
          setDebtsList(prev => [...prev, { ...newDebt, ...u }]);
          logAction('ledger', newDebt.id, 'ADD_PARTNER_DEBT', `Partner debt action: ${newDebt.amount}`);
          showToast('تم تسجيل الحركة بنجاح');
      } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDeletePartnerDebt = (debtId: string) => {
      try {
          const debt = debtsList.find(d => d.id === debtId);
          if (debt) {
             validateOperation(debt.date, periodLock);
             setLedger(prev => prev.filter(e => e.entityId !== debtId));
             logAction('ledger', debtId, 'DELETE_PARTNER_DEBT', `Deleted partner debt/withdrawal`);
          }
          setDebtsList(prev => prev.filter(d => d.id !== debtId));
          showToast('تم حذف السجل بنجاح');
      } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleAddCashTransfer = (newTransfer: CashTransfer) => {
      try {
          validateOperation(newTransfer.date, periodLock);
          const u = getPerformer();
          if (!newTransfer.targetAccountId) throw new Error('يجب تحديد الحساب البنكي المستقبل');
          validateTransaction(ledger, newTransfer.amount, 'cash');
          const partnerName = GLOBAL_PARTNERS.find(p => p.id === newTransfer.partnerId)?.name || 'شريك غير معروف';
          const refId = generateId();
          const outEntry = createEntry(TransactionType.LIQUIDATION_TO_APP, newTransfer.amount, 'out', 'cash', `تسييل إلى التطبيق بواسطة ${partnerName}`, undefined, newTransfer.id, newTransfer.partnerId, newTransfer.date, refId, partnerName, u.performedById, u.performedByName);
          const inEntry = createEntry(TransactionType.LIQUIDATION_TO_APP, newTransfer.amount, 'in', 'bank', `إيداع تسييل من الكاش بواسطة ${partnerName}`, newTransfer.targetAccountId, newTransfer.id, newTransfer.partnerId, newTransfer.date, refId, partnerName, u.performedById, u.performedByName);
          setLedger(prev => [inEntry, outEntry, ...prev]);
          setCashTransfers(prev => [...prev, { ...newTransfer, ...u }]);
          logAction('ledger', refId, 'CASH_TRANSFER', `Liquidation: ${newTransfer.amount} by ${partnerName}`);
          showToast('تم تسييل المبلغ بنجاح');
      } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleManualSaving = (amount: number, channel: 'cash'|'bank', accountId?: string, editingId?: string) => {
      try {
          const date = getLocalDate();
          validateOperation(date, periodLock);
          const u = getPerformer();
          
          if (editingId) {
              setLedger(prev => prev.map(e => {
                  if (e.id === editingId) {
                      return { ...e, amount, channel, accountId, performedById: u.performedById, performedByName: u.performedByName };
                  }
                  return e;
              }));
              showToast('تم تعديل الإيداع بنجاح');
          } else {
              validateTransaction(ledger, amount, channel, accountId);
              const entry = createEntry(TransactionType.SAVING_DEPOSIT, amount, 'out', channel, 'ادخار يدوي', accountId, generateId(), undefined, date, undefined, undefined, u.performedById, u.performedByName);
              setLedger(prev => [entry, ...prev]);
              logAction('savings', entry.id, 'MANUAL_DEPOSIT', `Manual saving: ${amount} from ${channel}`);
              showToast('تم إيداع مبلغ الادخار بنجاح');
          }
      } catch (err: any) { showToast(err.message, 'error'); }
  };

  const onStartNewDay = () => {
      if (systemState.activeCycleId) { showToast('يوجد دورة مفتوحة بالفعل', 'error'); return; }
      const now = new Date().toISOString();
      const newId = generateId();
      setSystemState(prev => ({ ...prev, activeCycleId: newId, currentCycleStartTime: now, currentDate: getLocalDate(), dayStatus: 'open', logs: [...prev.logs, { id: generateId(), type: 'start_cycle', dateTime: now, performedByName: currentUser?.name }] }));
      logAction('system', 'cycle', 'start_cycle', 'تم فتح دورة جديدة');
      showToast('تم فتح الدورة / اليوم بنجاح');
  };

  const onCloseDayAction = () => {
      if (!systemState.activeCycleId) { showToast('لا يوجد دورة يومية مفتوحة للإغلاق', 'error'); return; }
      if (sessions.length > 0) { showToast('تنبيه: يوجد جلسات مفتوحة!', 'error'); return; }
      try {
          const preview = calcEndDayPreviewFromLedger(ledger, systemState.currentCycleStartTime!, bankAccounts, pricingConfig);
          setEndDayData(preview);
          setModals(m => ({ ...m, endDay: true }));
      } catch (e) { showToast('حدث خطأ أثناء تحضير إغلاق اليوم', 'error'); }
  };

  const onInventoryAction = () => {
      try {
          const { entries: savingsEntries, updatedPlans } = processAutoSavings(savingPlans, ledger, getLocalDate());
          setPendingAutoSavings({ entries: savingsEntries, updatedPlans });
          const start = systemState.currentMonth + '-01'; 
          const end = getLocalDate(); 
          setInventoryRange({start, end});
          
          const effectiveLedger = [...savingsEntries, ...ledger];
          const preview = calcLedgerInventory(effectiveLedger, records, start, end, expenses, pricingConfig, 0);
          
          if (preview) { 
              setInventoryPreview(preview); 
              setCurrentMeterReading((pricingConfig.lastMeterReading || 0).toString());
              setElecPaymentChannel('cash'); 
              setElecBankAccountId('');
              setInventoryStep('data'); 
              setModals(m => ({...m, inventory: true})); 
          } 
          else { showToast('حدث خطأ في حساب الجرد', 'error'); }
      } catch (error: any) { showToast(error.message || 'حدث خطأ غير متوقع', 'error'); }
  };

  const handleStartSession = () => {
      if (!newSessionData.name.trim() || !newSessionData.phone.trim()) { showToast('الاسم ورقم الجوال مطلوبان', 'error'); return; }
      if (!systemState.activeCycleId) { showToast('يجب فتح الدورة اليومية أولاً', 'error'); return; }
      if (sessions.some(s => s.customerPhone === newSessionData.phone)) { showToast('هذا الزبون لديه جلسة مفتوحة بالفعل.', 'error'); return; }

      const startTimeIso = mergeDateAndTime(systemState.currentDate, newSessionData.time);
      const sessionId = generateId();
      const u = getPerformer();
      const newSession: Session = { 
          id: sessionId, 
          customerName: newSessionData.name, 
          customerPhone: newSessionData.phone, 
          startTime: startTimeIso, 
          deviceStatus: newSessionData.device, 
          notes: newSessionData.notes, 
          orders: [], events: [], startedById: u.performedById 
      };
      
      const existingCustomer = customers.find(c => c.phone === newSessionData.phone);
      if (newSessionData.isVIP || existingCustomer) {
          const payload = { lastVisit: startTimeIso, isVIP: newSessionData.isVIP || existingCustomer?.isVIP };
          if (existingCustomer) setCustomers(customers.map(c => c.id === existingCustomer.id ? { ...c, ...payload } : c));
          else setCustomers([...customers, { id: generateId(), name: newSessionData.name, phone: newSessionData.phone, isVIP: true, creditBalance: 0, debtBalance: 0, createdAt: new Date().toISOString(), ...payload }]);
      }

      setSessions(prev => [newSession, ...prev]);
      logAction('session', sessionId, 'start_session', `بدء جلسة ${newSession.deviceStatus === 'mobile' ? 'جوال' : 'لابتوب'}`);
      setNewSessionData({ name: '', phone: '', time: getCurrentTimeOnly(), device: 'mobile', notes: '', isVIP: false });
      setModals(m => ({ ...m, addSession: false }));
      showToast('تم بدء الجلسة');
  };

  const handleDeviceChange = (sessionId: string, newDevice: DeviceStatus) => {
      const u = getPerformer();
      setSessions(prev => prev.map(s => {
          if (s.id !== sessionId || s.deviceStatus === newDevice) return s;
          const now = new Date().toISOString();
          const newEvent = { 
              id: generateId(), type: 'device_change' as const, timestamp: now, 
              fromDevice: s.deviceStatus, toDevice: newDevice, performedById: u.performedById 
          };
          logAction('session', s.id, 'device_change', `تغيير الجهاز`);
          return { ...s, deviceStatus: newDevice, events: [...(s.events || []), newEvent] };
      }));
      showToast(`تم تغيير الجهاز`);
  };

  const handleUndoEvent = (sessionId: string) => {
      setSessions(prev => prev.map(s => {
          if (s.id !== sessionId || !s.events || s.events.length === 0) return s;
          const lastEvent = s.events[s.events.length - 1];
          return { ...s, deviceStatus: lastEvent.fromDevice, events: s.events.slice(0, -1) };
      }));
      logAction('session', sessionId, 'undo_event', 'تراجع عن تغيير الجهاز');
      showToast('تم التراجع عن آخر تغيير');
  };

  const handleCompleteCheckout = () => {
    if (!checkoutData.session || !checkoutFinancials) return;
    if (!systemState.activeCycleId) { showToast('لا يمكن إنهاء الجلسة. النظام مغلق.', 'error'); return; }
    const endTimeIso = mergeDateAndTime(systemState.currentDate, checkoutData.time);
    const nowIso = new Date().toISOString();
    const dateKey = systemState.currentDate;
    const u = getPerformer();
    
    try { validateOperation(dateKey, periodLock); } catch(err: any) { showToast(err.message, 'error'); return; }

    const { totalDue, paidAmount, appliedCredit, createdDebt, createdCredit, settledDebt, finalCredit, finalDebt, isFullyPaid } = checkoutFinancials;
    const paidCash = parseFloat(checkoutData.cash) || 0;
    const paidBank = parseFloat(checkoutData.bank) || 0;

    const transactions: Transaction[] = [];
    const newEntries: LedgerEntry[] = [];
    
    if (paidCash > 0) {
         newEntries.push(createEntry(TransactionType.INCOME_SESSION, paidCash, 'in', 'cash', `إيراد: ${checkoutData.session.customerName}`, undefined, checkoutData.session.id, undefined, dateKey, undefined, undefined, u.performedById, u.performedByName));
         transactions.push({ id: generateId(), date: nowIso, amount: paidCash, type: 'cash' });
    }

    if (paidBank > 0) {
        const bankDesc = `إيراد: ${checkoutData.session.customerName}`;
        const entry = createEntry(TransactionType.INCOME_SESSION, paidBank, 'in', 'bank', bankDesc, checkoutData.bankAccountId, checkoutData.session!.id, undefined, dateKey, undefined, undefined, u.performedById, u.performedByName);
        entry.senderName = checkoutData.senderAccountName;
        entry.senderPhone = checkoutData.senderPhone; 
        entry.transferStatus = 'rejected'; 
        newEntries.push(entry);
        transactions.push({ id: generateId(), date: nowIso, amount: paidBank, type: 'bank', bankAccountId: checkoutData.bankAccountId, senderPhone: checkoutData.senderPhone, senderAccountName: checkoutData.senderAccountName });
    }

    if (createdDebt > 0) newEntries.push(createEntry(TransactionType.DEBT_CREATE, createdDebt, 'in', 'receivable', `دين: ${checkoutData.session.customerName}`, undefined, checkoutData.session.id, undefined, dateKey, undefined, undefined, u.performedById, u.performedByName));
    if (appliedCredit > 0) transactions.push({ id: generateId(), date: nowIso, amount: appliedCredit, type: 'credit_usage', note: 'خصم من الرصيد السابق' });

    setLedger(prev => [...newEntries, ...prev]);

    const sessionPhone = checkoutData.session.customerPhone;
    const existingCustomer = customers.find(c => c.phone === sessionPhone);
    const updatePayload = { creditBalance: finalCredit, debtBalance: finalDebt, isVIP: existingCustomer?.isVIP || finalCredit > 0 || finalDebt > 0, lastVisit: nowIso };

    if (existingCustomer) setCustomers(prev => prev.map(c => c.id === existingCustomer.id ? { ...c, ...updatePayload } : c));
    else if (sessionPhone) setCustomers(prev => [...prev, { id: generateId(), name: checkoutData.session.customerName, phone: sessionPhone, isVIP: finalCredit > 0 || finalDebt > 0, createdAt: nowIso, notes: '', ...updatePayload }]);

    logAction('session', checkoutData.session.id, 'checkout', `إغلاق الفاتورة: ${totalDue} | مدفوع: ${paidAmount} (كاش: ${paidCash}, بنك: ${paidBank})`);

    const newRecord: Record = {
        id: checkoutData.session.id,
        customerName: checkoutData.session.customerName,
        customerPhone: checkoutData.session.customerPhone,
        startTime: checkoutData.session.startTime,
        endTime: endTimeIso,
        durationMinutes: checkoutFinancials.durationMinutes!,
        sessionInvoice: checkoutFinancials.sessionInvoice!,
        drinksInvoice: checkoutFinancials.drinksInvoice!,
        internetCardsInvoice: checkoutFinancials.internetCardsInvoice!,
        totalInvoice: totalDue,
        totalDue: totalDue,
        discountApplied: checkoutFinancials.discountApplied,
        placeCost: checkoutFinancials.placeCost!,
        drinksCost: checkoutFinancials.drinksCost!,
        internetCardsCost: checkoutFinancials.internetCardsCost!,
        grossProfit: checkoutFinancials.grossProfit!,
        devPercentSnapshot: checkoutFinancials.devPercentSnapshot!,
        devCut: checkoutFinancials.devCut!,
        netProfit: checkoutFinancials.netProfit!,
        paymentStatus: isFullyPaid ? 'paid' : 'customer_debt',
        isPaid: isFullyPaid,
        cashPaid: paidCash,
        bankPaid: paidBank,
        creditApplied: appliedCredit,
        createdDebt: createdDebt,
        createdCredit: createdCredit,
        settledDebt: settledDebt,
        bankAccountId: checkoutData.bankAccountId,
        bankAccountNameSnapshot: bankAccounts.find(b => b.id === checkoutData.bankAccountId)?.name,
        senderPhone: checkoutData.senderPhone,
        senderAccountName: checkoutData.senderAccountName,
        transactions: transactions,
        paidTotal: paidAmount + appliedCredit, 
        remainingDebt: createdDebt, 
        lastPaymentDate: paidAmount > 0 ? nowIso : undefined,
        excuse: checkoutData.excuse,
        timestamp: Date.now(),
        orders: checkoutData.session.orders,
        deviceStatus: checkoutData.session.deviceStatus,
        hourlyRateSnapshot: checkoutFinancials.hourlyRateSnapshot!,
        placeCostRateSnapshot: checkoutFinancials.placeCostRateSnapshot!,
        events: checkoutData.session.events,
        segmentsSnapshot: checkoutFinancials.segmentsSnapshot,
        performedById: u.performedById,
        performedByName: u.performedByName
    };

    setRecords(prev => [newRecord, ...prev]);
    setSessions(prev => prev.filter(s => s.id !== checkoutData.session!.id));
    setModals({ ...modals, checkout: false });
    showToast(`تم حفظ الجلسة.`);
  };

  const handleRepayDebt = (recordId: string, amount: number, type: 'cash'|'bank', details?: any) => {
      try {
          if (amount <= 0) { showToast('المبلغ يجب أن يكون أكبر من صفر', 'error'); return; }
          validateOperation(getLocalDate(), periodLock);
          if (!systemState.activeCycleId) { showToast('النظام مغلق', 'error'); return; }
          const u = getPerformer();
          
          const record = records.find(r => r.id === recordId);
          if (!record) return;
          const customer = customers.find(c => c.phone === record.customerPhone);
          if (!customer) return;

          const remaining = customer.debtBalance;
          const applied = Math.min(amount, remaining);
          const extra = Math.max(amount - remaining, 0);

          const newEntries: LedgerEntry[] = [];
          
          if (applied > 0) {
              const entry = createEntry(TransactionType.DEBT_PAYMENT, applied, 'in', type, 'DebtPayment', type === 'bank' ? details.bankAccountId : undefined, recordId, undefined, getLocalDate(), undefined, undefined, u.performedById, u.performedByName);
              if (type === 'bank') {
                  entry.senderName = details.senderAccountName;
                  entry.senderPhone = details.senderPhone;
                  entry.transferStatus = 'rejected';
              }
              newEntries.push(entry);
          }
          if (extra > 0) {
              const entry = createEntry(TransactionType.INCOME_SESSION, extra, 'in', type, 'CreditTopUp', type === 'bank' ? details.bankAccountId : undefined, recordId, undefined, getLocalDate(), undefined, undefined, u.performedById, u.performedByName);
              if (type === 'bank') {
                  entry.senderName = details.senderAccountName;
                  entry.senderPhone = details.senderPhone;
                  entry.transferStatus = 'rejected';
              }
              newEntries.push(entry);
          }
          
          setLedger(prev => [...newEntries, ...prev]);

          setCustomers(curr => curr.map(c => c.id === customer.id ? { ...c, debtBalance: Math.max(0, remaining - applied), creditBalance: c.creditBalance + extra } : c));
          setRecords(prev => prev.map(r => {
              if (r.id !== recordId) return r;
              const newTx: Transaction = { id: generateId(), date: new Date().toISOString(), amount, type, ...details, note: 'سداد دين' };
              const newPaidTotal = (r.paidTotal || 0) + amount;
              const newRemainingDebt = Math.max(0, r.totalInvoice - newPaidTotal);
              return { ...r, transactions: [...(r.transactions||[]), newTx], paidTotal: newPaidTotal, remainingDebt: newRemainingDebt, isPaid: newRemainingDebt < 0.5, cashPaid: type==='cash' ? r.cashPaid + amount : r.cashPaid, bankPaid: type==='bank' ? r.bankPaid + amount : r.bankPaid };
          }));
          
          logAction('record', recordId, 'DEBT_PAYMENT', `سداد دين بقيمة ${amount} (${type})`);
          showToast('تم تسجيل العملية بنجاح');
      } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleConfirmEndDay = () => {
      if (!endDayData || !systemState.activeCycleId) return;
      const u = getPerformer();
      const cycle: DayCycle = { id: systemState.activeCycleId, dateKey: systemState.currentDate, monthKey: systemState.currentMonth, startTime: systemState.currentCycleStartTime!, endTime: new Date().toISOString(), ...endDayData, notes: endDayNotes, createdAt: Date.now(), closedById: u.performedById };
      setDayCycles(prev => [...prev, cycle]);
      setSystemState(prev => ({ ...prev, activeCycleId: null, currentCycleStartTime: null, dayStatus: 'closed', logs: [...prev.logs, { id: generateId(), type: 'close_cycle', dateTime: new Date().toISOString(), performedByName: u.performedByName }] }));
      logAction('system', systemState.activeCycleId, 'close_cycle', 'إغلاق الدورة اليومية');
      setModals(m => ({ ...m, endDay: false }));
      showToast('تم إغلاق الدورة. يمكنك بدء دورة جديدة الآن.');
  };

  const handleArchiveInventory = (applyToGround: boolean = false) => {
      if (!inventoryPreview) return;
      const u = getPerformer();

      if (pendingAutoSavings && pendingAutoSavings.entries.length > 0) {
          setLedger(prev => [...pendingAutoSavings.entries, ...prev]);
          setSavingPlans(pendingAutoSavings.updatedPlans);
          logAction('system', 'inventory', 'auto_savings', `Applied ${pendingAutoSavings.entries.length} auto saving entries`);
      }

      // Handle Electricity Expense Entry
      if (inventoryPreview.electricityCost > 0) {
          const elecEntry = createEntry(
              TransactionType.EXPENSE_OPERATIONAL,
              inventoryPreview.electricityCost,
              'out',
              elecPaymentChannel,
              `تكلفة كهرباء (قراءة: ${inventoryPreview.endMeterReading})`,
              elecPaymentChannel === 'bank' ? elecBankAccountId : undefined,
              generateId(),
              undefined,
              inventoryRange.end,
              undefined, undefined,
              u.performedById, u.performedByName
          );
          setLedger(prev => [elecEntry, ...prev]);
      }

      // Update Meter Reading in Settings
      const newMeterReading = inventoryPreview.endMeterReading;
      setPricingConfig(prev => ({
          ...prev,
          lastMeterReading: newMeterReading
      }));

      const snap: InventorySnapshot = { 
          id: generateId(), 
          type: 'manual', 
          archiveId: `INV-${new Date().getFullYear()}-${inventorySnapshots.length+1}`, 
          ...inventoryPreview, 
          performedById: u.performedById,
          electricityPaymentChannel: elecPaymentChannel,
          electricityBankAccountId: elecPaymentChannel === 'bank' ? elecBankAccountId : undefined
      };
      setInventorySnapshots(prev => [...prev, snap]);
      
      const lock: PeriodLock = { lockedUntil: inventoryRange.end, lockId: generateId(), createdAt: new Date().toISOString(), notes: 'Auto-locked after inventory archive', performedById: u.performedById };
      setPeriodLock(lock);
      
      logAction('system', 'inventory', applyToGround ? 'archive_and_reset' : 'archive_month', `أرشفة ${applyToGround ? 'وتصفير' : 'يدوية'} للفترة ${inventoryRange.start} - ${inventoryRange.end}. تم قفل الفترة وتحديث عداد الكهرباء.`);

      // --- APPLY TO GROUND: RESET TRANSACTIONAL DATA ---
      if (applyToGround) {
          setLedger([]);
          setRecords([]);
          setPurchases([]);
          setExpenses([]);
          setDebtsList([]);
          setCashTransfers([]);
          setDayCycles([]);
          setCustomers(customers.map(c => ({ ...c, debtBalance: 0, creditBalance: 0, lastVisit: undefined })));
          logAction('system', 'inventory', 'ground_reset', 'تم تصفير البيانات التشغيلية (تطبيق الأرباح على أرض الواقع)');
          showToast('تمت الأرشفة وتطبيق تصفية الحسابات بنجاح');
      } else {
          showToast('تم الأرشفة وتطبيق الخصومات وقفل الفترة وتحديث العداد.');
      }
      
      setPendingAutoSavings(null);
      setInventoryStep('data');
      setModals(m => ({...m, inventory: false, inventoryConfirm: false}));
  };

  const handleSaveOrder = () => { 
      if (!orderData.target) return;
      const targetDate = 'durationMinutes' in orderData.target ? (orderData.target as Record).endTime.split('T')[0] : systemState.currentDate;
      try { validateOperation(targetDate, periodLock); } catch (e: any) { showToast(e.message, 'error'); return; }

      const qty = parseInt(orderData.qty) || 1;
      let price=0, cost=0, name='';
      
      if(orderData.type==='drink') {
          const d = drinks.find(x=>x.id===orderData.itemId);
          if(!d) { showToast('المشروب غير موجود', 'error'); return; }
          
          if (d.components && d.components.length > 0) {
              const missingItems: string[] = [];
              for (const comp of d.components) {
                  const invItem = inventoryItems.find(i => i.id === comp.itemId);
                  const needed = comp.qty * qty;
                  if (!invItem || invItem.qty < needed) {
                      missingItems.push(invItem?.name || 'مادة غير معروفة');
                  }
              }
              
              if (missingItems.length > 0) {
                  showToast(`لا يمكن إضافة الطلب! نقص في: ${missingItems.join('، ')}`, 'error');
                  return; 
              }
          }

          name = d.name;
          if(orderData.size==='small') { price=d.smallPrice||0; }
          else { price=d.largePrice||0; }
          cost = calculateDrinkCost(d, inventoryItems);
      } else if (orderData.type === 'internet_card') {
          const c = internetCards.find(x=>x.id===orderData.itemId);
          if(!c) { showToast('الصنف غير موجود', 'error'); return; }
          
          if (c.inventoryItemId) {
              const invItem = inventoryItems.find(i => i.id === c.inventoryItemId);
              if (!invItem || invItem.qty < qty) {
                  showToast(`لا يمكن إضافة الطلب! نقص في المخزون لـ: ${invItem?.name || 'البطاقة'}`, 'error');
                  return; 
              }
          }
          
          name = c.name; price=c.price; cost=c.cost;
      }
      
      const newOrder: Order = { id: orderData.orderIdToEdit || generateId(), type: orderData.type, itemId: orderData.itemId, itemName: name, size: orderData.type==='drink'?orderData.size:undefined, priceAtOrder: price, costAtOrder: cost, quantity: qty, timestamp: mergeDateAndTime(systemState.currentDate, orderData.time) };
      
      const now = new Date().toISOString();
      const isEdit = !!orderData.orderIdToEdit;
      let oldQty = 0;
      if (isEdit) {
          const targetOrders = ('durationMinutes' in orderData.target) ? (orderData.target as Record).orders : (orderData.target as Session).orders;
          const existing = targetOrders.find(o => o.id === orderData.orderIdToEdit);
          if (existing) oldQty = existing.quantity;
      }
      const deltaQty = qty - oldQty; 

      if (orderData.type === 'drink') {
          const d = drinks.find(x => x.id === orderData.itemId);
          if (d && d.components && d.components.length > 0 && deltaQty !== 0) {
              setInventoryItems(prevItems => {
                  return prevItems.map(invItem => {
                      const component = d.components?.find(c => c.itemId === invItem.id);
                      if (component) {
                          const amountChange = component.qty * deltaQty; 
                          const newQty = (invItem.qty || 0) - amountChange;
                          const movement: InventoryMovement = { id: generateId(), date: now, qty: Math.abs(amountChange), type: 'out' as const, notes: `${isEdit ? 'تعديل طلب' : 'طلب مشروب'}: ${d.name} (فاتورة: ${orderData.target?.customerName})` };
                          logAction('inventory', invItem.id, amountChange > 0 ? 'DEDUCTION' : 'RESTORE', `${amountChange > 0 ? 'خصم' : 'استرجاع'} آلي: ${Math.abs(amountChange)} بسبب ${isEdit ? 'تعديل' : 'طلب'} ${d.name}`);
                          return { ...invItem, qty: newQty, movements: [...(invItem.movements || []), movement] };
                      }
                      return invItem;
                  });
              });
          }
      } else if (orderData.type === 'internet_card') {
          const c = internetCards.find(x => x.id === orderData.itemId);
          if (c && c.inventoryItemId && deltaQty !== 0) {
              setInventoryItems(prevItems => {
                  return prevItems.map(invItem => {
                      if (invItem.id === c.inventoryItemId) {
                          const amountChange = deltaQty;
                          const newQty = (invItem.qty || 0) - amountChange;
                          const movement: InventoryMovement = { id: generateId(), date: now, qty: Math.abs(amountChange), type: 'out' as const, notes: `${isEdit ? 'تعديل بيع بطاقة' : 'بيع بطاقة'}: ${c.name} (فاتورة: ${orderData.target?.customerName})` };
                          logAction('inventory', invItem.id, amountChange > 0 ? 'DEDUCTION' : 'RESTORE', `${amountChange > 0 ? 'خصم' : 'استرجاع'} آلي: ${Math.abs(amountChange)} بسبب ${isEdit ? 'تعديل' : 'بيع'} بطاقة ${c.name}`);
                          return { ...invItem, qty: newQty, movements: [...(invItem.movements || []), movement] };
                      }
                      return invItem;
                  });
              });
          }
      }

      logAction('session', orderData.target.id, orderData.orderIdToEdit ? 'edit_order' : 'add_order', `${orderData.orderIdToEdit ? 'تعديل' : 'إضافة'} طلب: ${name} (${qty})`);

      if('durationMinutes' in orderData.target) {
          setRecords(prev => prev.map(r => {
              if(r.id!==orderData.target!.id) return r;
              const ords = orderData.orderIdToEdit ? r.orders.map(o=>o.id===orderData.orderIdToEdit?newOrder:o) : [...r.orders, newOrder];
              const fins = calcRecordFinancials(r as any, r.endTime, pricingConfig, ords, r.discountApplied);
              return { ...r, ...fins, orders: ords, totalInvoice: fins.totalInvoice||0, remainingDebt: Math.max(0, (fins.totalInvoice||0) - r.paidTotal) };
          }));
      } else {
          setSessions(prev => prev.map(s => s.id===orderData.target!.id ? { ...s, orders: orderData.orderIdToEdit ? s.orders.map(o=>o.id===orderData.orderIdToEdit?newOrder:o) : [...s.orders, newOrder] } : s));
      }
      setModals(m=>({...m, addOrder:false})); showToast('تم حفظ الطلب وخصم من المخزون بنجاح');
  };

  const handleEditOrder = (s: Session | Record, o: Order) => {
      setOrderData({ target: s, orderIdToEdit: o.id, type: o.type, itemId: o.itemId, size: o.size||'small', qty: o.quantity.toString(), time: new Date(o.timestamp).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) });
      setModals(m=>({...m, addOrder:true}));
  };

  const handleDeleteOrder = (target: any, orderId: string) => {
    const targetDate = 'durationMinutes' in target ? (target as Record).endTime.split('T')[0] : systemState.currentDate;
    try { validateOperation(targetDate, periodLock); } catch(e: any) { showToast(e.message, 'error'); return; }
    logAction('session', target.id, 'delete_order', `حذف طلب ${orderId}`);

    const now = new Date().toISOString();
    const targetOrders = ('durationMinutes' in target) ? (target as Record).orders : (target as Session).orders;
    const orderToDelete = targetOrders.find((o: Order) => o.id === orderId);
    if (orderToDelete) {
        if (orderToDelete.type === 'drink') {
            const d = drinks.find(x => x.id === orderToDelete.itemId);
            if (d && d.components && d.components.length > 0) {
                setInventoryItems(prevItems => prevItems.map(invItem => {
                    const comp = d.components?.find(c => c.itemId === invItem.id);
                    if (!comp) return invItem;
                    const restoreQty = comp.qty * orderToDelete.quantity;
                    const newQty = (invItem.qty || 0) + restoreQty;
                    const movement = { id: generateId(), date: now, qty: restoreQty, type: 'in' as const, notes: `استرجاع بسبب حذف طلب: ${d.name}` };
                    logAction('inventory', invItem.id, 'RESTORE', `استرجاع ${restoreQty} بسبب حذف طلب ${d.name}`);
                    return { ...invItem, qty: newQty, movements: [...(invItem.movements || []), movement] };
                }));
            }
        } else if (orderToDelete.type === 'internet_card') {
            const c = internetCards.find(x => x.id === orderToDelete.itemId);
            if (c && c.inventoryItemId) {
                setInventoryItems(prevItems => prevItems.map(invItem => {
                    if (invItem.id !== c.inventoryItemId) return invItem;
                    const restoreQty = orderToDelete.quantity;
                    const newQty = (invItem.qty || 0) + restoreQty;
                    const movement = { id: generateId(), date: now, qty: restoreQty, type: 'in' as const, notes: `استرجاع بطاقة: ${c.name} عند حذف طلب` };
                    logAction('inventory', invItem.id, 'RESTORE', `استرجاع ${restoreQty} بطاقة ${c.name} بسبب حذف الطلب`);
                    return { ...invItem, qty: newQty, movements: [...(invItem.movements || []), movement] };
                }));
            }
        }
    }

    if ('durationMinutes' in target) {
        const record = target as Record;
        const updatedOrders = record.orders.filter(o => o.id !== orderId);
        const fins = calcRecordFinancials(record, record.endTime, pricingConfig, updatedOrders, record.discountApplied);
        
        const oldTotalInvoice = record.totalInvoice;
        const newTotalInvoice = fins.totalInvoice || 0;
        const paidTotal = record.paidTotal || 0;

        const oldRecordDebt = Math.max(0, oldTotalInvoice - paidTotal);
        const newRecordDebt = Math.max(0, newTotalInvoice - paidTotal);
        const debtReduction = oldRecordDebt - newRecordDebt;

        const oldExcess = Math.max(0, paidTotal - oldTotalInvoice);
        const newExcess = Math.max(0, paidTotal - newTotalInvoice);
        const creditIncrease = newExcess - oldExcess;

        setRecords(prev => prev.map(r => {
            if (r.id !== target.id) return r;
            return { 
                ...r, 
                ...fins, 
                orders: updatedOrders, 
                totalInvoice: newTotalInvoice, 
                remainingDebt: newRecordDebt,
                isPaid: newRecordDebt < 0.5 
            };
        }));

        if (debtReduction > 0 || creditIncrease > 0) {
            const customer = customers.find(c => c.phone === record.customerPhone);
            if (customer) {
                setCustomers(prev => prev.map(c => {
                    if (c.id === customer.id) {
                        return {
                            ...c,
                            debtBalance: Math.max(0, c.debtBalance - debtReduction),
                            creditBalance: c.creditBalance + creditIncrease
                        };
                    }
                    return c;
                }));
            }
        }
    } else {
        setSessions(prev => prev.map(s => s.id===target.id ? { ...s, orders: s.orders.filter(o => o.id !== orderId) } : s));
    }
    showToast('تم حذف الطلب وتحديث الحسابات');
  };

  const handleUpdateProfile = async () => {
      if (!profileData.name || !profileData.username) {
          showToast('الاسم واسم المستخدم مطلوبان', 'error');
          return;
      }
      const updated = {
          ...currentUser!, 
          name: profileData.name,
          username: profileData.username,
          password: profileData.password || undefined 
      };
      await updateUser(updated);
      setModals(prev => ({...prev, profile: true}));
      showToast('تم تحديث الملف الشخصي');
  };

  return (
    <Layout 
        activeView={activeView} 
        onNavigate={setActiveView} 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
        daysSinceBackup={daysSinceBackup}
        currentUser={currentUser}
        onLogout={logout}
        onEditProfile={() => {
            setProfileData({ name: currentUser!.name, username: currentUser!.username, password: '' });
            setModals(prev => ({...prev, profile: true}));
        }}
    >
       {toast && <Toast msg={toast.msg} type={toast.type} />}
       
       {integrityErrors.length > 0 && (
           <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-pulse-slow">
               <AlertTriangle className="text-red-600 shrink-0 mt-1" size={24} />
               <div>
                   <h3 className="text-red-800 font-bold text-lg">تنبيه: مشاكل في سلامة البيانات</h3>
                   <ul className="list-disc list-inside text-sm text-red-700 mt-1">{integrityErrors.map((err, i) => <li key={i}>{err}</li>)}</ul>
               </div>
           </div>
       )}

       {periodLock && (
           <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
               <div className="flex items-center gap-2 text-amber-800 text-sm font-bold"><Lock size={16}/> <span>النظام مغلق للعمليات قبل: {periodLock.lockedUntil}</span></div>
               {currentUser!.role === 'admin' && <button onClick={() => setPeriodLock(null)} className="text-xs text-amber-600 underline">فتح القفل (Admin)</button>}
           </div>
       )}
       
       {activeView === 'dashboard' && <Dashboard 
          sessions={sessions} 
          records={records}
          dayCycles={dayCycles}
          onAddCustomer={() => { setCustomerSearch(''); setNewSessionData({name:'', phone:'', time: getCurrentTimeOnly(), device:'mobile', notes:'', isVIP: false}); setModals(prev => ({...prev, addSession: true})); }} 
          onCheckout={(s) => { setCheckoutData({ session: s, time: getCurrentTimeOnly(), cash: '', bank: '', bankAccountId: '', senderPhone: s.customerPhone || '', senderAccountName: s.customerName || '', excuse: '', discount: undefined }); setModals({...modals, checkout: true}); }} 
          onAddDrink={(s) => { setOrderData({target:s, orderIdToEdit:null, type:'drink', itemId:'', size:'small', qty:'1', time:getCurrentTimeOnly(), lockType: true}); setModals(m=>({...m, addOrder:true})); }} 
          onAddCard={(s) => { setOrderData({target:s, orderIdToEdit:null, type:'internet_card', itemId:'', size:'small', qty:'1', time:getCurrentTimeOnly(), lockType: true}); setModals(m=>({...m, addOrder:true})); }} 
          onEditOrder={handleEditOrder} 
          onDeleteOrder={(s, oid) => handleDeleteOrder(s, oid)} 
          onDeviceChange={handleDeviceChange}
          onUndoEvent={handleUndoEvent}
          onNavigate={setActiveView} 
          systemState={systemState} 
          onStartNewDay={onStartNewDay} 
          onCloseDay={onCloseDayAction} 
          onInventory={onInventoryAction} 
          customers={customers} 
          pricingConfig={pricingConfig}
          onViewAudit={() => setModals(m => ({ ...m, audit: true }))} 
          ledger={ledger}
          currentUser={currentUser}
       />}
       
       {activeView === 'partners' && <PartnersPage snapshots={inventorySnapshots} purchases={purchases} debts={debtsList} placeLoans={placeLoans} cashTransfers={cashTransfers} ledger={ledger} />} 
       {activeView === 'liabilities' && (
           <LiabilitiesPage 
                loans={placeLoans} onUpdateLoans={setPlaceLoans} onAddLoan={handleAddPlaceLoan} onPayInstallment={handlePayLoanInstallment} 
                expenses={expenses} onUpdateExpenses={setExpenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense}
                savingPlans={savingPlans} onUpdateSavingPlans={setSavingPlans} onManualSaving={handleManualSaving} onDeleteSavingPlan={handleDeleteSavingPlan}
                ledger={ledger} onUpdateLedger={setLedger}
                bankAccounts={bankAccounts} purchases={purchases} onUpdatePurchases={setPurchases} onAddPurchase={handleAddPurchase} onDeletePurchase={handleDeletePurchase}
             inventoryItems={inventoryItems} setInventoryItems={setInventoryItems}
            />
        )}
       
       {activeView === 'records' && (
           <RecordsList records={records} dailyClosings={dailyClosings} bankAccounts={bankAccounts} onRepayDebt={handleRepayDebt} systemState={systemState} onStartNewDay={onStartNewDay} onEditOrder={handleEditOrder} onDeleteOrder={(r, oid) => handleDeleteOrder(r, oid)} onCloseDay={onCloseDayAction} />
        )}
       {activeView === 'cost_analysis' && <CostAnalysis dayCycles={dayCycles} systemState={systemState} onInventory={onInventoryAction} ledger={ledger} records={records} />} 
       {activeView === 'treasury' && (
           <TreasuryPage 
                records={records} accounts={bankAccounts} onUpdateAccounts={setBankAccounts} cashTransfers={cashTransfers} onUpdateCashTransfers={setCashTransfers}
                expenses={expenses} purchases={purchases} debtsList={debtsList} pricingConfig={pricingConfig} placeLoans={placeLoans} systemState={systemState} onAddTransfer={handleAddCashTransfer} ledger={ledger} onUpdateLedger={setLedger}
            />
       )}
       {activeView === 'vip_customers' && <VipCustomersPage customers={customers} onUpdateCustomers={setCustomers} />}
    {activeView === 'drinks' && <DrinksPage drinks={drinks} onAdd={d => setDrinks([...drinks, d])} onUpdate={d => setDrinks(drinks.map(x=>x.id===d.id?d:x))} onDelete={id => setDrinks(drinks.filter(d=>d.id!==id))} inventoryItems={inventoryItems} />}
       {activeView === 'inventory' && (
           <InventoryPage 
               inventoryItems={inventoryItems} 
               setInventoryItems={setInventoryItems} 
               logAction={logAction} 
               currentUser={currentUser} 
               ledger={ledger}
               setLedger={setLedger}
               bankAccounts={bankAccounts}
           />
       )}
       {activeView === 'internet_cards' && <InternetCardsPage cards={internetCards} onAdd={c => setInternetCards([...internetCards, c])} onUpdate={c => setInternetCards(internetCards.map(x=>x.id===c.id?c:x))} onDelete={id => setInternetCards(internetCards.filter(c=>c.id!==id))} />}
       {activeView === 'partner_debts' && <PartnerDebtsPage debtsList={debtsList} onUpdateDebtsList={setDebtsList} bankAccounts={bankAccounts} onAddDebt={handleAddPartnerDebt} onDeleteDebt={handleDeletePartnerDebt} />}
       {activeView === 'profit_dist' && <ProfitDistribution records={records} purchases={purchases} debtsList={debtsList} expenses={expenses} pricingConfig={pricingConfig} placeLoans={placeLoans} ledger={ledger} />}
       {activeView === 'inventory_archive' && (
           <InventoryArchive snapshots={inventorySnapshots} onUpdateSnapshots={setInventorySnapshots} records={records} expenses={expenses} purchases={purchases} debtsList={debtsList} pricingConfig={pricingConfig} placeLoans={placeLoans} onDelete={(id) => setInventorySnapshots(inventorySnapshots.filter(s => s.id !== id))} systemState={systemState} ledger={ledger} />
       )}
       {activeView === 'settings' && <Settings pricingConfig={pricingConfig} onUpdatePricing={setPricingConfig} />}
       {activeView === 'ledger_viewer' && <LedgerViewerPage ledger={ledger} />}
       {activeView === 'audit_log' && <AuditLogPage logs={auditLogs} />}
       {activeView === 'backup_restore' && <BackupRestorePage onBackupComplete={handleBackupComplete} />}
       
       {activeView === 'users' && currentUser!.role === 'admin' && (
           <UsersPage users={users} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser} currentUser={currentUser!} />
       )}
       
       <Modal isOpen={modals.addSession} onClose={() => setModals(prev => ({...prev, addSession: false}))} title="جلسة جديدة" description="تسجيل دخول زبون جديد">
           <div className="space-y-4">
               <div className="relative mb-2">
                   <div className="relative">
                       <Search className="absolute right-3 top-3 text-gray-400" size={16} />
                       <input type="text" placeholder="بحث عن زبون مسجل (اسم أو جوال)..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pr-10 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                   </div>
                   {filteredCustomers.length > 0 && (
                       <div className="absolute z-20 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-40 overflow-y-auto">
                           {filteredCustomers.map(c => (
                               <div key={c.id} onClick={() => { setNewSessionData(prev => ({...prev, name: c.name, phone: c.phone, isVIP: c.isVIP, notes: c.notes || ''})); setCustomerSearch(''); }} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center">
                                   <div><div className="font-bold text-sm text-gray-800">{c.name}</div><div className="text-xs text-gray-500">{c.phone}</div></div>
                                   {c.isVIP && <Star size={14} className="text-yellow-500 fill-yellow-500"/>}
                               </div>
                           ))}
                       </div>
                   )}
               </div>
               <FormInput label="اسم الزبون" placeholder="الاسم" value={newSessionData.name} onChange={e => setNewSessionData({...newSessionData, name: e.target.value})} />
               <FormInput label="رقم الجوال" type="tel" placeholder="05xxxxxxxx" value={newSessionData.phone} onChange={e => setNewSessionData({...newSessionData, phone: e.target.value})} />
               <FormInput label="وقت الدخول" type="time" value={newSessionData.time} onChange={e => setNewSessionData({...newSessionData, time: e.target.value})} />
               <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                   <label className="block text-sm font-bold text-gray-800 mb-2">نوع الجهاز</label>
                   <div className="flex gap-2">
                       <button onClick={() => setNewSessionData({...newSessionData, device: 'mobile'})} className={`flex-1 py-2 text-sm font-bold rounded ${newSessionData.device === 'mobile' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>جوال فقط</button>
                       <button onClick={() => setNewSessionData({...newSessionData, device: 'laptop'})} className={`flex-1 py-2 text-sm font-bold rounded ${newSessionData.device === 'laptop' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}>لابتوب</button>
                   </div>
               </div>
               <div className="flex items-center gap-2 cursor-pointer" onClick={() => setNewSessionData({...newSessionData, isVIP: !newSessionData.isVIP})}>
                   <input type="checkbox" checked={newSessionData.isVIP} onChange={() => {}} className="w-5 h-5 accent-indigo-600" />
                   <span className="text-sm font-bold text-gray-800">زبون مميز (VIP)</span>
               </div>
               <FormInput label="ملاحظات" placeholder="اختياري" value={newSessionData.notes} onChange={e => setNewSessionData({...newSessionData, notes: e.target.value})} />
               <div className="flex justify-end gap-3 pt-2">
                   <Button variant="secondary" onClick={() => setModals(prev => ({...prev, addSession: false}))}>إلغاء</Button>
                   <Button onClick={handleStartSession}>بدء الجلسة</Button>
               </div>
           </div>
       </Modal>

       <Modal isOpen={modals.checkout} onClose={() => setModals({...modals, checkout: false})} title="إغلاق الحساب" description="تفاصيل الفاتورة والدفع">
            {checkoutData.session && checkoutFinancials && (
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-2 px-2"><h3 className="font-bold text-gray-900">{checkoutData.session.customerName}</h3><span className="text-sm font-bold bg-white px-2 py-1 rounded border">{formatDuration(checkoutFinancials.durationMinutes || 0)}</span></div>
                        {checkoutData.session.events && checkoutData.session.events.length > 0 && (
                           <div className="mb-4 bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                               <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><ArrowRightLeft size={12}/> سجل التنقلات</p>
                               <div className="space-y-2 text-xs relative before:absolute before:right-1.5 before:top-1 before:bottom-1 before:w-0.5 before:bg-gray-100">
                                   <div className="relative pr-4 flex justify-between items-center text-gray-500"><span className="absolute right-0 top-1 w-3 h-3 bg-gray-200 rounded-full border-2 border-white"></span><span>بداية الجلسة ({checkoutData.session.events[0].fromDevice === 'mobile' ? 'جوال' : 'لابتوب'})</span><span className="font-mono">{new Date(checkoutData.session.startTime).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span></div>
                                   {checkoutData.session.events.map((e, idx) => (
                                       <div key={e.id} className="relative pr-4 flex justify-between items-center font-medium text-gray-800"><span className="absolute right-0 top-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white"></span><span>تحويل إلى {e.toDevice === 'mobile' ? 'جوال' : 'لابتوب'}</span><span className="font-mono">{new Date(e.timestamp).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span></div>
                                   ))}
                               </div>
                           </div>
                        )}
                        <div className="space-y-2 text-sm bg-white p-3 rounded-lg border border-gray-100">
                             <div className="flex justify-between"><span className="text-gray-600">الجلسة</span><span className="font-bold">{formatCurrency(checkoutFinancials.sessionInvoice || 0)}</span></div>
                             <div className="flex justify-between"><span className="text-gray-600">الطلبات</span><span className="font-bold">{formatCurrency((checkoutFinancials.drinksInvoice || 0) + (checkoutFinancials.internetCardsInvoice || 0))}</span></div>
                             <div className="pt-2 border-t border-dashed mt-2">
                                 <div className="flex justify-between items-center mb-2">
                                     <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                         <Coins size={12}/> مبلغ الخصم (اختياري)
                                     </span>
                                     {checkoutData.discount && (
                                         <button onClick={() => setCheckoutData({...checkoutData, discount: undefined})} className="text-[10px] text-red-500 underline">إلغاء الخصم</button>
                                     )}
                                 </div>
                                 <div className="relative">
                                     <input 
                                         type="number" 
                                         placeholder="0.00"
                                         value={checkoutData.discount?.value || ''}
                                         onChange={(e) => {
                                             const val = parseFloat(e.target.value);
                                             if (val > 0) {
                                                 setCheckoutData({...checkoutData, discount: { type: 'fixed', value: val, amount: val, locked: false }});
                                             } else {
                                                 setCheckoutData({...checkoutData, discount: undefined});
                                             }
                                         }}
                                         className="block w-full pr-10 pl-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-bold"
                                     />
                                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                         <span className="text-xs font-bold">₪</span>
                                     </div>
                                 </div>
                                 {checkoutFinancials.discountApplied && (
                                     <div className="flex justify-between text-red-600 font-bold mt-2 bg-red-50 px-2 py-1 rounded">
                                         <span>قيمة الخصم المسجلة</span>
                                         <span>-{formatCurrency(checkoutFinancials.discountApplied.amount)}</span>
                                     </div>
                                 )}
                             </div>
                             <div className="pt-2 border-t border-gray-200 flex justify-between text-lg font-bold text-indigo-700"><span>الإجمالي المستحق</span><span>{formatCurrency(checkoutFinancials.totalDue || 0)}</span></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <FormInput label="وقت الخروج" type="time" value={checkoutData.time} onChange={e => setCheckoutData({...checkoutData, time: e.target.value})} />
                        {checkoutFinancials.appliedCredit > 0 && (<div className="bg-green-50 p-2 rounded border border-green-100 text-green-800 text-sm flex justify-between items-center"><span><CreditCard size={14} className="inline mr-1"/> تم خصم من الرصيد السابق:</span><span className="font-bold">-{formatCurrency(checkoutFinancials.appliedCredit)}</span></div>)}
                        <div className="grid grid-cols-2 gap-4"><FormInput label="مدفوع نقدي (كاش)" type="number" unit="₪" value={checkoutData.cash} onChange={e => setCheckoutData({...checkoutData, cash: e.target.value})} placeholder="0" /><FormInput label="مدفوع بنكي" type="number" unit="₪" value={checkoutData.bank} onChange={e => setCheckoutData({...checkoutData, bank: e.target.value})} placeholder="0" /></div>
                        {parseFloat(checkoutData.bank) > 0 && (
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 animate-fade-in">
                                 <FormInput as="select" label="البنك المستلم (إلى)" value={checkoutData.bankAccountId} onChange={e => setCheckoutData({...checkoutData, bankAccountId: e.target.value})} className="mb-2" error={!checkoutData.bankAccountId ? 'مطلوب' : ''}><option value="">-- اختر الحساب --</option>{bankAccounts.filter(b=>b.active).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</FormInput>
                                 <FormInput label="رقم جوال المرسل" value={checkoutData.senderPhone} onChange={e => setCheckoutData({...checkoutData, senderPhone: e.target.value})} className="mb-2" error={!checkoutData.senderPhone ? 'مطلوب' : ''} />
                                 <FormInput label="اسم حساب المرسل" value={checkoutData.senderAccountName} onChange={e => setCheckoutData({...checkoutData, senderAccountName: e.target.value})} error={!checkoutData.senderAccountName ? 'مطلوب' : ''} />
                             </div>
                        )}
                        <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs space-y-1">
                             {checkoutFinancials.createdCredit > 0 && <div className="text-green-600 font-bold">سيتم إضافة رصيد للزبون: {formatCurrency(checkoutFinancials.createdCredit)}</div>}
                             {checkoutFinancials.createdDebt > 0 && <div className="text-red-600 font-bold">سيتم تسجيل دين على الزبون: {formatCurrency(checkoutFinancials.createdDebt)}</div>}
                             {checkoutFinancials.settledDebt > 0 && <div className="text-gray-600">سيتم تسوية ديون سابقة بقيمة: {formatCurrency(checkoutFinancials.settledDebt)}</div>}
                        </div>
                        <FormInput label="ملاحظة / سبب الدين" value={checkoutData.excuse} onChange={e => setCheckoutData({...checkoutData, excuse: e.target.value})} placeholder="اختياري..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={() => setModals({...modals, checkout: false})}>إلغاء</Button>
                        <Button onClick={handleCompleteCheckout} disabled={!canSubmitCheckout}>تأكيد وحفظ</Button>
                    </div>
                </div>
            )}
       </Modal>

       <Modal isOpen={modals.addOrder} onClose={() => setModals(prev => ({...prev, addOrder: false}))} title={orderData.orderIdToEdit ? "تعديل طلب" : "إضافة طلب"}>
           <div className="space-y-4">
               {!orderData.lockType && (
                   <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                       <button onClick={() => setOrderData({...orderData, type: 'drink', itemId: '', size: 'small'})} className={`flex-1 py-2 text-xs font-bold rounded ${orderData.type === 'drink' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>مشروبات</button>
                       <button onClick={() => setOrderData({...orderData, type: 'internet_card', itemId: ''})} className={`flex-1 py-2 text-xs font-bold rounded ${orderData.type === 'internet_card' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>بطاقات نت</button>
                   </div>
               )}
               {orderData.type === 'drink' ? (
                   <>
                       <FormInput as="select" label="المشروب" value={orderData.itemId} onChange={e => { const d = drinks.find(x => x.id === e.target.value); setOrderData({...orderData, itemId: e.target.value, size: d?.availability === 'large' ? 'large' : 'small'}); }}>
                           <option value="">-- اختر --</option>
                           {drinks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </FormInput>
                       {orderData.itemId && (
                           <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                               <label className="block text-sm font-bold text-gray-800 mb-2">الأحجام المتاحة</label>
                               <div className="flex gap-2">
                                   {(() => {
                                       const d = drinks.find(x => x.id === orderData.itemId);
                                       if (!d) return null;
                                       return (
                                           <>
                                               {(d.availability === 'small' || d.availability === 'both') && <button onClick={() => setOrderData({...orderData, size: 'small'})} className={`flex-1 py-2 text-xs font-bold rounded ${orderData.size === 'small' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}>صغير ({formatCurrency(d.smallPrice || 0)})</button>}
                                               {(d.availability === 'large' || d.availability === 'both') && <button onClick={() => setOrderData({...orderData, size: 'large'})} className={`flex-1 py-2 text-xs font-bold rounded ${orderData.size === 'large' ? 'bg-orange-600 text-white' : 'bg-white border text-gray-600'}`}>كبير ({formatCurrency(d.largePrice || 0)})</button>}
                                           </>
                                       );
                                   })()}
                               </div>
                           </div>
                       )}
                   </>
               ) : (
                   <FormInput as="select" label="نوع البطاقة" value={orderData.itemId} onChange={e => setOrderData({...orderData, itemId: e.target.value})}>
                       <option value="">-- اختر --</option>
                       {internetCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </FormInput>
               )}
               
               <div className="grid grid-cols-2 gap-4">
                   <FormInput label="الكمية" type="number" min="1" value={orderData.qty} onChange={e => setOrderData({...orderData, qty: e.target.value})} />
                   <FormInput label="الوقت" type="time" value={orderData.time} onChange={e => setOrderData({...orderData, time: e.target.value})} />
               </div>

               {orderModalStockStatus && (
                    <div className="mt-2 bg-gray-50 p-4 rounded-2xl border border-gray-200 animate-slide-up">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                            <Box size={14}/> فحص المكونات والمخزون
                        </h5>
                        <div className="space-y-2">
                            {orderModalStockStatus.map((status, i) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-gray-700">{status.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">تحتاج: {status.needed} {status.unit}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${status.isShort ? 'bg-red-600 text-white shadow-sm' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                                            {status.isShort ? `ناقص (${status.available})` : `متوفر (${status.available})`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {orderModalStockStatus.some(s => s.isShort) && (
                                <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 rounded-xl border border-red-100 text-[11px] text-red-800 font-black">
                                    <AlertTriangle size={18} className="shrink-0 text-red-600 animate-pulse"/>
                                    <span>نظام المنع مفعل: لا يمكن إضافة الطلب لوجود نقص في المخزون. يرجى توريد البضاعة أولاً.</span>
                                </div>
                            )}
                        </div>
                    </div>
               )}

               <div className="flex justify-end gap-3 pt-2">
                   <Button variant="secondary" onClick={() => setModals(prev => ({...prev, addOrder: false}))}>إلغاء</Button>
                   <Button onClick={handleSaveOrder} disabled={!canSaveOrder} className={`${!canSaveOrder ? 'bg-gray-300' : (orderData.type === 'drink' ? 'bg-indigo-600' : 'bg-blue-600')}`}>
                        {canSaveOrder ? 'حفظ الطلب' : 'ممنوع (نقص مخزون)'}
                   </Button>
               </div>
           </div>
       </Modal>

       <Modal isOpen={modals.endDay} onClose={() => setModals({...modals, endDay: false})} title="إغلاق اليوم (الدورة الحالية)" description="ملخص الدورة (محسوب من السجل المالي)">
           {endDayData && (
               <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4"><div className="bg-emerald-50 p-3 rounded border border-emerald-100 text-center"><span className="block text-xs text-gray-500">إجمالي الإيراد</span><span className="block text-xl font-bold text-emerald-700">{formatCurrency(endDayData.totalRevenue)}</span></div><div className="bg-red-50 p-3 rounded border border-red-100 text-center"><span className="block text-xs text-gray-500">إجمالي الديون</span><span className="block text-xl font-bold text-red-700">{formatCurrency(endDayData.totalDebt)}</span></div></div>
                   <div className="space-y-2 text-sm bg-gray-50 p-3 rounded border border-gray-100">
                       <div className="flex justify-between"><span>كاش في الصندوق</span><span className="font-bold">{formatCurrency(endDayData.cashRevenue)}</span></div>
                       <div className="flex justify-between"><span>تحويلات بنكية</span><span className="font-bold">{formatCurrency(endDayData.bankRevenue)}</span></div>
                       <div className="border-t border-gray-200 my-1 pt-1"></div>
                       <div className="flex justify-between"><span>عدد السجلات (تقريبي)</span><span className="font-bold">{endDayData.recordCount}</span></div>
                       <div className="flex justify-between text-xs text-gray-500"><span>صافي الكاش (بعد المصاريف)</span><span className="font-mono">{formatCurrency(endDayData.netCashFlow)}</span></div>
                   </div>
                   <FormInput label="ملاحظات الإغلاق" as="textarea" value={endDayNotes} onChange={e => setEndDayNotes(e.target.value)} placeholder="أي ملاحظات حول الدورة..." />
                   <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                       <Button variant="secondary" onClick={() => setModals({...modals, endDay: false})}>إلغاء</Button>
                       <Button className="bg-red-600 hover:bg-red-700" onClick={handleConfirmEndDay}>تأكيد الإغلاق</Button>
                   </div>
               </div>
           )}
       </Modal>

       <Modal isOpen={modals.audit} onClose={() => setModals(prev => ({...prev, audit: false}))} title="سجل العمليات (Audit Log)">
           <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
               {auditLogs.length === 0 ? <p className="text-center text-gray-400">لا يوجد سجلات</p> : auditLogs.map(log => (<div key={log.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm"><div className="flex justify-between text-xs text-gray-500 mb-1"><span>{new Date(log.timestamp).toLocaleString('ar-SA')}</span><span className="uppercase font-bold tracking-wider">{log.action}</span></div><div className="font-medium text-gray-800">{log.details}</div><div className="flex justify-between text-xs text-gray-400 mt-1"><span>ID: {log.entityId}</span><span>{log.performedByName}</span></div></div>))}
           </div>
           <div className="flex justify-end pt-4"><Button onClick={() => setModals(prev => ({...prev, audit: false}))}>إلغاء</Button></div>
       </Modal>

       <Modal isOpen={modals.inventory} onClose={() => { setModals({...modals, inventory: false}); setInventoryStep('data'); }} title="الجرد والأرشفة">
           {inventoryPreview && (
               <div className="space-y-6">
                   {inventoryStep === 'data' ? (
                       <div className="space-y-6 animate-fade-in">
                            <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/40 rounded-3xl border border-amber-200/60 p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-amber-800 font-black flex items-center gap-2.5 text-lg">
                                        <div className="bg-amber-500 text-white p-2 rounded-xl shadow-amber-200 shadow-lg animate-pulse-slow">
                                            <Zap size={20} fill="currentColor"/>
                                        </div>
                                        استهلاك الكهرباء
                                    </h4>
                                    <div className="bg-white/80 px-3 py-1 rounded-full border border-amber-200 text-[10px] font-bold text-amber-700 tracking-wide uppercase">عداد رقمي</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-2xl p-4 shadow-sm">
                                        <label className="block text-[10px] font-black text-amber-600/70 uppercase mb-2">القراءة السابقة</label>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black text-gray-800 font-mono tracking-tighter">{pricingConfig.lastMeterReading}</span>
                                            <span className="text-[10px] font-bold text-gray-400">kWh</span>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl p-4 shadow-md border border-amber-300 ring-2 ring-amber-100/50">
                                        <label className="block text-[10px] font-black text-amber-600 uppercase mb-2">القراءة الحالية</label>
                                        <div className="flex items-center gap-1.5">
                                            <input type="number" placeholder="000.0" value={currentMeterReading} onChange={e => setCurrentMeterReading(e.target.value)} className="w-full bg-transparent border-none p-0 text-2xl font-black text-gray-900 focus:ring-0 font-mono placeholder-gray-300" />
                                            <span className="text-[10px] font-bold text-gray-400">kWh</span>
                                        </div>
                                    </div>
                                </div>

                                {parseFloat(currentMeterReading) > 0 && (
                                    <div className="space-y-4">
                                        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 flex justify-between items-center text-white shadow-xl shadow-amber-200">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase opacity-80">إجمالي الاستهلاك</span>
                                                <span className="text-lg font-black font-mono">{(parseFloat(currentMeterReading) - pricingConfig.lastMeterReading).toFixed(2)} <small className="text-xs opacity-70">كيلو</small></span>
                                            </div>
                                            <div className="w-[1px] h-8 bg-white/20 mx-2"></div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-[10px] font-bold uppercase opacity-80">تكلفة الكهرباء</span>
                                                <span className="text-2xl font-black">{formatCurrency(inventoryPreview.electricityCost)}</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/60 p-4 rounded-2xl border border-amber-200/50">
                                            <label className="block text-xs font-black text-amber-800 mb-3 uppercase tracking-wider text-center">طريقة دفع فاتورة الكهرباء</label>
                                            <div className="flex gap-2 mb-3">
                                                <button onClick={() => setElecPaymentChannel('cash')} className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${elecPaymentChannel === 'cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}><Banknote size={18}/> كاش</button>
                                                <button onClick={() => setElecPaymentChannel('bank')} className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${elecPaymentChannel === 'bank' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}><Landmark size={18}/> بنك</button>
                                            </div>
                                            {elecPaymentChannel === 'bank' && (
                                                <div className="animate-fade-in">
                                                    <FormInput as="select" label="دفع من حساب" value={elecBankAccountId} onChange={e => setElecBankAccountId(e.target.value)} className="mb-0">
                                                        <option value="">-- اختر الحساب البنكي --</option>
                                                        {bankAccounts.filter(b=>b.active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    </FormInput>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <Button variant="secondary" onClick={() => setModals({...modals, inventory: false})}>إلغاء</Button>
                                <Button className="bg-indigo-600 px-8" onClick={() => setInventoryStep('review')} disabled={!currentMeterReading || parseFloat(currentMeterReading) < pricingConfig.lastMeterReading || (elecPaymentChannel === 'bank' && !elecBankAccountId)}>
                                    متابعة للمراجعة النهائية <ChevronLeft size={18} className="mr-1"/>
                                </Button>
                            </div>
                       </div>
                   ) : (
                       <div className="space-y-6 animate-slide-up">
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3">
                                <ShieldCheck className="text-indigo-600 shrink-0 mt-0.5" size={24}/>
                                  <div>
                                    <h4 className="font-black text-indigo-900">المراجعة النهائية للجرد</h4>
                                    <p className="text-xs text-indigo-700 font-medium">يرجى التأكد من الأرقام أدناه قبل ترحيل البيانات للأرشيف وقفل الفترة.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">سيخصم من الصندوق (كاش)</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-2xl font-black text-rose-600">{formatCurrency(
                                            (inventoryPreview.partners.reduce((s:any,p:any)=>s+(p.finalPayoutCash||0),0)) + 
                                            (elecPaymentChannel === 'cash' ? inventoryPreview.electricityCost : 0)
                                        )}</span>
                                        <Banknote size={20} className="text-gray-200 mb-1"/>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">سيخصم من البنك (تحويلات)</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-2xl font-black text-indigo-600">{formatCurrency(
                                            (inventoryPreview.partners.reduce((s:any,p:any)=>s+(p.finalPayoutBank||0),0)) + 
                                            (elecPaymentChannel === 'bank' ? inventoryPreview.electricityCost : 0)
                                        )}</span>
                                        <Landmark size={20} className="text-gray-200 mb-1"/>
                                    </div>
                                </div>
                            </div>

                            <div className={`${inventoryPreview.netProfitPaid < 0 ? 'bg-red-50 border-red-100' : 'bg-indigo-600 shadow-indigo-100 shadow-xl'} p-6 rounded-3xl border text-center transition-all`}>
                                <p className={`text-xs font-black mb-1 uppercase tracking-widest ${inventoryPreview.netProfitPaid < 0 ? 'text-red-800' : 'text-indigo-100'}`}>
                                    {inventoryPreview.netProfitPaid < 0 ? 'صافي الخسارة (عجز)' : 'إجمالي أربباح الشركاء للتوزيع'}
                                </p>
                                <p className={`text-4xl font-black tracking-tight ${inventoryPreview.netProfitPaid < 0 ? 'text-red-900' : 'text-white'}`}>
                                    {formatCurrency(Math.abs(inventoryPreview.netProfitPaid))}
                                </p>
                                <div className={`h-px my-4 ${inventoryPreview.netProfitPaid < 0 ? 'bg-red-200' : 'bg-white/20'}`}></div>
                                <div className="flex justify-around text-xs font-bold">
                                    <div className={inventoryPreview.netProfitPaid < 0 ? 'text-red-700' : 'text-indigo-50'}>
                                        <p className="opacity-70 mb-1">حصص الكاش</p>
                                        <p className="text-sm font-black">{formatCurrency(inventoryPreview.partners.reduce((s:any,p:any)=>s+(p.finalPayoutCash||0),0))}</p>
                                    </div>
                                    <div className={inventoryPreview.netProfitPaid < 0 ? 'text-red-700' : 'text-indigo-50'}>
                                        <p className="opacity-70 mb-1">حصص البنك</p>
                                        <p className="text-sm font-black">{formatCurrency(inventoryPreview.partners.reduce((s:any,p:any)=>s+(p.finalPayoutBank||0),0))}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
                                <div className="flex justify-between text-xs"><span className="text-gray-500">تكلفة الكهرباء ({elecPaymentChannel === 'cash' ? 'كاش' : 'بنك'})</span><span className="font-bold text-gray-800">{formatCurrency(inventoryPreview.electricityCost)}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-gray-500">مبالغ مجنبة (ادخار/التزامات)</span><span className="font-bold text-purple-600">{formatCurrency(inventoryPreview.totalSavings || 0)}</span></div>
                                <div className="flex justify-between text-xs pt-2 border-t border-gray-200"><span className="text-gray-700 font-bold">قفل الفترة المالية حتى</span><span className="font-black text-indigo-700">{inventoryRange.end}</span></div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button onClick={() => setInventoryStep('data')} className="px-6 py-2 rounded-xl text-gray-500 font-bold hover:bg-gray-100 flex items-center gap-2">تعديل البيانات <ArrowRight size={18}/></button>
                                <Button className="bg-indigo-600 px-8 py-3 rounded-xl shadow-lg shadow-indigo-200 font-black text-base" onClick={() => setModals(prev => ({ ...prev, inventoryConfirm: true }))}>
                                    <ShieldCheck size={20} className="ml-2"/> تأكيد وأرشفة وقفل
                                </Button>
                            </div>
                       </div>
                   )}
               </div>
           )}
       </Modal>

       {/* NEW INVENTORY CONFIRMATION DIALOG (3-CHOICE) */}
       <Modal isOpen={modals.inventoryConfirm} onClose={() => setModals(prev => ({...prev, inventoryConfirm: false}))} title="تأكيد نهائي لعملية الجرد">
           <div className="space-y-6">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-4 animate-pulse-slow">
                    <div className="bg-amber-100 p-2 rounded-xl text-amber-600"><AlertTriangle size={24}/></div>
                    <div>
                        <h4 className="font-black text-amber-900">تنبيه حرج</h4>
                        <p className="text-xs text-amber-700 font-bold leading-relaxed">
                            أنت على وشك إغلاق الفترة المالية. يرجى اختيار الإجراء المناسب بناءً على وضع السيولة النقدية لديك.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Option 1: Archive & Reset (Yes and Applied) */}
                    <button 
                        onClick={() => handleArchiveInventory(true)}
                        className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-right shadow-lg shadow-emerald-100 transition-all flex items-center justify-between group"
                    >
                        <div>
                            <p className="font-black text-lg">نعم، وتم التطبيق</p>
                            <p className="text-[10px] text-emerald-50 opacity-80 font-bold">أرشفة وحذف المشتريات وتصفير الديون (تم التوزيع الفعلي)</p>
                        </div>
                        <CheckCircle size={24} className="group-hover:scale-110 transition-transform"/>
                    </button>

                    {/* Option 2: Just Archive (Keep Data) */}
                    <button 
                        onClick={() => handleArchiveInventory(false)}
                        className="w-full p-4 bg-white hover:bg-indigo-50 text-indigo-700 border-2 border-indigo-100 rounded-2xl text-right transition-all flex items-center justify-between group"
                    >
                        <div>
                            <p className="font-black text-lg">حفظ في الأرشيف فقط</p>
                            <p className="text-[10px] text-indigo-400 font-bold">توثيق الفترة مع الاحتفاظ بالمشتريات والديون القائمة</p>
                        </div>
                        <Save size={24} className="text-indigo-400 group-hover:scale-110 transition-transform"/>
                    </button>

                    {/* Option 3: Cancel */}
                    <button 
                        onClick={() => setModals(prev => ({...prev, inventoryConfirm: false}))}
                        className="w-full p-4 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl text-center font-black text-sm transition-all"
                    >
                        إلغاء والرجوع
                    </button>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl text-[10px] text-gray-400 text-center border border-gray-100 leading-relaxed">
                    * خيار <span className="font-black text-emerald-600">"نعم وتم التطبيق"</span> سيقوم بتصفير الصندوق وحذف المشتريات الحالية لبدء دورة مالية جديدة من الصفر.
                </div>
           </div>
       </Modal>

       <Modal isOpen={modals.profile} onClose={() => setModals(prev => ({...prev, profile: false}))} title="تعديل الملف الشخصي">
           <div className="space-y-4">
               <FormInput label="الاسم الكامل" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
               <FormInput label="اسم المستخدم" value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} />
               <FormInput label="كلمة المرور الجديدة" value={profileData.password} onChange={e => setProfileData({...profileData, password: e.target.value})} placeholder="اتركه فارغاً للإبقاء على القديمة" />
               <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                   <Button variant="secondary" onClick={() => setModals(prev => ({...prev, profile: false}))}>إلغاء</Button>
                   <Button onClick={handleUpdateProfile}><CheckCircle size={18} className="ml-2"/> حفظ التغييرات</Button>
               </div>
           </div>
       </Modal>
    </Layout>
  );
};

export default App;
