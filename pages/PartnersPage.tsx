
import React, { useState } from 'react';
import { InventorySnapshot, Purchase, DebtItem, PlaceLoan, CashTransfer, LedgerEntry } from '../types';
import { Users } from 'lucide-react';
import { formatCurrency, formatFullDate } from '../utils';
import { getPartnerStats } from '../accounting_core';

interface PartnersPageProps {
  snapshots: InventorySnapshot[];
  purchases: Purchase[];
  debts: DebtItem[];
  placeLoans: PlaceLoan[];
  cashTransfers: CashTransfer[];
  ledger: LedgerEntry[];
}

const PARTNERS = [
    { id: 'abu_khaled', name: 'أبو خالد', percent: 34 },
    { id: 'khaled', name: 'خالد', percent: 33 },
    { id: 'abdullah', name: 'عبد الله', percent: 33 }
];

const PartnersPage: React.FC<PartnersPageProps> = ({ ledger }) => {
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'cash' | 'bank'>('all');

  const activeStats = selectedPartner ? getPartnerStats(ledger, selectedPartner) : null;
  
  // Adjusted filter logic to include receivables if they match the description criteria
  const activeLedger = activeStats ? activeStats.entries.filter(i => {
      if (ledgerFilter === 'all') return true;
      
      // Standard check
      if (i.channel === ledgerFilter) return true;
      
      // Smart check for Partner Purchases (Receivables)
      if (i.channel === 'receivable') {
          const desc = i.description || '';
          const isCash = desc.includes('كاش') || desc.includes('Cash');
          // If filtering for cash, show receivables marked as cash
          if (ledgerFilter === 'cash' && isCash) return true;
          // If filtering for bank, show receivables NOT marked as cash (assumed bank)
          if (ledgerFilter === 'bank' && !isCash) return true;
      }
      
      return false;
  }).sort((a,b) => b.timestamp.localeCompare(a.timestamp)) : [];

  const getChannelDisplay = (item: LedgerEntry) => {
      if (item.channel === 'cash') return { icon: BanknoteIcon, text: 'كاش', color: 'text-emerald-600' };
      if (item.channel === 'bank') return { icon: LandmarkIcon, text: 'بنك', color: 'text-blue-600' };
      
      // Handle Receivable (Partner Purchases)
      if (item.channel === 'receivable') {
          if (item.description.includes('كاش') || item.description.includes('Cash')) {
               return { icon: BanknoteIcon, text: 'كاش (شريك)', color: 'text-emerald-600' };
          }
          if (item.description.includes('بنك') || item.description.includes('Bank')) {
               return { icon: LandmarkIcon, text: 'بنك (شريك)', color: 'text-blue-600' };
          }
          return { icon: LandmarkIcon, text: 'ذمم', color: 'text-gray-600' };
      }
      return { icon: LandmarkIcon, text: 'أخرى', color: 'text-gray-600' };
  };

  return (
    <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-indigo-600"/> الشركاء وتوزيع الأرباح
            </h2>
            <p className="text-gray-500 text-sm mt-1">سجل كامل للمستحقات والمسحوبات لكل شريك (كاش / بنك) بناءً على السجل المالي.</p>
        </div>

        {/* Partner Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PARTNERS.map(p => {
                const stats = getPartnerStats(ledger, p.id);
                return (
                <div 
                    key={p.id} 
                    onClick={() => setSelectedPartner(selectedPartner === p.id ? null : p.id)}
                    className={`rounded-2xl border p-5 cursor-pointer transition-all ${selectedPartner === p.id ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-200' : 'bg-white border-gray-200 hover:border-indigo-100 hover:shadow-md'}`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-bold">{p.percent}%</span>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg border border-red-100">
                            <span className="text-red-700 font-bold">مسحوبات</span>
                            <span className="font-extrabold text-red-900 ltr">{formatCurrency(stats.withdrawals)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg border border-green-100">
                            <span className="text-green-700 font-bold">استرداد</span>
                            <span className="font-extrabold text-green-900 ltr">{formatCurrency(stats.repayments)}</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                            <span>الصافي الحالي</span>
                            <span className={`font-bold text-sm ${stats.currentNet > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(Math.abs(stats.currentNet))}
                                {stats.currentNet !== 0 && <span className="text-xs mr-1">{stats.currentNet > 0 ? '(عليه)' : '(له)'}</span>}
                            </span>
                        </div>
                    </div>
                </div>
            )})}
        </div>

        {/* Ledger View */}
        {activeStats && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">سجل العمليات: {PARTNERS.find(p=>p.id===selectedPartner)?.name}</h3>
                        <p className="text-xs text-gray-500">جميع الحركات المالية المسجلة في النظام.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setLedgerFilter('all')} className={`px-3 py-1.5 text-xs font-bold rounded ${ledgerFilter === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>الكل</button>
                            <button onClick={() => setLedgerFilter('cash')} className={`px-3 py-1.5 text-xs font-bold rounded ${ledgerFilter === 'cash' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}>كاش</button>
                            <button onClick={() => setLedgerFilter('bank')} className={`px-3 py-1.5 text-xs font-bold rounded ${ledgerFilter === 'bank' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>بنك</button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">التاريخ</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">النوع</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">القناة</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">البيان</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {activeLedger.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">لا يوجد عمليات مسجلة</td>
                                </tr>
                            ) : (
                                activeLedger.map(item => {
                                    const display = getChannelDisplay(item);
                                    const Icon = display.icon;
                                    return (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                            {formatFullDate(item.dateKey)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold">
                                                {item.type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`flex items-center gap-1 text-xs font-bold ${display.color}`}>
                                                <Icon size={12}/> {display.text}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-800">
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-bold dir-ltr text-right">
                                            {item.amount > 0 ? formatCurrency(item.amount) : formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};

const BanknoteIcon = ({size}: {size:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>;
const LandmarkIcon = ({size}: {size:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><line x1="6" y1="21" x2="6" y2="10"/><line x1="18" y1="21" x2="18" y2="10"/><line x1="6" y1="6" x2="18" y2="6"/><path d="M6 6L12 3L18 6"/><line x1="12" y1="21" x2="12" y2="10"/></svg>;

export default PartnersPage;
