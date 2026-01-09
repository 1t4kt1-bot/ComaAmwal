
import React, { useState, useMemo } from 'react';
import { generateId, formatCurrency } from '../utils';
import { 
  Plus, Search, Package, ArrowUpRight, ArrowDownRight, 
  History, AlertCircle, TrendingDown, Box, Filter, Trash2, Info, DollarSign, ShoppingBag, ArrowLeft, Edit2, CheckCircle, Boxes
} from 'lucide-react';
import { InventoryItem, LedgerEntry, BankAccount, AppUser } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import ConfirmModal from '../components/ui/ConfirmModal';

interface InventoryPageProps {
  inventoryItems: InventoryItem[];
  setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  logAction: (entityType: any, entityId: string, action: string, details: string, performerOverride?: string) => void;
  currentUser: AppUser | null;
  ledger: LedgerEntry[];
  setLedger: React.Dispatch<React.SetStateAction<LedgerEntry[]>>;
  bankAccounts: BankAccount[];
  onNavigate?: (view: any) => void;
}

const UNIT_OPTIONS = [
  { value: 'حبة', label: 'حبة / قطعة' },
  { value: 'لتر', label: 'لتر' },
  { value: 'مل', label: 'مل (ميلليلتر)' },
  { value: 'كجم', label: 'كجم (كيلو جرام)' },
  { value: 'جرام', label: 'جرام' },
  { value: 'ربطة', label: 'ربطة' },
  { value: 'باكيت', label: 'باكيت / كيس' },
  { value: 'صندوق', label: 'صندوق / كرتونة' },
  { value: 'وحدة', label: 'وحدة أخرى' }
];

const InventoryPage: React.FC<InventoryPageProps> = ({ 
  inventoryItems, setInventoryItems, logAction, currentUser, onNavigate
}) => {
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({ name: '', unit: 'حبة', qty: '', costPrice: '' });
  const [error, setError] = useState('');

  const filteredItems = useMemo(() => {
    return (inventoryItems || []).filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventoryItems, searchTerm]);

  const stats = useMemo(() => ({
    totalTypes: (inventoryItems || []).length,
    lowStock: (inventoryItems || []).filter(i => i.qty <= 5).length,
    outOfStock: (inventoryItems || []).filter(i => i.qty <= 0).length
  }), [inventoryItems]);

  const handleOpenNew = () => {
    setEditingItem(null);
    setForm({ name: '', unit: 'حبة', qty: '', costPrice: '' });
    setError('');
    setNewItemOpen(true);
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({ 
        name: item.name, 
        unit: item.unit || 'حبة', 
        qty: item.qty.toString(), 
        costPrice: (item.costPrice || 0).toString() 
    });
    setError('');
    setNewItemOpen(true);
  };

  const handleSaveItem = () => {
    const name = form.name.trim();
    if (!name) { setError('اسم الصنف مطلوب'); return; }
    
    const qtyValue = parseFloat(form.qty) || 0;
    const costPriceValue = parseFloat(form.costPrice) || 0;

    if (editingItem) {
        setInventoryItems(prev => prev.map(it => 
            it.id === editingItem.id 
                ? { ...it, name, unit: form.unit, qty: qtyValue, costPrice: costPriceValue }
                : it
        ));
        logAction('inventory', editingItem.id, 'UPDATE', `تعديل بيانات الصنف: ${name}`, currentUser?.name);
    } else {
        const newItem: InventoryItem = {
          id: generateId(), 
          name, 
          unit: form.unit, 
          qty: qtyValue, 
          costPrice: costPriceValue,
          movements: qtyValue > 0 ? [{ id: generateId(), date: new Date().toISOString(), qty: qtyValue, type: 'in' as const, notes: 'رصيد افتتاحي' }] : []
        };
        setInventoryItems(prev => [newItem, ...(prev || [])]);
        logAction('inventory', newItem.id, 'CREATE', `إضافة صنف جديد: ${name}`, currentUser?.name);
    }

    setForm({ name: '', unit: 'حبة', qty: '', costPrice: '' });
    setNewItemOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-100"><Boxes size={28} /></div>
            إدارة المخزون
          </h1>
          <p className="text-gray-500 font-medium mt-1 pr-1">تتبع بضاعة المشروبات والمواد الخام بدقة.</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <Button onClick={handleOpenNew} variant="secondary" className="bg-white border-gray-200 w-full lg:w-auto shadow-sm">
                <Plus size={18} className="ml-2 text-indigo-600" /> تعريف صنف جديد في النظام
            </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800 text-sm font-bold">
          <Info size={20} className="shrink-0 text-amber-600"/>
          <span>ملاحظة: لتوريد بضاعة جديدة (شراء)، يرجى الذهاب لتبويب "المصاريف والمشتريات" واختيار "تمويل مخزون" لضمان الربط المالي الصحيح.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Boxes size={24}/></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase">إجمالي الأصناف</p><p className="text-2xl font-black text-gray-800">{stats.totalTypes}</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><AlertCircle size={24}/></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase">شارفت على الانتهاء</p><p className="text-2xl font-black text-amber-600">{stats.lowStock}</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="bg-rose-50 p-3 rounded-xl text-rose-600"><TrendingDown size={24}/></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase">أصناف منتهية</p><p className="text-2xl font-black text-rose-600">{stats.outOfStock}</p></div>
          </div>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute right-3 top-2.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input type="text" placeholder="بحث في المخزون..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pr-10 pl-4 py-2 rounded-xl border-none bg-gray-50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm font-bold" />
          </div>
      </div>

      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">الصنف</th>
              <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">سعر الوحدة</th>
              <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">الكمية المتوفرة</th>
              <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">الحالة</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold opacity-30"><Box size={48} className="mx-auto mb-4"/>لا يوجد بيانات</td></tr>
            ) : (
              filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${item.qty<=0 ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-600'}`}>{item.name.charAt(0)}</div>
                        <div><div className="font-bold text-gray-900">{item.name}</div><div className="text-[10px] text-gray-400 font-bold">{item.unit}</div></div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-black text-sm text-indigo-600">{formatCurrency(item.costPrice || 0)}</td>
                  <td className="px-6 py-5 font-mono font-black text-gray-800 text-lg">{item.qty}</td>
                  <td className="px-6 py-5">
                    {item.qty <= 0 ? <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-black">منتهى</span> : 
                     item.qty <= 5 ? <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-black">منخفض</span> : 
                     <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black">متوفر</span>}
                  </td>
                  <td className="px-6 py-5 text-left">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="تعديل"><Edit2 size={18}/></button>
                        <button onClick={() => setHistoryItem(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="السجل"><History size={18}/></button>
                        <button onClick={() => setDeleteId(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="حذف"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={newItemOpen} onClose={() => setNewItemOpen(false)} title={editingItem ? "تعديل بيانات الصنف" : "تعريف صنف جديد"}>
          <div className="space-y-4">
              <FormInput label="اسم الصنف" placeholder="مثال: سكر، بن..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} error={error && !form.name ? error : ''} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">الوحدة</label>
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="block w-full rounded-xl border border-gray-200 bg-white p-3.5 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none">
                    {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <FormInput label="سعر الشراء الافتراضي" unit="₪" type="number" value={form.costPrice} onChange={e => setForm({...form, costPrice: e.target.value})} helpText="سيتم استخدامه لحساب التكلفة في المشروبات" />
              </div>
              <FormInput label={editingItem ? "تعديل الكمية الحالية" : "الرصيد الافتتاحي في النظام"} type="number" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} />
              <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="secondary" onClick={() => setNewItemOpen(false)}>إلغاء</Button>
                  <Button onClick={handleSaveItem} className="bg-indigo-600">
                      {editingItem ? <><CheckCircle size={18} className="ml-2"/> حفظ التعديلات</> : 'حفظ الصنف الجديد'}
                  </Button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={!!historyItem} onClose={() => setHistoryItem(null)} title={`سجل حركة: ${historyItem?.name}`}>
          <div className="space-y-4">
              <div className="max-h-[60vh] overflow-y-auto">
                  {historyItem?.movements?.length === 0 ? <p className="text-center py-10 text-gray-400">لا يوجد حركات</p> : 
                    <div className="space-y-3">
                        {historyItem?.movements?.slice().reverse().map((mov: any) => (
                            <div key={mov.id} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${mov.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{mov.type === 'in' ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}</div>
                                    <div><p className="font-bold text-gray-800 text-sm">{mov.notes}</p><p className="text-[10px] text-gray-400 font-bold">{new Date(mov.date).toLocaleString('ar-SA')}</p></div>
                                </div>
                                <div className={`text-lg font-black ${mov.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>{mov.type === 'in' ? '+' : '-'}{mov.qty}</div>
                            </div>
                        ))}
                    </div>}
              </div>
              <div className="flex justify-end pt-4 border-t"><Button variant="secondary" onClick={() => setHistoryItem(null)}>إغلاق</Button></div>
          </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if(deleteId) { setInventoryItems(prev => prev.filter(i => i.id !== deleteId)); setDeleteId(null); } }} message="حذف هذا الصنف؟" />
    </div>
  );
};

export default InventoryPage;
