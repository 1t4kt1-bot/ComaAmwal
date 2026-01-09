
import { SCHEMA_VERSION, AuditLogItem, Customer } from './types';
import { generateId } from './utils';

const STORAGE_KEYS = [
    'cw_ledger',
    'cw_sessions',
    'cw_records',
    'cw_expenses',
    'cw_purchases',
    'cw_period_lock',
    'cw_audit_logs',
    'cw_settings',
    'cw_customers',
    'cw_bank_accounts',
    'cw_drinks',
    'cw_internet_cards',
    'cw_place_loans',
    'cw_partner_debts_list',
    'cw_cash_transfers',
    'cw_system_state',
    'cw_day_cycles',
    'cw_monthly_archives',
    'cw_daily_closings',
    'cw_inventory_snapshots',
    'cw_pricing',
    'cw_saving_plans'
];

export const exportBackup = (): string => {
    const backup: any = {
        meta: {
            version: SCHEMA_VERSION,
            createdAt: new Date().toISOString(),
            appName: "Co'Ma"
        },
        data: {}
    };

    STORAGE_KEYS.forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
            try {
                backup.data[key] = JSON.parse(raw);
            } catch (e) {
                console.error(`Failed to parse key ${key}`, e);
            }
        }
    });

    return JSON.stringify(backup, null, 2);
};

export const importBackup = (jsonString: string): { success: boolean; message: string } => {
    try {
        const backup = JSON.parse(jsonString);
        
        // Basic Validation
        if (!backup.meta || !backup.data) {
            return { success: false, message: 'ملف غير صالح: هيكل البيانات غير صحيح' };
        }

        // Schema Check (Simple equality for now, can be upgraded to migration logic)
        if (backup.meta.version !== SCHEMA_VERSION) {
            // In a real app, run migrations here
            console.warn(`Version mismatch. Backup: ${backup.meta.version}, Current: ${SCHEMA_VERSION}. Proceeding carefully.`);
        }

        // Integrity Check (Ledger existence)
        if (!backup.data['cw_ledger']) {
            return { success: false, message: 'ملف غير صالح: السجل المالي مفقود' };
        }

        // Perform Restore
        STORAGE_KEYS.forEach(key => {
            if (backup.data[key]) {
                localStorage.setItem(key, JSON.stringify(backup.data[key]));
            } else {
                localStorage.removeItem(key); // Clean up keys not in backup
            }
        });

        // Write Restore Audit Event
        const logs: AuditLogItem[] = backup.data['cw_audit_logs'] || [];
        logs.unshift({
            id: generateId(),
            timestamp: new Date().toISOString(),
            entityType: 'system',
            entityId: 'restore',
            action: 'RESTORE_BACKUP',
            details: `Restored from backup created at ${backup.meta.createdAt}`
        });
        localStorage.setItem('cw_audit_logs', JSON.stringify(logs));

        return { success: true, message: 'تم استعادة النسخة الاحتياطية بنجاح' };

    } catch (e) {
        console.error(e);
        return { success: false, message: 'حدث خطأ أثناء معالجة الملف' };
    }
};

export const clearAllData = () => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    window.location.reload();
};

/**
 * Clears transactional data (Ledger, Records, Sessions, History)
 * But KEEPS: Users, Pricing, Products, Bank Accounts, Customers (Profiles only), Archives, LOANS & SAVING PLANS
 */
export const clearTransactionalData = () => {
    // 1. Keys to fully remove (Active transactions only)
    const keysToRemove = [
        'cw_ledger',
        'cw_sessions',
        'cw_records',
        'cw_audit_logs',
        'cw_expenses',
        'cw_purchases',
        'cw_day_cycles',
        // 'cw_monthly_archives', // PRESERVED: History
        'cw_daily_closings',
        // 'cw_inventory_snapshots', // PRESERVED: History
        'cw_cash_transfers',
        // 'cw_place_loans', // PRESERVED: Obligations / Liabilities
        // 'cw_saving_plans', // PRESERVED: Savings Definition
        'cw_partner_debts_list', // Remove partner withdrawals as they are part of the daily cycle
        'cw_period_lock'
    ];

    keysToRemove.forEach(k => localStorage.removeItem(k));

    // 2. Reset System State (Close day)
    const cleanState = {
        currentDate: new Date().toISOString().split('T')[0],
        currentMonth: new Date().toISOString().slice(0, 7),
        activeCycleId: null,
        currentCycleStartTime: null,
        dayStatus: 'closed',
        monthStatus: 'open',
        logs: [],
        lastBackupDate: null
    };
    localStorage.setItem('cw_system_state', JSON.stringify(cleanState));

    // 3. Reset Customer Balances (Keep profiles, clear money)
    const rawCustomers = localStorage.getItem('cw_customers');
    if (rawCustomers) {
        try {
            const customers: Customer[] = JSON.parse(rawCustomers);
            const resetCustomers = customers.map(c => ({
                ...c,
                debtBalance: 0,
                creditBalance: 0,
                lastVisit: undefined
            }));
            localStorage.setItem('cw_customers', JSON.stringify(resetCustomers));
        } catch (e) {
            console.error("Failed to reset customers", e);
        }
    }

    // 4. Reset Saving Plans lastAppliedAt to avoid instant deduction on next load
    // But do NOT delete them.
    const rawPlans = localStorage.getItem('cw_saving_plans');
    if (rawPlans) {
        try {
            const plans = JSON.parse(rawPlans);
            // Just update timestamp, keep definitions
            const updatedPlans = plans.map((p: any) => ({ ...p, lastAppliedAt: new Date().toISOString().split('T')[0] }));
            localStorage.setItem('cw_saving_plans', JSON.stringify(updatedPlans));
        } catch (e) { console.error(e); }
    }

    window.location.reload();
};
