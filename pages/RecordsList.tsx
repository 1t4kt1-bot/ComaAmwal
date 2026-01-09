

import React, { useState, useEffect } from 'react';
import { Record, BankAccount, SystemState, Order } from '../types';
import { Search, CheckCircle, AlertCircle, Coffee, ChevronDown, ChevronUp, Coins, Edit2, Trash2, Wifi, StopCircle, ArrowLeft, AlertTriangle, Calendar, X, Filter, List, Wallet, UserCheck } from 'lucide-react';
import { formatCurrency, formatDuration, getLocalDate } from '../utils';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';

interface RecordsListProps {
  records: Record[];
  dailyClosings?: any[];
  bankAccounts: BankAccount[];
  systemState?: SystemState;
  onCloseDay?: () => void;
  onRepayDebt: (recordId: string, amount: number, type: 'cash'|'bank', details?: any) => void;
  onStartNewDay?: () => void;
  onEditOrder?: (record: Record, order: Order) => void;
  onDeleteOrder?: (record: Record, orderId: string) => void;
}

const RecordsList: React.FC<RecordsListProps> = ({ records, bankAccounts, onRepayDebt, systemState, onEditOrder, onDeleteOrder, onCloseDay }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Date Filter State
  const [viewDate, setViewDate] = useState<string>(systemState?.currentDate || getLocalDate());
  const [isDateFilterActive, setIsDateFilterActive] = useState(true);

  // Sync viewDate if system date changes
  useEffect(() => {
      if (systemState?.currentDate) {
          setViewDate(systemState.currentDate);
          setIsDateFilterActive(true);
      }
  }, [systemState?.currentDate]);
  
  // Repayment Modal
  const [repayModal, setRepayModal] = useState<{ record: Record | null }>({ record: null });
  const [repayData, setRepayData] = useState({ amount: '', type: 'cash', bankAccountId: '', senderPhone: '', senderAccountName: '' });

  const toLocalYMD = (isoString: string) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      const offset = date.getTimezoneOffset() * 60000;
      const local = new Date(date.getTime() - offset);
      return local.toISOString().slice(0, 10);
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = searchTerm === '' || 
        record.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (record.customerPhone && record.customerPhone.includes(searchTerm));

    if (!matchesSearch) return false;

    if (statusFilter === 'paid' && !record.isPaid) return false;
    if (statusFilter === 'unpaid' && record.isPaid) return false;

    if (!isDateFilterActive) return true;
    if (searchTerm !== '') return true; 
    if (statusFilter === 'unpaid') return true;

    const recordEndDate = toLocalYMD(record.endTime);
    const recordStartDate = toLocalYMD(record.startTime);
    return recordEndDate === viewDate || recordStartDate === viewDate;

  }).sort((a, b) => b.timestamp - a.timestamp);

  const openRepay = (record: Record) => {
      setRepayModal({ record });
      setRepayData({ amount: record.remainingDebt.toString(), type: 'cash', bankAccountId: '', senderPhone: record.customerPhone || '', senderAccountName: '' });
  };

  const handleRepaySubmit = () => {
      if (!repayModal.record) return;
      
      const amount = parseFloat(repayData.amount);
      if (repayData.type === 'bank') {
          if (!repayData.bankAccountId || !repayData.senderPhone || !repayData.senderAccountName) {
              return;
          }
      }
      
      onRepayDebt(repayModal.record.id, amount, repayData.type as 'cash'|'bank', {
          bankAccountId: repayData.bankAccountId,
          senderPhone: repayData.senderPhone,
          senderAccountName: repayData.senderAccountName
      });
      setRepayModal({ record: null });
  };

  const isRepayDisabled = !repayData.amount || parseFloat(repayData.amount) <= 0 || (repayData.type === 'bank' && (!repayData.bankAccountId || !repayData.senderPhone || !repayData.senderAccountName));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-soft">
          <div>
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                  <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><Filter size={24}/></div>
                  سجل الجلسات والأرشيف
              </h2>
              <p className="text-sm text-gray-500 mt-1 font-medium pr-1">
                  {isDateFilterActive 
                    ? `عرض سجلات يوم: ${viewDate}` 
                    : 'عرض الأرشيف الكامل (جميع التواريخ)'}
              </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                  {isDateFilterActive ? (
                      <>
                        <div className="relative group">
                            <input 
                                type="date" 
                                value={viewDate} 
                                onChange={(e) => setViewDate(e.target.value)} 
                                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-indigo-500 transition-colors cursor-pointer hover:border-indigo-300"
                            />
                            <Calendar size={16} className="absolute left-3 top-2.5 text-gray-400 group-hover:text-indigo-500 pointer-events-none transition-colors"/>
                        </div>
                        <button 
                            onClick={() => setIsDateFilterActive(false)} 
                            className="bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                            title="إلغاء فلتر التاريخ وعرض الكل"
                        >
                            <List size={16}/> عرض الكل
                        </button>
                      </>
                  ) : (
                      <button 
                        onClick={() => { setIsDateFilterActive(true); setViewDate(systemState?.currentDate || getLocalDate()); }}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                      >
                          <Calendar size={16}/> تفعيل فلتر التاريخ
                      </button>
                  )}
              </div>

              {onCloseDay && systemState?.dayStatus === 'open' && (
                 <Button onClick={() => onCloseDay()} size="md" className="bg-gray-800 hover:bg-gray-900 text-white shadow-lg whitespace-nowrap rounded-xl">
                     <StopCircle size={16} className="ml-2" /> إغلاق اليوم
                 </Button>
              )}
          </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm w-full md:w-auto">
              <button onClick={() => setStatusFilter('all')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${statusFilter === 'all' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>الكل ({filteredRecords.length})</button>
              <button onClick={() => setStatusFilter('paid')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${statusFilter === 'paid' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>المدفوع</button>
              <button onClick={() => setStatusFilter('unpaid')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${statusFilter === 'unpaid' ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>الديون</button>
          </div>

          <div className="relative w-full md:w-80 group">
              <Search className="absolute right-4 top-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input 
                  type="text" 
                  placeholder="بحث (اسم / جوال)..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pr-12 pl-4 py-3 border border-gray-200 rounded-2xl text-sm focus:ring-2 ring-indigo-100 focus:border-indigo-500 outline-none shadow-sm transition-all"
              />
          </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-right">
                <thead className="bg-gray-50/50">
                    <tr>
                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">الزبون</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">الموظف</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">التاريخ</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">الإجمالي</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">المدفوع</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">المتبقي</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider">الحالة</th>
                        <th className="px-6 py-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredRecords.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="text-center py-16 text-gray-400">
                                <div className="flex flex-col items-center">
                                    <div className="bg-gray-50 p-4 rounded-full mb-3"><Search size={32} className="opacity-30"/></div>
                                    <p className="font-bold text-gray-500">لا يوجد سجلات مطابقة</p>
                                    {isDateFilterActive && (
                                        <button onClick={() => setIsDateFilterActive(false)} className="text-indigo-600 text-xs mt-2 hover:underline font-bold">
                                            عرض الأرشيف الكامل
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filteredRecords.map(record => (
                        <React.Fragment key={record.id}>
                            <tr onClick={() => setExpandedId(expandedId === record.id ? null : record.id)} className={`hover:bg-gray-50/80 cursor-pointer transition-colors ${toLocalYMD(record.startTime) !== viewDate && isDateFilterActive ? 'bg-amber-50/30' : ''}`}>
                                <td className="px-6 py-5">
                                    <div className="font-bold text-gray-900 text-base">{record.customerName}</div>
                                    <div className="text-xs text-gray-400 font-mono mt-0.5">{record.customerPhone}</div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full w-fit">
                                        <UserCheck size={12}/> {record.performedByName || 'System'}
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="text-sm font-medium text-gray-700">{new Date(record.startTime).toLocaleDateString('ar-SA')}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{new Date(record.startTime).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'})}</div>
                                </td>
                                <td className="px-6 py-5 font-black text-gray-800 text-base">{formatCurrency(record.totalInvoice)}</td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col gap-1">
                                        {record.cashPaid > 0 && <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-md w-fit">نقدي: {formatCurrency(record.cashPaid)}</span>}
                                        {record.bankPaid > 0 && (
                                            <div className="text-indigo-600 text-xs font-bold bg-indigo-50 px-2 py-0.5 rounded-md w-fit flex items-center gap-1">
                                                <span>تحويل: {formatCurrency(record.bankPaid)}</span>
                                            </div>
                                        )}
                                        {record.paidTotal === 0 && <span className="text-gray-400 text-xs">-</span>}
                                    </div>
                                </td>
                                <td className={`px-6 py-5 font-bold ${record.remainingDebt > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                    {formatCurrency(record.remainingDebt)}
                                </td>
                                <td className="px-6 py-5">
                                    {record.isPaid ? (
                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1.5 border border-emerald-200"><CheckCircle size={12}/> خالص</span>
                                    ) : (
                                        <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1.5 border border-rose-200"><AlertCircle size={12}/> دين</span>
                                    )}
                                </td>
                                <td className="px-6 py-5 text-left">
                                    <div className="flex items-center justify-end gap-3">
                                        {!record.isPaid && (
                                            <Button size="sm" onClick={(e) => { e.stopPropagation(); openRepay(record); }} className="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5 rounded-lg shadow-emerald-200">
                                                <Coins size={14} className="ml-1" /> سداد
                                            </Button>
                                        )}
                                        <div className={`p-2 rounded-full transition-colors ${expandedId === record.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}>
                                            {expandedId === record.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            {expandedId === record.id && (
                                <tr className="bg-gray-50/50 shadow-inner">
                                    <td colSpan={8} className="p-6">
                                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Orders Detail */}
                                            <div>
                                                <h4 className="font-bold text-xs text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2"><div className="w-6 h-[1px] bg-gray-300"></div> تفاصيل الفاتورة</h4>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm border-b border-gray-100 pb-3">
                                                        <span className="text-gray-600 font-medium">جلسة ({formatDuration(record.durationMinutes)})</span>
                                                        <span className="font-bold text-gray-800">{formatCurrency(record.sessionInvoice)}</span>
                                                    </div>
                                                    
                                                    {record.orders.map(order => (
                                                        <div key={order.id} className="flex justify-between items-center text-sm group py-1">
                                                            <div className="flex items-center gap-2">
                                                                {order.type === 'internet_card' ? <Wifi size={14} className="text-blue-500"/> : <Coffee size={14} className="text-amber-500"/>}
                                                                <span className="text-gray-700">{order.quantity}x {order.itemName}</span>
                                                                {order.size && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{order.size === 'small' ? 'صغير' : 'كبير'}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-gray-800">{formatCurrency(order.priceAtOrder * order.quantity)}</span>
                                                                {(onEditOrder && onDeleteOrder) && (
                                                                    <div className="flex gap-1">
                                                                        <button onClick={(e) => { e.stopPropagation(); onEditOrder(record, order); }} className="text-blue-500 p-1 hover:bg-blue-50 rounded-md"><Edit2 size={12}/></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); onDeleteOrder(record, order.id); }} className="text-red-500 p-1 hover:bg-red-50 rounded-md"><Trash2 size={12}/></button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {record.discountApplied && (
                                                        <div className="flex justify-between text-sm text-rose-600 pt-3 border-t border-dashed border-gray-200 mt-2 bg-rose-50/50 p-2 rounded-lg">
                                                            <span className="font-bold">خصم ({record.discountApplied.type === 'percent' ? record.discountApplied.value + '%' : 'مبلغ ثابت'})</span>
                                                            <span className="font-bold">-{formatCurrency(record.discountApplied.amount)}</span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex justify-between text-lg font-black text-indigo-700 pt-4 border-t-2 border-gray-100 mt-2">
                                                        <span>الإجمالي النهائي</span>
                                                        <span>{formatCurrency(record.totalInvoice)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment History */}
                                            <div>
                                                <h4 className="font-bold text-xs text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2"><div className="w-6 h-[1px] bg-gray-300"></div> سجل الدفعات</h4>
                                                <div className="space-y-3">
                                                    {record.transactions && record.transactions.map(tx => (
                                                        <div key={tx.id} className="flex justify-between items-start bg-gray-50 p-3 rounded-xl border border-gray-200/60 text-sm">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${tx.type === 'bank' ? 'bg-indigo-100 text-indigo-700' : (tx.type === 'credit_usage' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}`}>
                                                                        {tx.type === 'bank' ? 'تحويل بنكي' : (tx.type === 'credit_usage' ? 'خصم رصيد' : 'نقدي')}
                                                                    </span>
                                                                    <span className="text-gray-400 text-xs font-mono">{new Date(tx.date).toLocaleDateString('ar-SA')}</span>
                                                                </div>
                                                                
                                                                {tx.type === 'bank' && (
                                                                    <div className="text-[10px] text-gray-500 mt-1 flex flex-col gap-1 pl-2 border-l-2 border-indigo-200">
                                                                      <div>من: <span className="font-bold text-gray-700">{tx.senderAccountName || '---'}</span></div>
                                                                      <div className="flex items-center gap-1">
                                                                          <ArrowLeft size={10} className="text-indigo-400"/> 
                                                                          إلى: <span className="font-bold text-indigo-700">{bankAccounts.find(b => b.id === tx.bankAccountId)?.name || record.bankAccountNameSnapshot || 'غير محدد'}</span>
                                                                      </div>
                                                                    </div>
                                                                )}
                                                                {tx.note && <div className="text-[10px] text-gray-500 italic mt-1 bg-white p-1 rounded border border-gray-100">{tx.note}</div>}
                                                            </div>
                                                            <span className="font-bold text-gray-800">{formatCurrency(tx.amount)}</span>
                                                        </div>
                                                    ))}
                                                    {(!record.transactions || record.transactions.length === 0) && (
                                                         <div className="text-sm text-center text-gray-400 italic py-4 bg-gray-50 rounded-xl border border-dashed">لا يوجد تفاصيل دفعات (سجل قديم)</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                        ))
                    )}
                </tbody>
            </table>
          </div>
      </div>

      <Modal isOpen={!!repayModal.record} onClose={() => setRepayModal({ record: null })} title="تسديد دين">
          <div className="space-y-6">
              <div className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-2xl text-center border border-rose-100 shadow-sm">
                  <p className="text-xs text-rose-600 font-bold mb-2 uppercase tracking-wider">المبلغ المتبقي على الزبون</p>
                  <p className="text-4xl font-black text-rose-800 tracking-tight mb-2">{formatCurrency(repayModal.record?.remainingDebt || 0)}</p>
                  <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-rose-100 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <p className="text-xs text-gray-600 font-bold">{repayModal.record?.customerName}</p>
                  </div>
              </div>

              <div className="bg-gray-50 p-1.5 rounded-xl flex">
                  <button onClick={() => setRepayData({...repayData, type: 'cash'})} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${repayData.type === 'cash' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>نقدي (كاش)</button>
                  <button onClick={() => setRepayData({...repayData, type: 'bank'})} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${repayData.type === 'bank' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>تحويل بنكي</button>
              </div>

              <FormInput label="المبلغ المدفوع" type="number" unit="₪" value={repayData.amount} onChange={e => setRepayData({...repayData, amount: e.target.value})} placeholder={repayModal.record?.remainingDebt.toString()} className="text-lg font-bold" />

              {repayData.type === 'bank' && (
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-fade-in space-y-3">
                      <FormInput 
                          as="select" 
                          label="تم التحويل إلى" 
                          value={repayData.bankAccountId} 
                          onChange={e => setRepayData({...repayData, bankAccountId: e.target.value})} 
                          error={repayData.type === 'bank' && !repayData.bankAccountId ? 'يرجى اختيار الحساب البنكي' : undefined}
                          className="mb-0"
                      >
                          <option value="">-- اختر حساب --</option>
                          {bankAccounts.filter(b=>b.active).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                      </FormInput>
                      <FormInput 
                          label="رقم جوال المرسل" 
                          value={repayData.senderPhone} 
                          onChange={e => setRepayData({...repayData, senderPhone: e.target.value})} 
                          error={repayData.type === 'bank' && !repayData.senderPhone ? 'يرجى إدخال رقم المرسل' : undefined}
                          className="mb-0"
                      />
                      <FormInput 
                          label="اسم حساب المرسل" 
                          value={repayData.senderAccountName} 
                          onChange={e => setRepayData({...repayData, senderAccountName: e.target.value})} 
                          error={repayData.type === 'bank' && !repayData.senderAccountName ? 'يرجى إدخال اسم المرسل' : undefined}
                          className="mb-0"
                      />
                  </div>
              )}

              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 py-3.5 text-base rounded-xl" 
                onClick={handleRepaySubmit}
                disabled={isRepayDisabled}
              >
                  <CheckCircle size={20} className="ml-2"/> تأكيد عملية السداد
              </Button>
          </div>
      </Modal>
    </div>
  );
};

export default RecordsList;