
import { Box, Edit2, Info, Plus, Search, Trash2, Wifi, X } from 'lucide-react';
import React, { useState } from 'react';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import { useAppState } from '../hooks/useAppState';
import { InternetCard } from '../types';
import { formatCurrency, generateId } from '../utils';

interface InternetCardsPageProps {
  cards: InternetCard[];
  onAdd: (c: InternetCard) => void;
  onUpdate: (c: InternetCard) => void;
  onDelete: (id: string) => void;
}

const InternetCardsPage: React.FC<InternetCardsPageProps> = ({ cards, onAdd, onUpdate, onDelete }) => {
  const { inventoryItems = [] } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<InternetCard | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
      name: '',
      cost: '',
      inventoryItemId: '',
      notes: ''
  });
  const [error, setError] = useState('');

  const filtered = cards.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpen = (card?: InternetCard) => {
    setError('');
    if (card) {
      setEditingCard(card);
      setFormData({ 
        name: card.name, 
        cost: card.cost.toString(),
        inventoryItemId: card.inventoryItemId || '',
        notes: card.notes || ''
      });
    } else {
      setEditingCard(null);
      setFormData({ name: '', cost: '', inventoryItemId: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handlePreventNegative = (e: React.KeyboardEvent) => {
      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
          e.preventDefault();
      }
  };

  const handleSubmit = () => {
    const pPrice = 0; 
    const pCost = parseFloat(formData.cost) || 0;

    if (!formData.name.trim()) { setError('اسم البطاقة مطلوب'); return; }
    if (pCost < 0) { setError('سعر التكلفة لا يمكن أن يكون سالباً'); return; }
    if (!formData.inventoryItemId) { setError('يجب ربط البطاقة بصنف من المخزون لتتبع الكمية'); return; }

    const payload: InternetCard = {
      id: editingCard ? editingCard.id : generateId(),
      name: formData.name.trim(),
      price: pPrice, 
      cost: pCost,
      inventoryItemId: formData.inventoryItemId,
      notes: formData.notes
    };

    if (editingCard) onUpdate(payload);
    else onAdd(payload);

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
             <Wifi className="text-blue-600" /> بطاقات الإنترنت
           </h2>
           <p className="text-gray-500 text-sm mt-1 font-medium">إدارة أنواع بطاقات النت، تكلفتها، وربطها بالمخزون.</p>
        </div>
        <Button onClick={() => handleOpen()} size="lg" className="shadow-lg shadow-blue-200 bg-blue-600 hover:bg-blue-700">
           <Plus size={18} className="ml-2" /> إضافة بطاقة
        </Button>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
         <div className="relative group">
            <Search className="absolute right-3 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="بحث عن بطاقة..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border-none bg-gray-50 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm font-bold"
            />
         </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          icon={Wifi} 
          title="لا يوجد بطاقات" 
          description="أضف أنواع بطاقات النت المتوفرة للبيع وقم بربطها بالمخزون." 
          action={<Button variant="outline" onClick={() => handleOpen()}>إضافة أول بطاقة</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filtered.map(card => {
               const invItem = inventoryItems.find(i => i.id === card.inventoryItemId);
               const stockQty = invItem?.qty || 0;
               
               return (
                <div key={card.id} className="bg-white rounded-[24px] border border-gray-100 shadow-soft hover:shadow-xl hover:shadow-blue-100/50 transition-all group p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xl shadow-sm border border-blue-50">
                            {card.name.charAt(0)}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleOpen(card)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                            <button onClick={() => setDeleteId(card.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                        </div>
                    </div>

                    <h3 className="text-lg font-black text-gray-800 mb-1">{card.name}</h3>
                    {invItem ? (
                        <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mb-4">
                            <Box size={10}/> مرتبطة بـ: {invItem.name}
                        </p>
                    ) : (
                        <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mb-4">
                            <X size={10}/> غير مرتبطة بمخزون صحيح
                        </p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">تكلفة الشراء</p>
                            <p className="font-black text-gray-800">{formatCurrency(card.cost)}</p>
                        </div>
                        <div className={`p-3 rounded-2xl border ${stockQty <= 5 ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                            <p className={`text-[9px] font-black uppercase mb-1 ${stockQty <= 5 ? 'text-amber-600' : 'text-blue-600'}`}>الكمية المتاحة</p>
                            <p className={`font-black ${stockQty <= 5 ? 'text-amber-700' : 'text-blue-700'}`}>{stockQty} بطاقة</p>
                        </div>
                    </div>

                    <div className="bg-amber-50/50 p-2 rounded-xl text-[10px] text-amber-800 font-bold flex items-center gap-1.5 border border-amber-100/50">
                        <Info size={12}/> تباع بـ 0 ₪ (خدمة للزبون)
                    </div>
                </div>
               );
           })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCard ? "تعديل بطاقة" : "إضافة بطاقة جديدة"} description="تحديد تكلفة البطاقة وربطها بالمخزون لتتبع الكمية">
         <div className="space-y-5">
            <FormInput 
              label="اسم البطاقة" 
              placeholder="مثال: 10 جيجا، بطاقة نت ساعة..." 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">الصنف المرتبط في المخزون</label>
              <select 
                value={formData.inventoryItemId} 
                onChange={e => setFormData({...formData, inventoryItemId: e.target.value})}
                className="block w-full rounded-xl border border-gray-200 bg-white p-3.5 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-200 shadow-sm"
              >
                <option value="">-- اختر الصنف من المخزون --</option>
                {inventoryItems.map(it => <option key={it.id} value={it.id}>{it.name} (المتوفر: {it.qty} {it.unit})</option>)}
              </select>
            </div>
            
            <FormInput label="التكلفة على المكان (سعر الشراء)" unit="₪" type="number" min="0" onKeyDown={handlePreventNegative} value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />

            <div className="bg-blue-50 p-4 rounded-2xl text-xs text-blue-800 flex items-start gap-3 border border-blue-100">
                <Info className="text-blue-600 shrink-0" size={20} />
                <p className="leading-relaxed font-bold">
                    البطاقات تُباع بسعر 0 شيكل للزبون وتعتبر خسارة تشغيلية (خدمة). النظام سيقوم بخصم الكمية من الصنف المختار أعلاه عند كل عملية بيع.
                </p>
            </div>

            {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2 font-black animate-pulse"><X size={16}/> {error}</p>}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
               <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
               <Button className="bg-blue-600 px-8 shadow-lg shadow-blue-100" onClick={handleSubmit}>حفظ البطاقة</Button>
            </div>
         </div>
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) onDelete(deleteId); }}
        message="هل أنت متأكد من حذف هذه البطاقة؟ سيتم إزالتها من القائمة ولن يتم تتبع مبيعاتها مستقبلاً."
      />
    </div>
  );
};

export default InternetCardsPage;
