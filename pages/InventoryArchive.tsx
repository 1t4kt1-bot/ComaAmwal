
import React, { useState } from 'react';
import { InventorySnapshot, Record, SystemState, Expense, Purchase, DebtItem, PricingConfig, PlaceLoan, LedgerEntry } from '../types';
import { formatCurrency } from '../utils';
import { 
  Archive, ChevronDown, ChevronUp, Calendar, Trash2, Download, 
  RefreshCw, BarChart3, TrendingUp, Database, Fingerprint, Tag, 
  AlertTriangle, Clock, Banknote, Landmark, TrendingDown, 
  Coffee, ShoppingBag, Zap, Calculator, Users 
} from 'lucide-react';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { getSnapshotDistributionTotals } from '../accounting_core';

// @ts-ignore
import * as XLSX from 'xlsx';

interface InventoryArchiveProps {
  snapshots: InventorySnapshot[];
  onUpdateSnapshots?: (newSnapshots: InventorySnapshot[]) => void;
  records: Record[];
  expenses: Expense[];
  purchases: Purchase[];
  debtsList: DebtItem[];
  pricingConfig: PricingConfig;
  placeLoans: PlaceLoan[];
  onDelete: (id: string) => void;
  systemState?: SystemState;
  ledger: LedgerEntry[];
}

const InventoryArchive: React.FC<InventoryArchiveProps> = ({ 
    snapshots, onDelete
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleExportExcel = (snapshot: InventorySnapshot) => {
      // 1. Summary Sheet Data
      const summaryData = [
          { 'البيان': 'معرف الأرشيف', 'القيمة': snapshot.archiveId },
          { 'البيان': 'تاريخ الأرشفة', 'القيمة': new Date(snapshot.createdAt).toLocaleDateString('ar-SA') },
          { 'البيان': 'الفترة من', 'القيمة': snapshot.periodStart },
          { 'البيان': 'الفترة إلى', 'القيمة': snapshot.periodEnd },
          { 'البيان': '', 'القيمة': '' }, // Spacer
          { 'البيان': 'إجمالي الإيرادات (المحصلة)', 'القيمة': snapshot.totalPaidRevenue },
          { 'البيان': 'إجمالي المصاريف', 'القيمة': snapshot.totalExpenses },
          { 'البيان': 'سداد الالتزامات (قروض)', 'القيمة': snapshot.totalLoanRepayments || 0 },
          { 'البيان': 'الادخار (مخصوم من الربح)', 'القيمة': snapshot.totalSavings || 0 },
          { 'البيان': 'تكلفة البضاعة والتشغيل', 'القيمة': (snapshot.totalDrinksCost || 0) + (snapshot.totalPlaceCost || 0) + (snapshot.totalCardsCost || 0) },
          { 'البيان': 'الربح الإجمالي (Gross)', 'القيمة': snapshot.grossProfit },
          { 'البيان': 'مبلغ التطوير المخصوم', 'القيمة': snapshot.devCut },
          { 'البيان': 'صافي الربح الموزع', 'القيمة': snapshot.netProfitPaid },
          { 'البيان': '', 'القيمة': '' }, // Spacer
          { 'البيان': 'صافي الكاش (في الدرج)', 'القيمة': snapshot.netCashInPlace },
          { 'البيان': 'صافي البنك (في الحسابات)', 'القيمة': snapshot.netBankInPlace },
          { 'البيان': 'إجمالي السيولة', 'القيمة': (snapshot.netCashInPlace || 0) + (snapshot.netBankInPlace || 0) },
      ];

      // 2. Partners Sheet Data
      const partnersData = snapshot.partners.map(p => ({
          'اسم الشريك': p.name,
          'النسبة %': p.sharePercent * 100 + '%',
          'الحصة الأساسية': p.baseShare,
          'حصة كاش متاحة': p.cashShareAvailable,
          'حصة بنك متاحة': p.bankShareAvailable,
          'استرداد مشتريات (+)': p.purchasesReimbursement,
          'مسحوبات مخصومة (-)': p.placeDebtDeducted,
          'سداد قروض (+)': (p.loanRepaymentCash || 0) + (p.loanRepaymentBank || 0),
          'صافي الاستحقاق (كاش)': p.finalPayoutCash,
          'صافي الاستحقاق (بنك)': p.finalPayoutBank,
          'الإجمالي النهائي': p.finalPayoutTotal
      }));

      // 3. Expenses Sheet Data (Combined)
      const allExpenses = [
          ...(snapshot.expensesDetails?.fixed || []).map(e => ({ 'النوع': 'التزام شهري', 'البيان': e.name, 'المبلغ': e.amount, 'التاريخ': '-' })),
          ...(snapshot.expensesDetails?.oneTime || []).map(e => ({ 'النوع': 'مصروف طارئ/تشغيلي', 'البيان': e.name, 'المبلغ': e.amount, 'التاريخ': e.date })),
          ...(snapshot.expensesDetails?.autoPurchases || []).map(e => ({ 'النوع': 'مشتريات تلقائية', 'البيان': e.name, 'المبلغ': e.amount, 'التاريخ': e.date })),
          ...(snapshot.expensesDetails?.loanRepayments || []).map(e => ({ 'النوع': 'سداد قروض', 'البيان': e.name, 'المبلغ': e.amount, 'التاريخ': e.date })),
      ];

      const wb = XLSX.utils.book_new();
      
      // Helper to add sheet with RTL
      const addSheet = (data: any[], name: string) => {
          const ws = XLSX.utils.json_to_sheet(data);
          if(!ws['!views']) ws['!views'] = [];
          ws['!views'].push({ rightToLeft: true });
          XLSX.utils.book_append_sheet(wb, ws, name);
      };

      addSheet(summaryData, "الملخص العام");
      addSheet(partnersData, "توزيع الشركاء");
      addSheet(allExpenses, "تفاصيل المصاريف");

      XLSX.writeFile(wb, `Archive_Report_${snapshot.archiveId || snapshot.periodEnd}.xlsx`);
  };

  // Helper to render value or dash
  const renderVal = (val: any, isCurrency = true) => {
      if (val === undefined || val === null) return <span className="text-gray-300">—</span>;
      return isCurrency ? formatCurrency(Number(val)) : val;
  };

  if (snapshots.length === 0) return <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300"><Archive className="mx-auto h-16 w-16 text-gray-300 mb-4"/><h3 className="text-lg font-bold text-gray-800">لا يوجد أرشيف</h3></div>;

  return (
    <div className="space-y-6 animate-fade-in text-gray-900 pb-10">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><Archive size={24} /></div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800">سجل الأرشيف والتوثيق العميق</h2>
                <p className="text-gray-500 text-sm mt-1">عرض تفصيلي لكافة البيانات المحفوظة في سجلات الأرشفة السابقة.</p>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        {snapshots.slice().reverse().map(snapshot => {
          const partnersCount = snapshot.partners?.length || 0;
          const { totalCashDist, totalBankDist } = getSnapshotDistributionTotals(snapshot);
          const isLoss = snapshot.netProfitPaid < 0;

          return (
            <div key={snapshot.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              
              {/* Header Card */}
              <div 
                onClick={() => toggleExpand(snapshot.id)}
                className={`p-5 flex flex-col md:flex-row items-center justify-between cursor-pointer transition-colors group ${expandedId === snapshot.id ? 'bg-indigo-50 border-b border-indigo-100' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className={`p-3 rounded-full ${expandedId === snapshot.id ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-600'}`}>
                      <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        أرشيف {snapshot.periodEnd.slice(0, 7)}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-bold uppercase tracking-tight">{snapshot.archiveId || 'DOC'}</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock size={12}/> {new Date(snapshot.createdAt).toLocaleDateString('ar-SA')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 mt-4 md:mt-0">
                   <div className="text-center">
                      <p className={`text-[10px] font-black uppercase mb-1 ${isLoss ? 'text-rose-500' : 'text-gray-500'}`}>
                          {isLoss ? 'صافي الخسارة (عجز)' : 'صافي الربح'}
                      </p>
                      <p className={`text-lg font-black ${isLoss ? 'text-rose-700' : 'text-indigo-700'}`}>
                          {formatCurrency(Math.abs(snapshot.netProfitPaid))}
                      </p>
                   </div>
                   <div className="flex items-center gap-2 border-r pr-4 border-gray-200">
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleExportExcel(snapshot); }} className="h-9 px-3">
                          <Download size={14} className="ml-1"/> Excel
                      </Button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(snapshot.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                       {expandedId === snapshot.id ? <ChevronUp className="text-indigo-600"/> : <ChevronDown className="text-gray-400"/>}
                   </div>
                </div>
              </div>

              {/* EXPANDED DETAILS */}
              {expandedId === snapshot.id && (
                <div className="p-6 bg-gray-50/30 animate-fade-in space-y-6">
                  
                  {/* Banner */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                      <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                      <p className="text-xs font-bold text-amber-800 leading-relaxed">
                          تنبيه: كافة البيانات أدناه هي سجلات توثيقية مخزنة وقت الأرشفة لضمان دقة التقارير التاريخية.
                      </p>
                  </div>

                  {/* 1. Meta Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Fingerprint size={12}/> معرف العملية</p>
                          <p className="text-xs font-mono font-bold text-gray-700 break-all">{snapshot.id}</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Tag size={12}/> كود الأرشيف</p>
                          <p className="text-sm font-bold text-gray-800">{snapshot.archiveId || '—'}</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> تاريخ الأرشفة</p>
                          <p className="text-sm font-bold text-gray-800">{new Date(snapshot.createdAt).toLocaleString('ar-SA')}</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1"><RefreshCw size={12}/> نوع الأرشفة</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${snapshot.type === 'auto' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {snapshot.type === 'auto' ? 'تلقائي' : 'يدوي'}
                          </span>
                      </div>
                  </div>

                  {/* 2. Advanced Profit Breakdown */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className={`px-4 py-3 flex justify-between items-center ${isLoss ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                          <h4 className="font-bold text-white text-sm flex items-center gap-2">
                              {isLoss ? <TrendingDown size={16}/> : <BarChart3 size={16}/>}
                              تفاصيل المحاسبة للتقرير (بيانات مخزنة)
                          </h4>
                      </div>
                      <div className="p-0 overflow-x-auto">
                          <table className="min-w-full text-right text-sm">
                              <thead className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase">
                                  <tr>
                                      <th className="px-4 py-2 border-b">البيان</th>
                                      <th className="px-4 py-2 border-b">القيمة المسجلة</th>
                                      <th className="px-4 py-2 border-b">ملاحظات</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  <tr>
                                      <td className="px-4 py-3 text-gray-600">إجمالي الإيرادات الموزعة</td>
                                      <td className="px-4 py-3 font-bold text-gray-900">{renderVal(snapshot.totalPaidRevenue)}</td>
                                      <td className="text-[10px] text-gray-400 px-4">مجموع مبيعات الجلسات والطلبات</td>
                                  </tr>
                                  <tr>
                                      <td className="px-4 py-3 text-gray-600">المصاريف والتكاليف المقتطعة</td>
                                      <td className="px-4 py-3 font-bold text-red-600">{renderVal((snapshot.totalExpenses || 0) + (snapshot.totalLoanRepayments || 0) + (snapshot.totalSavings || 0) + (snapshot.totalDrinksCost || 0) + (snapshot.totalPlaceCost || 0) + (snapshot.totalCardsCost || 0) + (snapshot.electricityCost || 0))}</td>
                                      <td className="text-[10px] text-gray-400 px-4">شاملة الكهرباء والادخار والبضاعة</td>
                                  </tr>
                                  <tr className="bg-gray-50/50">
                                      <td className="px-4 py-3 text-gray-600 font-bold">الربح الإجمالي (Gross)</td>
                                      <td className={`px-4 py-3 font-black ${snapshot.grossProfit < 0 ? 'text-rose-600' : 'text-gray-900'}`}>{renderVal(snapshot.grossProfit)}</td>
                                      <td className="text-[10px] text-gray-400 px-4">قبل خصم نسبة التطوير</td>
                                  </tr>
                                  <tr>
                                      <td className="px-4 py-3 text-gray-600 flex items-center gap-2">مبلغ التطوير ({snapshot.devPercentSnapshot || '—'}%)</td>
                                      <td className="px-4 py-3 font-bold text-amber-600">{renderVal(snapshot.devCut)}</td>
                                      <td className="text-[10px] text-gray-400 px-4">الحصة المجنبة للمكان</td>
                                  </tr>
                                  <tr className={`${isLoss ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'} border-t-2`}>
                                      <td className={`px-4 py-3 font-black ${isLoss ? 'text-rose-900' : 'text-indigo-900'}`}>{isLoss ? 'صافي الخسارة والعجز الموزع' : 'صافي الربح الصافي الموزع'}</td>
                                      <td className={`px-4 py-3 font-black text-lg ${isLoss ? 'text-rose-700' : 'text-indigo-700'}`}>{formatCurrency(Math.abs(snapshot.netProfitPaid))}</td>
                                      <td className={`text-[10px] px-4 font-bold italic ${isLoss ? 'text-rose-400' : 'text-indigo-400'}`}>المبلغ النهائي المعتمد للتوزيع</td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  </div>

                  {/* 3. Operational Depth */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Revenue Details */}
                      <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden">
                          <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 font-bold text-xs text-emerald-800 flex items-center gap-2">
                              <TrendingUp size={14}/> تفصيل الإيرادات (المحفوظة)
                          </div>
                          <div className="p-4 space-y-3">
                              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                  <span className="text-gray-500">إيراد الجلسات</span>
                                  <span className="font-bold text-gray-800">{renderVal(snapshot.revenueDetails?.sessions)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                  <span className="text-gray-500">إيراد المشروبات</span>
                                  <span className="font-bold text-gray-800">{renderVal(snapshot.revenueDetails?.drinks)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-500">إيراد البطاقات</span>
                                  <span className="font-bold text-gray-800">{renderVal(snapshot.revenueDetails?.cards)}</span>
                              </div>
                          </div>
                      </div>

                      {/* Source State */}
                      <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
                          <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 font-bold text-xs text-blue-800 flex items-center gap-2">
                              <Database size={14}/> حالة الموجودات وقت الأرشفة
                          </div>
                          <div className="p-4 space-y-3 text-sm">
                              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                  <span className="text-gray-500">صافي الكاش في الدرج</span>
                                  <span className="font-bold text-emerald-600">{renderVal(snapshot.netCashInPlace)}</span>
                              </div>
                              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                  <span className="text-gray-500">صافي البنك/التطبيقات</span>
                                  <span className="font-bold text-blue-600">{renderVal(snapshot.netBankInPlace)}</span>
                              </div>
                              <div className="flex justify-between items-center font-bold">
                                  <span className="text-gray-800">إجمالي السيولة المسجلة</span>
                                  <span className="text-gray-900 underline decoration-indigo-300">{formatCurrency((snapshot.netCashInPlace || 0) + (snapshot.netBankInPlace || 0))}</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* 4. SOURCE-BASED DISTRIBUTION */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Cash Distribution Card */}
                      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden flex flex-col">
                          <div className="bg-emerald-50 px-5 py-4 border-b border-emerald-100 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700"><Banknote size={20}/></div>
                                  <h4 className="font-bold text-emerald-900 text-sm">توزيع الكاش (الموثق)</h4>
                              </div>
                              <div className="text-right">
                                  <p className="text-[10px] text-emerald-600 font-bold uppercase">إجمالي الكاش الموزع</p>
                                  <p className="font-black text-emerald-700">{formatCurrency(totalCashDist)}</p>
                              </div>
                          </div>
                          <div className="p-4 flex-1">
                              {partnersCount > 0 ? (
                                  <table className="min-w-full text-right text-sm">
                                      <thead className="text-gray-400 text-[10px] font-bold uppercase border-b border-gray-50">
                                          <tr>
                                              <th className="pb-2 px-2">الشريك</th>
                                              <th className="pb-2 px-2">الحصة المسجلة</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50">
                                          {snapshot.partners.map((p, idx) => (
                                              <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                                  <td className="py-3 px-2 font-bold text-gray-700">{p.name}</td>
                                                  <td className="py-3 px-2 font-mono text-emerald-600 font-bold">{renderVal(p.finalPayoutCash)}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              ) : <p className="text-center py-6 text-gray-400 text-xs italic">لا توجد بيانات توزيع.</p>}
                          </div>
                      </div>

                      {/* Transfer/Bank Distribution Card */}
                      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden flex flex-col">
                          <div className="bg-blue-50 px-5 py-4 border-b border-blue-100 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className="bg-blue-100 p-2 rounded-lg text-blue-700"><Landmark size={20}/></div>
                                  <h4 className="font-bold text-blue-900 text-sm">توزيع التحويل (الموثق)</h4>
                              </div>
                              <div className="text-right">
                                  <p className="text-[10px] text-blue-600 font-bold uppercase">إجمالي التحويل الموزع</p>
                                  <p className="font-black text-blue-700">{formatCurrency(totalBankDist)}</p>
                              </div>
                          </div>
                          <div className="p-4 flex-1">
                              {partnersCount > 0 ? (
                                  <table className="min-w-full text-right text-sm">
                                      <thead className="text-gray-400 text-[10px] font-bold uppercase border-b border-gray-50">
                                          <tr>
                                              <th className="pb-2 px-2">الشريك</th>
                                              <th className="pb-2 px-2">الحصة المسجلة</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50">
                                          {snapshot.partners.map((p, idx) => (
                                              <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                  <td className="py-3 px-2 font-bold text-gray-700">{p.name}</td>
                                                  <td className="py-3 px-2 font-mono text-blue-600 font-bold">{renderVal(p.finalPayoutBank)}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              ) : <p className="text-center py-6 text-gray-400 text-xs italic">لا توجد بيانات توزيع.</p>}
                          </div>
                      </div>
                  </div>

                  {/* 5. RAW DATA EXPLORER (Accordion) */}
                  <div className="bg-gray-100/50 rounded-xl border border-gray-200 overflow-hidden">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowRaw(showRaw === snapshot.id ? null : snapshot.id); }}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-200/50 transition-colors"
                      >
                          <div className="flex items-center gap-2 font-bold text-xs text-gray-600 uppercase tracking-widest">
                             <Database size={14}/> استعراض البيانات الخام (Raw Details)
                          </div>
                          {showRaw === snapshot.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </button>
                      
                      {showRaw === snapshot.id && (
                          <div className="p-4 animate-fade-in border-t border-gray-200">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                {Object.entries(snapshot).map(([key, val]) => {
                                    const isComplex = typeof val === 'object' && val !== null;
                                    const displayVal = isComplex ? `JSON (${Object.keys(val as object).length} حقول)` : String(val);
                                    
                                    return (
                                        <div key={key} className="flex justify-between border-b border-gray-100 py-1 text-[10px]">
                                            <span className="font-mono text-indigo-600">{key}:</span>
                                            <span className="font-bold text-gray-700 truncate max-w-[200px]" title={String(val)}>{displayVal}</span>
                                        </div>
                                    );
                                })}
                             </div>
                          </div>
                      )}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={() => { if(deleteId) onDelete(deleteId); }} 
        message="هل أنت متأكد من حذف هذا السجل من الأرشيف؟ سيتم حذف نسخة التوثيق هذه نهائياً ولا يمكن التراجع." 
      />
    </div>
  );
};

export default InventoryArchive;
