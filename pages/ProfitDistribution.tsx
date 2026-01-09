
import React, { useMemo } from 'react';
import { Record, Purchase, DebtItem, Expense, PricingConfig, PlaceLoan, LedgerEntry, TransactionType } from '../types';
import { formatCurrency } from '../utils';
import { Users, PieChart, Banknote, Landmark, Coffee, ShoppingBag, Zap, Calculator, User } from 'lucide-react';
import { calcLedgerInventory } from '../accounting_core';

interface ProfitDistributionProps {
  records: Record[];
  purchases: Purchase[];
  debtsList: DebtItem[];
  expenses: Expense[];
  pricingConfig: PricingConfig;
  placeLoans?: PlaceLoan[];
  ledger: LedgerEntry[];
}

const ProfitDistribution: React.FC<ProfitDistributionProps> = ({ expenses, pricingConfig, ledger, records }) => {
  
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = today.slice(0, 7) + '-01';
  
  const preview = useMemo(() => {
      return calcLedgerInventory(ledger, records, startOfMonth, today, expenses, pricingConfig);
  }, [ledger, records, expenses, pricingConfig, startOfMonth, today]);

  const partnerFundedTotal = useMemo(() => {
    return ledger.filter(e => 
      e.dateKey >= startOfMonth && 
      e.dateKey <= today && 
      e.type === TransactionType.PARTNER_DEPOSIT && 
      e.description.includes('شراء')
    ).reduce((s, e) => s + (e.amount || 0), 0);
  }, [ledger, startOfMonth, today]);

  if (!preview) return <div>Loading...</div>;

  return (
    <div className="space-y-8 animate-fade-in text-gray-900 pb-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
                <PieChart size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-800">توزيع الأرباح (معاينة حية)</h2>
                <p className="text-gray-500 text-sm font-medium">حساب الأرباح بعد خصم تكلفة المواد والالتزامات.</p>
            </div>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
           <div className="flex justify-between items-start mb-4">
               <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600"><Banknote size={24}/></div>
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">متوفر كاش</span>
           </div>
           <div className="text-3xl font-black text-gray-800">{formatCurrency(preview.netCashInPlace)}</div>
           <p className="text-xs text-gray-400 mt-2 font-bold">السيولة النقدية في الدرج حالياً</p>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
           <div className="flex justify-between items-start mb-4">
               <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Landmark size={24}/></div>
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">متوفر بنك</span>
           </div>
           <div className="text-3xl font-black text-gray-800">{formatCurrency(preview.netBankInPlace)}</div>
           <p className="text-xs text-gray-400 mt-2 font-bold">إجمالي أرصدة الحسابات البنكية</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-[28px] text-white shadow-xl shadow-indigo-100">
           <div className="flex justify-between items-start mb-4">
               <div className="bg-white/20 p-2 rounded-xl text-white"><Calculator size={24}/></div>
               <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">صافي الربح المتاح</span>
           </div>
           <div className="text-3xl font-black">{formatCurrency(preview.netProfitPaid)}</div>
           <p className="text-xs text-indigo-100/70 mt-2 font-bold">المبلغ القابل للتوزيع على الشركاء</p>
        </div>
      </div>

      {/* Advanced Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-sm">
              <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2">
                  <ShoppingBag className="text-rose-500" size={20}/>
                  خصومات التكلفة والمواد
              </h3>
              <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Coffee size={18}/></div>
                          <span className="font-bold text-gray-700">تكلفة المواد الخام (شاي، قهوة، سكر...)</span>
                      </div>
                      <span className="font-black text-rose-600">{formatCurrency(preview.totalDrinksCost)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Zap size={18}/></div>
                          <span className="font-bold text-gray-700">تكلفة التشغيل (المكان والكهرباء)</span>
                      </div>
                      <span className="font-black text-rose-600">{formatCurrency(preview.totalPlaceCost + preview.totalExpenses - partnerFundedTotal)}</span>
                  </div>
                  {partnerFundedTotal > 0 && (
                    <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><User size={18}/></div>
                            <span className="font-bold text-indigo-700">مشتريات ممولة من الشركاء (تخصم من الربح)</span>
                        </div>
                        <span className="font-black text-indigo-800">{formatCurrency(partnerFundedTotal)}</span>
                    </div>
                  )}
                  <div className="bg-gray-900 p-4 rounded-2xl text-white flex items-center justify-between shadow-lg">
                      <span className="text-xs font-black text-gray-400">إجمالي المبالغ المستردة للمكان</span>
                      <span className="text-lg font-black">{formatCurrency(preview.totalDrinksCost + preview.totalPlaceCost + preview.totalExpenses)}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold leading-relaxed px-2 italic">
                      * تكلفة المواد والتشغيل تخصم من إجمالي المبيعات قبل توزيع الربح، ويتم تعويض الممول بها لاحقاً.
                  </p>
              </div>
          </div>

          <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                  <Users className="text-gray-600" size={20} />
                  <h3 className="font-black text-gray-800">توزيع الحصص الصافية</h3>
              </div>
              <div className="flex-1 overflow-x-auto">
                  <table className="min-w-full text-right text-sm">
                      <thead className="bg-gray-50/50">
                          <tr>
                              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">الشريك</th>
                              <th className="px-4 py-4 text-[10px] font-black text-emerald-600 uppercase">حصة كاش</th>
                              <th className="px-4 py-4 text-[10px] font-black text-blue-600 uppercase">حصة بنك</th>
                              <th className="px-6 py-4 text-[10px] font-black text-gray-800 uppercase">الإجمالي</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {preview.partners.map((partner) => (
                              <tr key={partner.name} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-gray-800">{partner.name}</td>
                                  <td className="px-4 py-4 font-black text-emerald-700">{formatCurrency(partner.finalPayoutCash)}</td>
                                  <td className="px-4 py-4 font-black text-blue-700">{formatCurrency(partner.finalPayoutBank)}</td>
                                  <td className="px-6 py-4 font-black text-indigo-700 text-lg">{formatCurrency(partner.finalPayoutTotal)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ProfitDistribution;
