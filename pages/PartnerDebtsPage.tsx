
import React, { useState } from 'react';
import { DebtItem, BankAccount } from '../types';
import { Wallet, Plus, Trash2, Calendar, Building2, User, Info, ArrowDownLeft, Banknote, Landmark, UserCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import { generateId, formatCurrency, getLocalDate } from '../utils';
import { getPartnerDebtSummary } from '../accounting_core';

interface PartnerDebtsPageProps {
  debtsList: DebtItem[];
  onUpdateDebtsList: (list: DebtItem[]) => void;
  bankAccounts: BankAccount[];
  onAddDebt?: (d: DebtItem) => void;
  onDeleteDebt?: (id: string) => void;
}

const PARTNERS = [
    { id: 'abu_khaled', name: 'أبو خالد', percent: 34 },
    { id: 'khaled', name: 'خالد', percent: 33 },
    { id: 'abdullah', name: 'عبد الله', percent: 33 }
];

const PartnerDebtsPage: React.FC<PartnerDebtsPageProps> = ({ debtsList, onUpdateDebtsList, bankAccounts, onAddDebt, onDeleteDebt }) => {
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isRepaymentMode, setIsRepaymentMode] = useState(false);
  
  const [formData, setFormData] = useState<{
      amount: string; date: string; note: string; debtSource: 'place' | 'partner';
      debtChannel: 'cash' | 'bank' | '';
      bankAccountId: string;
  }>({ 
      amount: '', date: getLocalDate(), note: '', debtSource: 'place', debtChannel: 'cash', bankAccountId: ''
  });
  
  const [error, setError] = useState('');

  const openAddDebt = (partnerId: string) => {
      setActivePartnerId(partnerId);
      setIsRepaymentMode(false);
      setFormData({ amount: '', date: getLocalDate(), note: '', debtSource: 'place', debtChannel: 'cash', bankAccountId: '' });
      setError('');
      setIsModalOpen(true);
  };

  const openRepayment = (partnerId: string) => {
      setActivePartnerId(partnerId);
      setIsRepaymentMode(true);
      // Repayments are always to the treasury ('place')
      setFormData({ amount: '', date: getLocalDate(), note: '', debtSource: 'place', debtChannel: 'cash', bankAccountId: '' }); 
      setError('');
      setIsModalOpen(true);
  };

  const handleAdd = () => {
      if(!activePartnerId || !formData.amount || !formData.date || !formData.debtChannel) { setError('يرجى تعبئة جميع البيانات واختيار القناة'); return; }
      
      // Strict behavioral check for Bank Account
      if (formData.debtChannel === 'bank' && !formData.bankAccountId) {
          return;
      }

      let finalAmount = parseFloat(formData.amount);
      if (isRepaymentMode) {
          finalAmount = -Math.abs(finalAmount); // Ensure negative in DebtItems to signify credit
      }

      const newItem: DebtItem = {
          id: generateId(),
          partnerId: activePartnerId,
          amount: finalAmount,
          date: formData.date,
          note: formData.note,
          debtSource: formData.debtSource,
          debtChannel: formData.debtSource === 'place' || isRepaymentMode ? formData.debtChannel : undefined,
          bankAccountId: (formData.debtChannel === 'bank') ? formData.bankAccountId : undefined
      };
      
      if (onAddDebt) {
          onAddDebt(newItem);
      } else {
          onUpdateDebtsList([...debtsList, newItem]);
      }
      setIsModalOpen(false);
  };

  const handleDelete = () => {
      if (deleteId) {
          if (onDeleteDebt) {
              onDeleteDebt(deleteId);
          } else {
              // Fallback
              onUpdateDebtsList(debtsList.filter(d => d.id !== deleteId));
          }
          setDeleteId(null);
      }
  };

  const isFormDisabled = !formData.amount || !formData.date || !formData.debtChannel || (formData.debtChannel === 'bank' && !formData.bankAccountId);

  return (
    <div className="space-y-8 animate-fade-in text-gray-900">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Wallet className="text-blue-600" /> ديون الشركاء
           </h2>
           <p className="text-gray-500 text-sm mt-1">إدارة المسحوبات الشخصية وتأثيرها على الأرباح.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PARTNERS.map(p => {
                const stats = getPartnerDebtSummary(debtsList, p.id);

                return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="bg-gray-50 p-6 border-b border-gray-100 text-center">
                            <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{p.percent}% نسبة</span>
                            
                            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                                <div className="bg-white p-2 rounded border border-gray-200">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">إجمالي السحب</p>
                                    <p className="text-lg font-bold text-gray-800">{formatCurrency(stats.totalDebt)}</p>
                                </div>
                                <div className="bg-red-50 p-2 rounded border border-red-100">
                                    <p className="text-[10px] text-red-400 font-bold uppercase">يخصم من الربح</p>
                                    <p className="text-lg font-bold text-red-600">{formatCurrency(stats.placeDebt)}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <Button onClick={() => openAddDebt(p.id)} className="w-full justify-center bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 text-xs px-2">
                                    <Plus size={14} className="ml-1" /> إضافة دين
                                </Button>
                                <Button onClick={() => openRepayment(p.id)} variant="secondary" className="w-full justify-center text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs px-2">
                                    <ArrowDownLeft size={14} className="ml-1" /> سداد
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 bg-white p-4 overflow-y-auto max-h-60">
                            {stats.items.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-4">لا يوجد ديون مسجلة</p>
                            ) : (
                                <div className="space-y-3">
                                    {stats.items.map(d => (
                                        <div key={d.id} className={`flex flex-col p-3 rounded-lg border transition-colors group ${d.amount < 0 ? 'bg-emerald-50 border-emerald-100' : (d.debtSource === 'partner' ? 'bg-gray-50 border-gray-100' : 'bg-white border-red-100 hover:bg-red-50')}`}>
                                            <div className="flex justify-between items-start w-full">
                                                <div>
                                                    <div className="font-bold text-gray-800 flex items-center gap-2">
                                                        {d.amount < 0 ? <span className="text-emerald-600">{formatCurrency(Math.abs(d.amount))} (سداد)</span> : formatCurrency(d.amount)}
                                                        {(d.debtSource === 'place' || d.amount < 0) && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${d.debtChannel === 'bank' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                                                                {d.debtChannel === 'bank' ? <Landmark size={10}/> : <Banknote size={10}/>}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                        <Calendar size={10} /> {d.date}
                                                    </div>
                                                    {d.note && <div className="text-xs text-gray-600 mt-1 italic">{d.note}</div>}
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); }} className="text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="mt-2 text-[9px] text-gray-400 flex items-center gap-1 border-t border-black/5 pt-1">
                                                <UserCheck size={9}/> سجلها: {d.performedByName || 'System'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isRepaymentMode ? "سداد دين للشريك" : "تسجيل دين / سحب"}>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <FormInput label={isRepaymentMode ? "مبلغ السداد" : "المبلغ"} type="number" unit="₪" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                    <FormInput label="التاريخ" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                    {!isRepaymentMode && (
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">المصدر</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setFormData({...formData, debtSource: 'place'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.debtSource === 'place' ? 'bg-red-600 text-white' : 'bg-white border text-gray-600'}`}>مال المكان</button>
                                <button type="button" onClick={() => setFormData({...formData, debtSource: 'partner'})} className={`flex-1 py-2 text-xs font-bold rounded ${formData.debtSource === 'partner' ? 'bg-gray-600 text-white' : 'bg-white border text-gray-600'}`}>سلفة شخصية</button>
                            </div>
                        </div>
                    )}
                    
                    {/* Channel selection (always show for repayments or place-source withdrawals) */}
                    {(isRepaymentMode || formData.debtSource === 'place') && (
                        <div className="animate-fade-in space-y-3 pt-2 border-t border-gray-100">
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">
                                    {isRepaymentMode ? 'طريقة السداد (إلى)' : 'طريقة السحب (من)'}
                                </label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setFormData({...formData, debtChannel: 'cash'})} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${formData.debtChannel === 'cash' ? (isRepaymentMode ? 'bg-emerald-600' : 'bg-green-600') + ' text-white' : 'bg-white border text-gray-600'}`}><Banknote size={14}/> كاش</button>
                                    <button type="button" onClick={() => setFormData({...formData, debtChannel: 'bank'})} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${formData.debtChannel === 'bank' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}><Landmark size={14}/> بنك / تطبيق</button>
                                </div>
                            </div>
                            
                            {formData.debtChannel === 'bank' && (
                                <FormInput 
                                    as="select" 
                                    label={isRepaymentMode ? "إيداع في حساب" : "من حساب"} 
                                    value={formData.bankAccountId} 
                                    onChange={e => setFormData({...formData, bankAccountId: e.target.value})}
                                    error={formData.debtChannel === 'bank' && !formData.bankAccountId ? 'يرجى اختيار الحساب' : undefined}
                                >
                                    <option value="">-- اختر الحساب --</option>
                                    {bankAccounts.filter(b=>b.active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </FormInput>
                            )}
                        </div>
                    )}
                </div>

                <FormInput label="ملاحظة" placeholder="اختياري" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                
                {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                    <Button 
                        className={isRepaymentMode ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"} 
                        onClick={handleAdd}
                        disabled={isFormDisabled}
                    >
                        {isRepaymentMode ? 'حفظ السداد' : 'حفظ العملية'}
                    </Button>
                </div>
            </div>
        </Modal>

        <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="حذف؟" />
    </div>
  );
};

export default PartnerDebtsPage;
