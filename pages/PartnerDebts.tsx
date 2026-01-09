
import React, { useState } from 'react';
import { DebtItem } from '../types';
import { Wallet, Plus, Trash2, Calendar, Building2, User, Info } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import { generateId, formatCurrency } from '../utils';
import { getPartnerDebtSummary } from '../accounting_core';

interface PartnerDebtsPageProps {
  debtsList: DebtItem[];
  onUpdateDebtsList: (list: DebtItem[]) => void;
}

const PARTNERS = [
    { id: 'abu_khaled', name: 'أبو خالد', percent: 34 },
    { id: 'khaled', name: 'خالد', percent: 33 },
    { id: 'abdullah', name: 'عبد الله', percent: 33 }
];

const PartnerDebtsPage: React.FC<PartnerDebtsPageProps> = ({ debtsList, onUpdateDebtsList }) => {
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<{
      amount: string; date: string; note: string; debtSource: 'place' | 'partner';
  }>({ 
      amount: '', date: new Date().toISOString().split('T')[0], note: '', debtSource: 'place' 
  });
  
  const [error, setError] = useState('');

  const openAddDebt = (partnerId: string) => {
      setActivePartnerId(partnerId);
      setFormData({ amount: '', date: new Date().toISOString().split('T')[0], note: '', debtSource: 'place' });
      setError('');
      setIsModalOpen(true);
  };

  const handleAdd = () => {
      if(!activePartnerId || !formData.amount || !formData.date) { setError('يرجى تعبئة البيانات'); return; }
      
      const newItem: DebtItem = {
          id: generateId(),
          partnerId: activePartnerId,
          amount: parseFloat(formData.amount),
          date: formData.date,
          note: formData.note,
          debtSource: formData.debtSource
      };
      
      onUpdateDebtsList([...debtsList, newItem]);
      setIsModalOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
          onUpdateDebtsList(debtsList.filter(d => d.id !== id));
      }
  };

  return (
    <div className="space-y-8 animate-fade-in">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Wallet className="text-blue-600" /> ديون الشركاء
           </h2>
           <p className="text-gray-500 text-sm mt-1">إدارة المسحوبات الشخصية وتأثيرها على الأرباح.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PARTNERS.map(p => {
                // Use Core Selector instead of .reduce in UI
                const { totalDebt, placeDebt, items: pDebts } = getPartnerDebtSummary(debtsList, p.id);

                return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="bg-gray-50 p-6 border-b border-gray-100 text-center">
                            <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{p.percent}% نسبة</span>
                            
                            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                                <div className="bg-white p-2 rounded border border-gray-200">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">إجمالي السحب</p>
                                    <p className="text-lg font-bold text-gray-800">{formatCurrency(totalDebt)}</p>
                                </div>
                                <div className="bg-red-50 p-2 rounded border border-red-100">
                                    <p className="text-[10px] text-red-400 font-bold uppercase">يخصم من الربح</p>
                                    <p className="text-lg font-bold text-red-600">{formatCurrency(placeDebt)}</p>
                                </div>
                            </div>
                            
                            <Button onClick={() => openAddDebt(p.id)} className="mt-4 w-full justify-center bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100">
                                <Plus size={16} className="ml-2" /> إضافة دين / سحب
                            </Button>
                        </div>

                        <div className="flex-1 bg-white p-4 overflow-y-auto max-h-60">
                            {pDebts.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-4">لا يوجد ديون مسجلة</p>
                            ) : (
                                <div className="space-y-3">
                                    {pDebts.map(d => (
                                        <div key={d.id} className={`flex justify-between items-start p-3 rounded-lg border transition-colors group ${d.debtSource === 'partner' ? 'bg-gray-50 border-gray-100' : 'bg-white border-red-100 hover:bg-red-50'}`}>
                                            <div>
                                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                                    {formatCurrency(d.amount)}
                                                    {d.debtSource === 'partner' ? (
                                                        <span title="سلفة شخصية (لا تخصم من الربح)" className="bg-gray-200 text-gray-600 text-[10px] px-1.5 rounded-full"><User size={10}/></span>
                                                    ) : (
                                                        <span title="سحب من مال المكان (يخصم من الربح)" className="bg-red-100 text-red-600 text-[10px] px-1.5 rounded-full"><Building2 size={10}/></span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <Calendar size={10} /> {d.date}
                                                </div>
                                                {d.note && <div className="text-xs text-gray-600 mt-1 italic">{d.note}</div>}
                                            </div>
                                            <button onClick={(e) => handleDelete(e, d.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="تسجيل دين / سحب">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="المبلغ" type="number" unit="₪" placeholder="مثال: 200" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                    <FormInput label="التاريخ" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                
                {/* Source Selection */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-800 mb-2">نوع الدين / المصدر</label>
                    <div className="flex gap-2 mb-3">
                        <button 
                            type="button"
                            onClick={() => setFormData({...formData, debtSource: 'place'})}
                            className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${formData.debtSource === 'place' ? 'bg-white shadow text-red-700 ring-1 ring-red-500' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <Building2 size={16}/> سحب من مال المكان
                        </button>
                        <button 
                            type="button"
                            onClick={() => setFormData({...formData, debtSource: 'partner'})}
                            className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${formData.debtSource === 'partner' ? 'bg-white shadow text-gray-700 ring-1 ring-gray-500' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <User size={16}/> سلفة شخصية
                        </button>
                    </div>
                    
                    <div className="text-xs flex items-start gap-2 text-gray-600 bg-white p-2 rounded border border-gray-100">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        {formData.debtSource === 'place' 
                            ? 'سيتم خصم المبلغ من حصة ربح الشريك في التوزيع القادم.' 
                            : 'دين للعلم فقط (خارج حسابات أرباح المكان). لا يؤثر على التوزيع.'}
                    </div>
                </div>

                <FormInput label="ملاحظة / السبب" placeholder="مثال: سلفة شخصية" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} helpText="اختياري" />
                
                {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-2 rounded">{error}</p>}
                
                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                    <Button className="bg-blue-600" onClick={handleAdd}>حفظ</Button>
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default PartnerDebtsPage;
