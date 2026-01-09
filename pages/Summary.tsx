
import React, { useState, useMemo } from 'react';
import { Record, LedgerEntry } from '../types';
import { formatCurrency, getLocalDate } from '../utils';
import { Wallet, AlertOctagon, RefreshCw, BarChart3, Trash2, Coffee, Clock, StopCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { getLedgerStatsForPeriod } from '../accounting_core';

interface SummaryProps {
  records: Record[];
  onResetToday: () => void;
  onCloseDay?: () => void;
  ledger?: LedgerEntry[];
}

const Summary: React.FC<SummaryProps> = ({ onResetToday, onCloseDay, ledger = [] }) => {
  const [confirmReset, setConfirmReset] = useState(false);

  // --- USE LEDGER FOR TOTALS ---
  const today = getLocalDate();
  const ledgerStats = useMemo(() => getLedgerStatsForPeriod(ledger, today, today), [ledger, today]);

  const handleResetClick = () => {
    if (confirmReset) {
      onResetToday();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
              <h2 className="text-2xl font-bold text-gray-800">ملخص اليوم</h2>
              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full w-fit mt-1">
                {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
          </div>
          {onCloseDay && (
              <Button onClick={() => onCloseDay()} size="sm" className="bg-gray-800 hover:bg-black text-white shadow">
                  <StopCircle size={16} className="ml-1" /> إغلاق اليوم
              </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Revenue (Source: Ledger) */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-700 font-medium mb-1">الواصل اليوم</p>
                <h3 className="text-3xl font-bold text-emerald-800">{formatCurrency(ledgerStats.income)}</h3>
              </div>
              <div className="bg-white/50 p-3 rounded-full text-emerald-600">
                <Wallet size={28} />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-emerald-200/50 flex justify-between text-xs text-emerald-800">
               <div className="flex items-center">
                 <Clock size={14} className="ml-1 opacity-70" />
                 جلسات: {formatCurrency(ledgerStats.sessionIncome)}
               </div>
               <div className="flex items-center">
                 <Coffee size={14} className="ml-1 opacity-70" />
                 منتجات: {formatCurrency(ledgerStats.productIncome)}
               </div>
            </div>
          </div>

          {/* Debt (Source: Ledger DEBT_CREATE) */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-700 font-medium mb-1">ديون اليوم</p>
                <h3 className="text-3xl font-bold text-red-800">{formatCurrency(ledgerStats.debtCreated)}</h3>
              </div>
              <div className="bg-white/50 p-3 rounded-full text-red-600">
                <AlertOctagon size={28} />
              </div>
            </div>
            <div className="mt-4 text-xs text-red-700 font-medium">
              تم تحصيل ديون قديمة بقيمة: {formatCurrency(ledgerStats.debtPaid)}
            </div>
          </div>

          {/* Net Cash (Source: Ledger) */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
             <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 font-medium mb-1">صافي الكاش (الخزينة)</p>
                <h3 className="text-3xl font-bold text-blue-800">{formatCurrency(ledgerStats.totalNetCash)}</h3>
              </div>
              <div className="bg-white/50 p-3 rounded-full text-blue-600">
                <BarChart3 size={28} />
              </div>
            </div>
            <div className="mt-4 text-xs text-blue-700 font-medium">
                تغير الكاش اليوم: {ledgerStats.netCashFlow >= 0 ? '+' : ''}{formatCurrency(ledgerStats.netCashFlow)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button 
          onClick={handleResetClick} 
          variant={confirmReset ? "danger" : "outline"}
          className={confirmReset ? "animate-pulse" : "text-gray-500 border-gray-300 hover:border-red-300 hover:text-red-500"}
        >
          {confirmReset ? (
            <>
              <Trash2 className="ml-2 w-4 h-4" />
              تأكيد حذف سجلات اليوم؟
            </>
          ) : (
            <>
              <RefreshCw className="ml-2 w-4 h-4" />
              تصفير سجلات اليوم
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Summary;
