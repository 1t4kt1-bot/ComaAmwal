
import React, { useState } from 'react';
import { Customer } from '../types';
import { Crown, Plus, Search, Edit2, Trash2, X, CreditCard, Phone, Calendar, Info, AlertCircle, Coins, Filter } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmModal from '../components/ui/ConfirmModal';
import { generateId, formatCurrency } from '../utils';

interface VipCustomersPageProps {
  customers: Customer[];
  onUpdateCustomers: (customers: Customer[]) => void;
}

const VipCustomersPage: React.FC<VipCustomersPageProps> = ({ customers, onUpdateCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'debt' | 'credit'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
      name: '',
      phone: '',
      notes: ''
  });
  const [error, setError] = useState('');

  // Filter Logic
  const filtered = customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
      if (!matchesSearch) return false;

      if (activeTab === 'debt') return c.debtBalance > 0;
      if (activeTab === 'credit') return c.creditBalance > 0;
      
      // 'all' shows anyone with status
      return c.isVIP || c.creditBalance > 0 || c.debtBalance > 0;
  }).sort((a, b) => {
      // Sort by Net Balance Descending magnitude
      const netA = Math.abs(a.creditBalance - a.debtBalance);
      const netB = Math.abs(b.creditBalance - b.debtBalance);
      return netB - netA;
  });

  const handleOpen = (customer?: Customer) => {
    setError('');
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ 
        name: customer.name, 
        phone: customer.phone,
        notes: customer.notes || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.phone.trim()) { setError('الاسم ورقم الجوال مطلوبان'); return; }

    const duplicate = customers.find(c => c.phone === formData.phone && c.id !== editingCustomer?.id);
    if (duplicate) { setError('رقم الجوال مسجل بالفعل'); return; }

    const nowIso = new Date().toISOString();

    const payload: Customer = editingCustomer ? {
        ...editingCustomer,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes,
        isVIP: true 
    } : {
        id: generateId(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        isVIP: true,
        creditBalance: 0,
        debtBalance: 0,
        createdAt: nowIso,
        notes: formData.notes
    };

    if (editingCustomer) {
        onUpdateCustomers(customers.map(c => c.id === editingCustomer.id ? payload : c));
    } else {
        onUpdateCustomers([...customers, payload]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = () => {
      if (deleteId) {
          const customer = customers.find(c => c.id === deleteId);
          if (customer && (customer.creditBalance > 0 || customer.debtBalance > 0)) {
              alert('لا يمكن حذف زبون لديه رصيد أو عليه دين. يرجى تصفية الحساب أولاً.');
              setDeleteId(null);
              return;
          }
          onUpdateCustomers(customers.filter(c => c.id !== deleteId));
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Crown className="text-purple-600" /> إدارة الزبائن
           </h2>
           <p className="text-gray-500 text-sm mt-1">سجل الزبائن المميزين، الديون، والأرصدة.</p>
        </div>
        <Button onClick={() => handleOpen()} size="lg" className="shadow-lg shadow-purple-200 bg-purple-600 hover:bg-purple-700">
           <Plus size={18} className="ml-2" /> إضافة زبون جديد
        </Button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex w-full md:w-auto">
              <button onClick={() => setActiveTab('all')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'all' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:bg-gray-50'}`}>
                  الكل
              </button>
              <button onClick={() => setActiveTab('debt')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1 ${activeTab === 'debt' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <AlertCircle size={14}/> الديون
              </button>
              <button onClick={() => setActiveTab('credit')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1 ${activeTab === 'credit' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <Coins size={14}/> الأرصدة
              </button>
          </div>

          <div className="relative w-full md:flex-1">
            <Search className="absolute right-3 top-3 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="بحث بالاسم أو رقم الجوال..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-500 focus:outline-none bg-white shadow-sm"
            />
         </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          icon={Filter} 
          title="لا يوجد نتائج" 
          description="لا يوجد زبائن يطابقون الفلتر الحالي." 
          action={activeTab !== 'all' ? <Button variant="outline" onClick={() => setActiveTab('all')}>عرض الكل</Button> : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                   <tr>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">الاسم</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">رقم الجوال</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-green-600 uppercase">له (رصيد)</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-red-600 uppercase">عليه (دين)</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-800 uppercase">الصافي</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">تاريخ الإضافة</th>
                      <th className="px-6 py-4"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                   {filtered.map(customer => {
                       const net = customer.creditBalance - customer.debtBalance;
                       return (
                       <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4">
                             <div className="font-bold text-gray-900 flex items-center gap-2">
                                 {customer.name}
                                 {customer.isVIP && <Crown size={14} className="text-yellow-500 fill-yellow-500"/>}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-gray-500 font-mono text-xs">{customer.phone}</td>
                          <td className="px-6 py-4 text-green-600 font-bold">{formatCurrency(customer.creditBalance)}</td>
                          <td className="px-6 py-4 text-red-600 font-bold">{formatCurrency(customer.debtBalance)}</td>
                          <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${net > 0 ? 'bg-green-100 text-green-700' : (net < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500')}`}>
                                  {formatCurrency(Math.abs(net))} {net > 0 ? 'له' : (net < 0 ? 'عليه' : '-')}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                             {new Date(customer.createdAt).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="px-6 py-4 text-left">
                             <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpen(customer)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteId(customer.id); }} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={16}/></button>
                             </div>
                          </td>
                       </tr>
                       );
                   })}
                </tbody>
             </table>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? "تعديل بيانات زبون" : "إضافة زبون جديد"}>
         <div className="space-y-6">
            <FormInput 
              label="اسم الزبون" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <FormInput 
              label="رقم الجوال" 
              type="tel"
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
            <FormInput 
              label="ملاحظات" 
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="اختياري..."
            />
            
            {!editingCustomer && (
                <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 flex items-center gap-2">
                    <Info size={16}/> سيتم تمييز الزبون تلقائياً كـ VIP عند الإضافة.
                </div>
            )}

            {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2"><AlertCircle size={16}/> {error}</p>}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
               <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
               <Button className="bg-purple-600 px-6" onClick={handleSubmit}>حفظ</Button>
            </div>
         </div>
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(); }}
        message="هل أنت متأكد من حذف هذا الزبون؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </div>
  );
};

export default VipCustomersPage;
