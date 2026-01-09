
import React, { useState } from 'react';
import { BankAccount, Record } from '../types';
import { Landmark, Plus, Edit2, Trash2, X, CheckCircle, Ban, ArrowDownLeft, Hash } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmModal from '../components/ui/ConfirmModal';
import { generateId, formatCurrency, getLocalDate } from '../utils';

interface BankAccountsPageProps {
  accounts: BankAccount[];
  onUpdateAccounts: (accounts: BankAccount[]) => void;
  records: Record[]; // Added to calculate stats
}

const BankAccountsPage: React.FC<BankAccountsPageProps> = ({ accounts, onUpdateAccounts, records = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'today' | 'month' | 'all'>('month');

  const [formData, setFormData] = useState({
      name: '',
      accountNumber: '',
      notes: '',
      active: true
  });
  const [error, setError] = useState('');

  // --- STATS CALCULATION ---
  const getAccountStats = (accountId: string) => {
      const today = getLocalDate();
      const currentMonth = today.slice(0, 7);

      let totalReceived = 0;
      let count = 0;

      records.forEach(record => {
          // Check time filter
          const recordDate = record.endTime.split('T')[0];
          const recordMonth = recordDate.slice(0, 7);
          
          let matchesTime = false;
          if (filterType === 'all') matchesTime = true;
          else if (filterType === 'month' && recordMonth === currentMonth) matchesTime = true;
          else if (filterType === 'today' && recordDate === today) matchesTime = true;

          if (!matchesTime) return;

          // 1. Check Transactions (Newer Records)
          if (record.transactions && record.transactions.length > 0) {
              record.transactions.forEach(tx => {
                  if (tx.type === 'bank' && tx.bankAccountId === accountId) {
                      totalReceived += tx.amount;
                      count++;
                  }
              });
          } 
          // 2. Check Legacy Records (No transactions array, rely on record fields)
          else if (record.bankPaid > 0 && record.bankAccountId === accountId) {
              totalReceived += record.bankPaid;
              count++;
          }
      });

      return { totalReceived, count };
  };

  const handleOpen = (acc?: BankAccount) => {
    setError('');
    if (acc) {
      setEditingAccount(acc);
      setFormData({ 
        name: acc.name, 
        accountNumber: acc.accountNumber || '',
        notes: acc.notes || '',
        active: acc.active
      });
    } else {
      setEditingAccount(null);
      setFormData({ name: '', accountNumber: '', notes: '', active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) { setError('اسم الحساب مطلوب'); return; }

    const payload: BankAccount = {
      id: editingAccount ? editingAccount.id : generateId(),
      name: formData.name.trim(),
      accountNumber: formData.accountNumber,
      notes: formData.notes,
      active: formData.active
    };

    if (editingAccount) {
        onUpdateAccounts(accounts.map(a => a.id === editingAccount.id ? payload : a));
    } else {
        onUpdateAccounts([...accounts, payload]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = () => {
      if (deleteId) {
          onUpdateAccounts(accounts.filter(a => a.id !== deleteId));
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Landmark className="text-indigo-800" /> الحسابات البنكية
           </h2>
           <p className="text-gray-500 text-sm mt-1">إدارة الحسابات وتتبع التحويلات الواردة.</p>
        </div>
        <div className="flex gap-2">
            <div className="bg-white border border-gray-200 rounded-lg p-1 flex">
                <button onClick={() => setFilterType('today')} className={`px-3 py-1.5 text-xs font-bold rounded ${filterType === 'today' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>اليوم</button>
                <button onClick={() => setFilterType('month')} className={`px-3 py-1.5 text-xs font-bold rounded ${filterType === 'month' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>هذا الشهر</button>
                <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 text-xs font-bold rounded ${filterType === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>الكل</button>
            </div>
            <Button onClick={() => handleOpen()} size="lg" className="bg-indigo-800 hover:bg-indigo-900 shadow-lg shadow-indigo-200">
               <Plus size={18} className="ml-2" /> إضافة حساب
            </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState 
          icon={Landmark} 
          title="لا يوجد حسابات بنكية" 
          description="أضف الحسابات البنكية التي تستقبل عليها التحويلات." 
          action={<Button variant="outline" onClick={() => handleOpen()}>إضافة حساب</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {accounts.map(acc => {
               const stats = getAccountStats(acc.id);
               return (
               <div key={acc.id} className={`bg-white p-5 rounded-xl border shadow-sm transition-all ${acc.active ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                   <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${acc.active ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>
                               <Landmark size={24} />
                           </div>
                           <div>
                               <h3 className="font-bold text-lg text-gray-900">{acc.name}</h3>
                               {acc.accountNumber && <p className="text-sm text-gray-500 font-mono mt-0.5">{acc.accountNumber}</p>}
                           </div>
                       </div>
                       <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${acc.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {acc.active ? <><CheckCircle size={10}/> نشط</> : <><Ban size={10}/> متوقف</>}
                       </span>
                   </div>
                   
                   {/* Stats Section */}
                   <div className="grid grid-cols-2 gap-3 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                       <div>
                           <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1"><ArrowDownLeft size={10}/> إجمالي المستلم</span>
                           <span className="text-lg font-bold text-indigo-700">{formatCurrency(stats.totalReceived)}</span>
                       </div>
                       <div>
                           <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1"><Hash size={10}/> عدد الحوالات</span>
                           <span className="text-lg font-bold text-gray-800">{stats.count}</span>
                       </div>
                   </div>
                   
                   {acc.notes && <p className="text-xs text-gray-500 mb-3 bg-yellow-50 p-2 rounded border border-yellow-100">{acc.notes}</p>}

                   <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button onClick={() => handleOpen(acc)} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"><Edit2 size={14}/> تعديل</button>
                        <button onClick={() => setDeleteId(acc.id)} className="flex items-center gap-1 text-sm font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition-colors"><Trash2 size={14}/> حذف</button>
                   </div>
               </div>
           )})}
        </div>
      )}

      {/* Improved Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAccount ? "تعديل حساب" : "إضافة حساب جديد"} description="حساب لاستقبال الحوالات البنكية">
         <div className="space-y-6">
            <FormInput 
              label="اسم الحساب / البنك" 
              placeholder="مثال: بنك فلسطين - حساب التوفير" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            
            <FormInput 
                label="رقم الحساب / IBAN" 
                placeholder="اختياري"
                value={formData.accountNumber} 
                onChange={e => setFormData({...formData, accountNumber: e.target.value})} 
            />

            <FormInput label="ملاحظات" placeholder="اختياري..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />

            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setFormData({...formData, active: !formData.active})}>
                <input type="checkbox" checked={formData.active} onChange={() => {}} className="w-5 h-5 accent-indigo-600" />
                <div>
                    <span className="text-sm font-bold text-gray-800 block">حساب نشط</span>
                    <span className="text-xs text-gray-500">إظهار هذا الحساب في قائمة التحويل عند الدفع</span>
                </div>
            </div>

            {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2"><X size={16}/> {error}</p>}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
               <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
               <Button className="bg-indigo-800 px-6" onClick={handleSubmit}>حفظ</Button>
            </div>
         </div>
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message="هل أنت متأكد من حذف هذا الحساب؟"
      />
    </div>
  );
};

export default BankAccountsPage;
