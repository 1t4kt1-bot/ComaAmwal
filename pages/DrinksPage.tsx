
import React, { useState } from 'react';
import { Drink, DrinkAvailability, InventoryItem, DrinkComponent } from '../types';
import { Coffee, Plus, Search, Edit2, Trash2, Box, Info, X, Check, ArrowRight, FlaskConical, TrendingUp, DollarSign } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmModal from '../components/ui/ConfirmModal';
import { generateId, formatCurrency, calculateDrinkCost } from '../utils';

interface DrinksPageProps {
    drinks: Drink[];
    onAdd: (d: Drink) => void;
    onUpdate: (d: Drink) => void;
    onDelete: (id: string) => void;
    inventoryItems: InventoryItem[];
}

const DrinksPage: React.FC<DrinksPageProps> = ({ drinks, onAdd, onUpdate, onDelete, inventoryItems }) => {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Components Management State
  const [isComponentsModalOpen, setIsComponentsModalOpen] = useState(false);
  const [activeDrinkForComponents, setActiveDrinkForComponents] = useState<Drink | null>(null);
  const [selectedCompItemId, setSelectedCompItemId] = useState('');
  const [selectedCompQty, setSelectedCompQty] = useState('');

  // Form State
  const [formData, setFormData] = useState({
      name: '',
      availability: 'small' as DrinkAvailability,
      smallPrice: '',
      largePrice: '',
  });
  const [error, setError] = useState('');

  const filtered = drinks.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpen = (drink?: Drink) => {
    setError('');
    if (drink) {
      setEditingDrink(drink);
      setFormData({ 
        name: drink.name, 
        availability: drink.availability,
        smallPrice: (drink.smallPrice || 0).toString(),
        largePrice: (drink.largePrice || 0).toString(),
      });
    } else {
      setEditingDrink(null);
      setFormData({ 
          name: '', availability: 'small', 
          smallPrice: '', 
          largePrice: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) { setError('اسم المشروب مطلوب'); return; }
    
    const sPrice = parseFloat(formData.smallPrice) || 0;
    const lPrice = parseFloat(formData.largePrice) || 0;

    const payload: Drink = {
      id: editingDrink ? editingDrink.id : generateId(),
      name: formData.name.trim(),
      availability: formData.availability,
      smallPrice: (formData.availability !== 'large') ? sPrice : undefined,
      largePrice: (formData.availability !== 'small') ? lPrice : undefined,
      components: editingDrink?.components || []
    };

    if (editingDrink) onUpdate(payload);
    else onAdd(payload);

    setIsModalOpen(false);
  };

  const handleAddComponent = () => {
    if (!activeDrinkForComponents || !selectedCompItemId || !selectedCompQty) return;
    const qty = parseFloat(selectedCompQty);
    if (qty <= 0) return;

    const newComponent: DrinkComponent = { itemId: selectedCompItemId, qty };
    const updatedDrink = {
        ...activeDrinkForComponents,
        components: [...(activeDrinkForComponents.components || []), newComponent]
    };
    
    onUpdate(updatedDrink);
    setActiveDrinkForComponents(updatedDrink);
    setSelectedCompItemId('');
    setSelectedCompQty('');
  };

  const handleUpdateComponentQty = (itemId: string, newQty: string) => {
    if (!activeDrinkForComponents) return;
    const qty = parseFloat(newQty) || 0;
    
    const updatedDrink = {
        ...activeDrinkForComponents,
        components: (activeDrinkForComponents.components || []).map(c => 
            c.itemId === itemId ? { ...c, qty } : c
        )
    };
    
    onUpdate(updatedDrink);
    setActiveDrinkForComponents(updatedDrink);
  };

  const handleRemoveComponent = (itemId: string) => {
    if (!activeDrinkForComponents) return;
    const updatedDrink = {
        ...activeDrinkForComponents,
        components: (activeDrinkForComponents.components || []).filter(c => c.itemId !== itemId)
    };
    onUpdate(updatedDrink);
    setActiveDrinkForComponents(updatedDrink);
  };

  return (
    <div className="space-y-6 animate-fade-in text-gray-900 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
             <Coffee className="text-orange-600" /> قائمة المشروبات
           </h2>
           <p className="text-gray-500 text-sm mt-1 font-medium">إدارة أسعار المشروبات وحساب التكاليف آلياً.</p>
        </div>
        <Button onClick={() => handleOpen()} size="lg" className="shadow-lg shadow-orange-100 bg-orange-600 hover:bg-orange-700">
           <Plus size={18} className="ml-2" /> إضافة مشروب
        </Button>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
         <div className="relative group">
            <Search className="absolute right-3 top-3 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="بحث عن مشروب..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border-none bg-gray-50 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all text-sm font-bold"
            />
         </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Coffee} title="القائمة فارغة" description="ابدأ بإضافة مشروباتك وتحديد أسعار البيع." action={<Button variant="outline" onClick={() => handleOpen()}>إضافة أول مشروب</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(drink => {
                const calculatedCost = calculateDrinkCost(drink, inventoryItems);
                const sPrice = drink.smallPrice || 0;
                const lPrice = drink.largePrice || 0;
                
                return (
                <div key={drink.id} className="bg-white rounded-3xl border border-gray-100 shadow-soft hover:shadow-xl hover:shadow-orange-100/50 transition-all group overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 font-black text-xl shadow-sm">
                                {drink.name.charAt(0)}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpen(drink)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                                <button onClick={() => setDeleteId(drink.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-gray-800 mb-4">{drink.name}</h3>
                        
                        <div className="space-y-3">
                            {drink.availability !== 'large' && (
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                                    <span className="text-xs font-bold text-gray-500">حجم صغير</span>
                                    <div className="text-right">
                                        <div className="font-black text-gray-800">{formatCurrency(sPrice)}</div>
                                        {calculatedCost > 0 && <div className="text-[10px] text-emerald-600 font-bold">الربح: {formatCurrency(sPrice - calculatedCost)}</div>}
                                    </div>
                                </div>
                            )}
                            {drink.availability !== 'small' && (
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                                    <span className="text-xs font-bold text-gray-500">حجم كبير</span>
                                    <div className="text-right">
                                        <div className="font-black text-gray-800">{formatCurrency(lPrice)}</div>
                                        {calculatedCost > 0 && <div className="text-[10px] text-emerald-600 font-bold">الربح: {formatCurrency(lPrice - calculatedCost)}</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cost Stats Widget */}
                        <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1.5 mb-1">
                                        <DollarSign size={12}/> تكلفة المواد الحالية
                                    </p>
                                    <p className="font-black text-orange-600 text-lg">{formatCurrency(calculatedCost)}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">المكونات</p>
                                    <p className="font-black text-gray-700 text-sm">{drink.components?.length || 0} مواد</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => { setActiveDrinkForComponents(drink); setIsComponentsModalOpen(true); }}
                        className="w-full py-4 bg-orange-50/50 hover:bg-orange-50 text-orange-600 hover:text-orange-700 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-t border-orange-100 transition-all"
                    >
                        <FlaskConical size={14}/> ضبط المكونات والتكلفة
                    </button>
                </div>
            )})}
        </div>
      )}

      {/* Main Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDrink ? "تعديل مشروب" : "إضافة مشروب جديد"}>
         <div className="space-y-6">
            <FormInput label="اسم المشروب" placeholder="مثال: أمريكانو، شاي..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
               <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest">الأحجام المتوفرة للبيع</label>
               <div className="flex gap-2">
                  {[
                      { id: 'small', label: 'صغير' },
                      { id: 'large', label: 'كبير' },
                      { id: 'both', label: 'كلاهما' }
                  ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData({...formData, availability: opt.id as DrinkAvailability})}
                        className={`flex-1 py-3 text-sm font-black rounded-xl transition-all border-2 ${formData.availability === opt.id ? 'bg-white border-orange-500 text-orange-700 shadow-sm' : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'}`}
                      >
                         {opt.label}
                      </button>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(formData.availability === 'small' || formData.availability === 'both') && (
                    <FormInput label="سعر البيع (صغير)" unit="₪" type="number" value={formData.smallPrice} onChange={e => setFormData({...formData, smallPrice: e.target.value})} />
                )}
                {(formData.availability === 'large' || formData.availability === 'both') && (
                    <FormInput label="سعر البيع (كبير)" unit="₪" type="number" value={formData.largePrice} onChange={e => setFormData({...formData, largePrice: e.target.value})} />
                )}
            </div>

            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <Info className="text-indigo-600 shrink-0" size={20}/>
                <p className="text-xs font-bold text-indigo-800 leading-relaxed">
                    ملاحظة: تكلفة المشروب سيتم حسابها ديناميكياً بناءً على أسعار شراء المواد الخام المسجلة في المخزون.
                </p>
            </div>

            {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
               <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
               <Button onClick={handleSubmit} className="bg-orange-600 px-8">حفظ</Button>
            </div>
         </div>
      </Modal>

      {/* Components Management Modal */}
      <Modal isOpen={isComponentsModalOpen} onClose={() => setIsComponentsModalOpen(false)} title={`مكونات: ${activeDrinkForComponents?.name}`} description="حدد المواد المستهلكة من المخزون لحساب تكلفة الكوب">
          <div className="space-y-6">
              {/* Add New Component Form */}
              <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-200">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">إضافة مادة خام للمكونات</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select 
                        value={selectedCompItemId} 
                        onChange={e => setSelectedCompItemId(e.target.value)}
                        className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none"
                      >
                          <option value="">-- اختر من المخزون --</option>
                          {inventoryItems.map(it => <option key={it.id} value={it.id}>{it.name} (التكلفة: {it.costPrice} ₪/{it.unit})</option>)}
                      </select>
                      <div className="flex gap-2">
                          <input 
                            type="number" 
                            placeholder="الكمية المستهلكة" 
                            value={selectedCompQty} 
                            onChange={e => setSelectedCompQty(e.target.value)}
                            className="block w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none"
                          />
                          <Button onClick={handleAddComponent} disabled={!selectedCompItemId || !selectedCompQty} className="bg-indigo-600 px-4 shadow-md shadow-indigo-100"><Plus size={20}/></Button>
                      </div>
                  </div>
              </div>

              {/* List of current components */}
              <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المكونات المسجلة حالياً</h4>
                  {(!activeDrinkForComponents?.components || activeDrinkForComponents.components.length === 0) ? (
                      <p className="text-center py-8 text-gray-400 font-bold text-sm bg-gray-50 rounded-2xl border border-dashed">لا يوجد مكونات مرتبطة.</p>
                  ) : (
                      <div className="space-y-2">
                          {activeDrinkForComponents.components.map(comp => {
                              const invItem = inventoryItems.find(i => i.id === comp.itemId);
                              const itemCost = (invItem?.costPrice || 0) * comp.qty;
                              
                              return (
                                  <div key={comp.itemId} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm group hover:border-orange-200 transition-all">
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors"><Box size={18}/></div>
                                          <div>
                                              <p className="font-bold text-gray-800 text-sm">{invItem?.name || 'صنف محذوف'}</p>
                                              <div className="flex items-center gap-1.5 mt-1 bg-gray-50/50 rounded-lg px-2 py-1 w-fit border border-gray-100 group-hover:border-orange-100">
                                                  <input 
                                                    type="number" 
                                                    value={comp.qty}
                                                    onChange={(e) => handleUpdateComponentQty(comp.itemId, e.target.value)}
                                                    className="w-16 bg-transparent text-xs font-black text-indigo-600 focus:outline-none focus:ring-0 p-0 border-none"
                                                  />
                                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                      {invItem?.unit} × {formatCurrency(invItem?.costPrice || 0)}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <div className="text-left">
                                              <p className="text-[10px] font-black text-gray-400 uppercase">التكلفة</p>
                                              <p className="font-black text-gray-900 text-sm">{formatCurrency(itemCost)}</p>
                                          </div>
                                          <button onClick={() => handleRemoveComponent(comp.itemId)} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><X size={16}/></button>
                                      </div>
                                  </div>
                              );
                          })}
                          
                          {/* Final Calculation Summary */}
                          <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[24px] text-white shadow-lg mt-4 flex justify-between items-center">
                              <div>
                                  <p className="text-xs font-bold opacity-80 mb-1">إجمالي تكلفة المكونات</p>
                                  <h5 className="text-2xl font-black">{formatCurrency(calculateDrinkCost(activeDrinkForComponents, inventoryItems))}</h5>
                              </div>
                              <TrendingUp size={32} className="opacity-20" />
                          </div>
                      </div>
                  )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                  <Button variant="secondary" onClick={() => setIsComponentsModalOpen(false)}>إغلاق</Button>
              </div>
          </div>
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={() => { if(deleteId) onDelete(deleteId); }} 
        message="حذف هذا المشروب سيؤدي لمسحه من القائمة تماماً. هل أنت متأكد؟" 
      />
    </div>
  );
};

export default DrinksPage;
