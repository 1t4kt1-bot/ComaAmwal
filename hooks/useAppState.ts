import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Session, Record, Drink, InternetCard, BankAccount, Expense, Purchase, 
    InventorySnapshot, InventoryItem, Customer, PlaceLoan, CashTransfer, SavingPlan, 
    PeriodLock, LedgerEntry, DayCycle, SystemState, 
    AuditLogItem, DebtItem, PricingConfig, AppUser 
} from '../types';
import { getLocalDate, generateId, hashPassword } from '../utils';
import { migrateLegacyDataToLedger, checkLedgerIntegrity } from '../accounting_core';

export const useAppState = () => {
  // --- STATE INITIALIZATION ---
  const [sessions, setSessions] = useState<Session[]>(() => JSON.parse(localStorage.getItem('cw_sessions') || '[]'));
  const [records, setRecords] = useState<Record[]>(() => JSON.parse(localStorage.getItem('cw_records') || '[]'));
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => JSON.parse(localStorage.getItem('cw_audit_logs') || '[]'));

  const [drinks, setDrinks] = useState<Drink[]>(() => JSON.parse(localStorage.getItem('cw_drinks') || '[]'));
  const [internetCards, setInternetCards] = useState<InternetCard[]>(() => JSON.parse(localStorage.getItem('cw_internet_cards') || '[]'));
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => JSON.parse(localStorage.getItem('cw_bank_accounts') || '[]'));
  const [expenses, setExpenses] = useState<Expense[]>(() => JSON.parse(localStorage.getItem('cw_expenses') || '[]'));
  const [purchases, setPurchases] = useState<Purchase[]>(() => JSON.parse(localStorage.getItem('cw_purchases') || '[]'));
  const [inventorySnapshots, setInventorySnapshots] = useState<InventorySnapshot[]>(() => JSON.parse(localStorage.getItem('cw_inventory_snapshots') || '[]'));
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => JSON.parse(localStorage.getItem('cw_inventory_items') || '[]'));
  const [customers, setCustomers] = useState<Customer[]>(() => JSON.parse(localStorage.getItem('cw_customers') || '[]'));
  const [placeLoans, setPlaceLoans] = useState<PlaceLoan[]>(() => JSON.parse(localStorage.getItem('cw_place_loans') || '[]')); 
  const [cashTransfers, setCashTransfers] = useState<CashTransfer[]>(() => JSON.parse(localStorage.getItem('cw_cash_transfers') || '[]')); 
  const [savingPlans, setSavingPlans] = useState<SavingPlan[]>(() => JSON.parse(localStorage.getItem('cw_saving_plans') || '[]'));
  
  const [periodLock, setPeriodLock] = useState<PeriodLock | null>(() => JSON.parse(localStorage.getItem('cw_period_lock') || 'null'));

  // --- AUTH STATE ---
  const [users, setUsers] = useState<AppUser[]>(() => {
      const stored = localStorage.getItem('cw_users');
      if (stored) return JSON.parse(stored);
      // Default Admin User
      return [{
          id: 'admin_001',
          username: 'Admin',
          password: 'Admin', // Legacy Password for first login
          name: 'مدير النظام',
          role: 'admin',
          createdAt: new Date().toISOString()
      }];
  });
  
  // Session storage for login state
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
      const stored = sessionStorage.getItem('cw_current_user');
      return stored ? JSON.parse(stored) : null;
  });

  // --- SINGLE SOURCE OF TRUTH FOR MONEY ---
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => JSON.parse(localStorage.getItem('cw_ledger') || '[]'));

  const [dayCycles, setDayCycles] = useState<DayCycle[]>(() => JSON.parse(localStorage.getItem('cw_day_cycles') || '[]'));
  // Use any[] since DailyClosing is not defined in types.ts
  const [dailyClosings, setDailyClosings] = useState<any[]>(() => JSON.parse(localStorage.getItem('cw_daily_closings') || '[]'));
  
  const [systemState, setSystemState] = useState<SystemState>(() => {
      const stored = localStorage.getItem('cw_system_state');
      const today = getLocalDate();
      const currentMonth = today.slice(0, 7);
      
      if (stored) {
          const parsed = JSON.parse(stored);
          return {
              ...parsed,
              activeCycleId: parsed.activeCycleId || null,
              currentCycleStartTime: parsed.currentCycleStartTime || null,
              currentDate: parsed.currentDate || today,
              currentMonth: parsed.currentMonth || currentMonth,
              dayStatus: parsed.activeCycleId ? 'open' : 'closed',
              lastBackupDate: parsed.lastBackupDate || null
          };
      }
      return { 
          currentDate: today, 
          currentMonth: currentMonth, 
          activeCycleId: null,
          currentCycleStartTime: null, 
          dayStatus: 'closed', 
          monthStatus: 'open', 
          logs: [],
          lastBackupDate: null
      };
  });

  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(() => {
    return JSON.parse(localStorage.getItem('cw_pricing') || JSON.stringify({ 
      mobileRate: 10, laptopRate: 15, mobilePlaceCost: 0.5, laptopPlaceCost: 1.2, devPercent: 15,
      kwhPrice: 0.7, lastMeterReading: 0
    }));
  });

  const [debtsList, setDebtsList] = useState<DebtItem[]>(() => JSON.parse(localStorage.getItem('cw_partner_debts_list') || '[]'));
  const [integrityErrors, setIntegrityErrors] = useState<string[]>([]);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => localStorage.setItem('cw_sessions', JSON.stringify(sessions)), [sessions]);
  useEffect(() => localStorage.setItem('cw_records', JSON.stringify(records)), [records]);
  useEffect(() => localStorage.setItem('cw_audit_logs', JSON.stringify(auditLogs)), [auditLogs]);
  useEffect(() => localStorage.setItem('cw_drinks', JSON.stringify(drinks)), [drinks]);
  useEffect(() => localStorage.setItem('cw_internet_cards', JSON.stringify(internetCards)), [internetCards]);
  useEffect(() => localStorage.setItem('cw_bank_accounts', JSON.stringify(bankAccounts)), [bankAccounts]);
  useEffect(() => localStorage.setItem('cw_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('cw_purchases', JSON.stringify(purchases)), [purchases]);
  useEffect(() => localStorage.setItem('cw_pricing', JSON.stringify(pricingConfig)), [pricingConfig]);
  useEffect(() => localStorage.setItem('cw_inventory_snapshots', JSON.stringify(inventorySnapshots)), [inventorySnapshots]);
    useEffect(() => localStorage.setItem('cw_inventory_items', JSON.stringify(inventoryItems)), [inventoryItems]);
  useEffect(() => localStorage.setItem('cw_partner_debts_list', JSON.stringify(debtsList)), [debtsList]);
  useEffect(() => localStorage.setItem('cw_daily_closings', JSON.stringify(dailyClosings)), [dailyClosings]);
  useEffect(() => localStorage.setItem('cw_customers', JSON.stringify(customers)), [customers]);
  useEffect(() => localStorage.setItem('cw_place_loans', JSON.stringify(placeLoans)), [placeLoans]);
  useEffect(() => localStorage.setItem('cw_cash_transfers', JSON.stringify(cashTransfers)), [cashTransfers]);
  useEffect(() => localStorage.setItem('cw_ledger', JSON.stringify(ledger)), [ledger]); 
  useEffect(() => localStorage.setItem('cw_period_lock', JSON.stringify(periodLock)), [periodLock]);
  useEffect(() => localStorage.setItem('cw_saving_plans', JSON.stringify(savingPlans)), [savingPlans]);
  useEffect(() => localStorage.setItem('cw_day_cycles', JSON.stringify(dayCycles)), [dayCycles]);
  useEffect(() => localStorage.setItem('cw_system_state', JSON.stringify(systemState)), [systemState]);
  useEffect(() => localStorage.setItem('cw_users', JSON.stringify(users)), [users]);

  // --- CALCULATED STATE ---
  const daysSinceBackup = useMemo(() => {
      if (!systemState.lastBackupDate) return 999;
      const last = new Date(systemState.lastBackupDate).getTime();
      const now = new Date().getTime();
      const diff = now - last;
      return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [systemState.lastBackupDate]);

  // --- HELPERS ---
  const logAction = useCallback((entityType: any, entityId: string, action: string, details: string, performerOverride?: string) => {
      setAuditLogs(prev => {
          const logItem: AuditLogItem = {
              id: generateId(),
              timestamp: new Date().toISOString(),
              entityType,
              entityId,
              action,
              details,
              performedByName: performerOverride || currentUser?.name || 'System'
          };
          
          const newLogs = [logItem, ...prev];
          if (newLogs.length > 1500) {
              return newLogs.slice(0, 1500);
          }
          return newLogs;
      });
  }, [currentUser]);

  // --- AUTH ACTIONS ---
  const login = async (username: string, pass: string): Promise<boolean> => {
      const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
      
      if (userIndex === -1) return false;
      const user = users[userIndex];

      // 1. Check Plain Text (Legacy Migration)
      if (user.password && user.password === pass) {
          const newHash = await hashPassword(pass);
          const updatedUser: AppUser = {
              ...user,
              password: '', // Clear plain text
              passwordHash: newHash
          };
          
          const newUsers = [...users];
          newUsers[userIndex] = updatedUser;
          setUsers(newUsers);
          setCurrentUser(updatedUser);
          sessionStorage.setItem('cw_current_user', JSON.stringify(updatedUser));
          
          logAction('auth', user.id, 'LOGIN_MIGRATE', `User ${user.username} migrated to secure hash`, updatedUser.name);
          return true;
      }

      // 2. Check Hash
      if (user.passwordHash) {
          const inputHash = await hashPassword(pass);
          if (inputHash === user.passwordHash) {
              setCurrentUser(user);
              sessionStorage.setItem('cw_current_user', JSON.stringify(user));
              logAction('auth', user.id, 'LOGIN', `User ${user.username} logged in`, user.name);
              return true;
          }
      }

      return false;
  };

  const logout = () => {
      if (currentUser) logAction('auth', currentUser.id, 'LOGOUT', `User ${currentUser.username} logged out`, currentUser.name);
      setCurrentUser(null);
      sessionStorage.removeItem('cw_current_user');
  };

  const addUser = async (u: AppUser) => {
      const hash = await hashPassword(u.password || '');
      const secureUser = { ...u, password: '', passwordHash: hash };
      setUsers(prev => [...prev, secureUser]);
      logAction('user', u.id, 'ADD_USER', `Added user: ${u.username}`);
  };

  const updateUser = async (u: AppUser) => {
      let secureUser = { ...u };
      if (u.password && u.password.length > 0) {
          const hash = await hashPassword(u.password);
          secureUser.passwordHash = hash;
          secureUser.password = '';
      }

      setUsers(prev => prev.map(user => user.id === u.id ? secureUser : user));
      if (currentUser && currentUser.id === u.id) {
          setCurrentUser(secureUser);
          sessionStorage.setItem('cw_current_user', JSON.stringify(secureUser));
      }
      logAction('user', u.id, 'UPDATE_USER', `Updated user: ${u.username}`);
  };

  const deleteUser = (id: string) => {
      setUsers(prev => prev.filter(u => u.id !== id));
      logAction('user', id, 'DELETE_USER', `Deleted user`);
  };

  // --- MIGRATION & INTEGRITY ---
  useEffect(() => {
      if (ledger.length === 0 && records.length > 0) {
          console.log("Running one-time migration to Central Ledger...");
          const migratedLedger = migrateLegacyDataToLedger(records, expenses, cashTransfers, debtsList, placeLoans);
          if (migratedLedger.length > 0) {
              setLedger(migratedLedger);
              logAction('system', 'migration', 'MIGRATE_LEDGER', 'Migrated legacy data to Central Ledger', 'System');
          }
      }
  }, []); 

  useEffect(() => {
      if (ledger.length > 0) {
          const errors = checkLedgerIntegrity(ledger);
          setIntegrityErrors(errors);
          if (errors.length > 0) {
              console.error("Sanity Check Failures:", errors);
          }
      }
  }, [ledger]);

  return {
      sessions, setSessions,
      records, setRecords,
      auditLogs, setAuditLogs,
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
      dailyClosings, setDailyClosings,
      systemState, setSystemState,
      pricingConfig, setPricingConfig,
      debtsList, setDebtsList,
      integrityErrors, setIntegrityErrors,
      daysSinceBackup,
      logAction,
      users, addUser, updateUser, deleteUser,
      currentUser, login, logout
  };
};