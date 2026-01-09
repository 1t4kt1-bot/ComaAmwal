
import React, { useState, useMemo } from 'react';
import { Expense, BankAccount, SavingPlan, Purchase, InventoryItem, InventoryMovement, TransactionType } from '../types';
// Added CheckCircle to imports
import { Receipt, Plus, Search, Trash2, Calendar, Info, RefreshCw, Landmark, Banknote, ShieldCheck, PieChart, Activity, DollarSign, Edit2, AlertTriangle, ArrowRight, ShoppingBag, Building2, User, UserCheck, Package, Box, ChevronLeft, Calculator, Target, Zap, ShieldAlert, Tag, PackagePlus, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmModal from '../components/ui/ConfirmModal';
import { generateId, formatCurrency, getLocalDate } from '../utils';
import { GLOBAL_PARTNERS, getExpensesPageStats } from '../accounting_core';

interface ExpensesPageProps {
    expenses: Expense[];
    onUpdateExpenses: (e: Expense[]) => void;
    bankAccounts: BankAccount[];
    onAddExpense?: (e: Expense) => void;
    savingPlans?: SavingPlan[];
    onUpdateSavingPlans?: (plans: SavingPlan[]) => void;
    purchases?: Purchase[];
    onUpdatePurchases?: (p: Purchase[]) => void;
    onAddPurchase?: (p: Purchase, e?: Expense) => void;
    onDeletePurchase?: (id: string) => void;
    onDeleteSavingPlan?: (id: string) => void;
    inventoryItems: InventoryItem[];
    setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
}

const ExpensesPage: React.FC<ExpensesPageProps> = ({ 
        expenses, onUpdateExpenses, bankAccounts, onAddExpense, 
        savingPlans = [], onUpdateSavingPlans,
        purchases = [], onUpdatePurchases = (_: Purchase[]) => {}, onAddPurchase,
        onDeletePurchase, onDeleteSavingPlan,
        inventoryItems, setInventoryItems
}) => {
    const logAction = (entityType: any, entityId: string, action: string, details: string) => {};
    
  const [activeTab, setActiveTab] = useState<'daily' | 'fixed'>('daily');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'daily' | 'fixed'>('daily');
  const [purchaseType, setPurchaseType] = useState<'operational' | 'stock'>('operational');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const currentMonth = getLocalDate().slice(0, 7);
  const stats = useMemo(() => getExpensesPageStats(purchases, savingPlans, currentMonth), [purchases, savingPlans, currentMonth]);

  const [formData, setFormData] = useState({
      name: '', amount: '', date: getLocalDate(), notes: '',
      stockItemId: '', stockQty: '',
      fundingSource: 'place' as 'place' | 'partner',
      buyer: GLOBAL_PARTNERS[0]?.id || '',
      paymentMethod: 'cash' as 'cash' | 'bank', 
      fromAccountId: ''
  });
  const [error, setError] = useState('');

  const selectedStockItem = inventoryItems.find(i => i.id === formData.stockItemId);

  useMemo(() => {
      if (purchaseType === 'stock' && selectedStockItem) {
          const qty = parseFloat(formData.stockQty) || 0;
          const total = qty * (selectedStockItem.costPrice || 0);
          setFormData(prev => ({ ...prev, amount: total.toString() }));
      }
  }, [formData.stockQty, formData.stockItemId, purchaseType, selectedStockItem]);

  const filteredPurchases = purchases
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());

  const handleOpenModal = (mode: 'daily' | 'fixed') => {
      setModalMode(mode);
      setPurchaseType('operational');
      setFormData({
          name: '', amount: '', date: getLocalDate(), notes: '',
          stockItemId: '', stockQty: '',
          fundingSource: 'place',
          buyer: GLOBAL_PARTNERS[0]?.id || '',
          paymentMethod: 'cash', 
          fromAccountId: ''
      });
      setError('');
      setIsModalOpen(true);
  };

  const handleAdd = () => {
     if (modalMode === 'daily') {
         if (purchaseType === 'stock') {
             if (!formData.stockItemId || !formData.stockQty || parseFloat(formData.stockQty) <= 0) {
                 setError('يرجى اختيار الصنف وتحديد الكمية'); return;
             }
         } else {
             if (!formData.name || !formData.amount) { setError('يرجى ملء الاسم والمبلغ'); return; }
         }
         
         const amountVal = parseFloat(formData.amount);
         if (formData.paymentMethod === 'bank' && formData.fundingSource === 'place' && !formData.fromAccountId) {
             setError('يجب اختيار حساب البنك'); return;
         }

         const purchaseId = generateId();
         const finalName = purchaseType === 'stock' ? `تمويل مخزون: ${selectedStockItem?.name}` : formData.name;

         if (purchaseType === 'stock' && selectedStockItem) {
             const qty = parseFloat(formData.stockQty);
             const movement: InventoryMovement = { 
                 id: generateId(), date: new Date().toISOString(), qty, type: 'in', 
                 notes: `شراء للمخزون (${formData.fundingSource === 'place' ? 'مال المكان' : 'مال شريك'})` 
             };
             setInventoryItems(prev => prev.map(it => 
                 it.id === formData.stockItemId ? ({ ...it, qty: it.qty + qty, movements: [...(it.movements || []), movement] }) : it
             ));
         }

         const newPurchase: Purchase = {
             id: purchaseId,
             name: finalName,
             amount: amountVal,
             date: formData.date,
             fundingSource: formData.fundingSource,
             buyer: formData.fundingSource === 'partner' ? formData.buyer : '',
             notes: formData.notes,
             paymentMethod: formData.paymentMethod,
             fromAccountId: formData.fundingSource === 'place' ? formData.fromAccountId : undefined,
             fromAccountNameAtPaymentTime: formData.fundingSource === 'place' 
                ? bankAccounts.find(b=>b.id===formData.fromAccountId)?.name 
                : undefined
         };
        if (purchaseType === 'stock' && selectedStockItem) {
            const qty = parseFloat(formData.stockQty) || 0;
            (newPurchase as any).stockItemId = formData.stockItemId;
            (newPurchase as any).stockQty = qty;
        }

         let newExpense: Expense | undefined;
         if (formData.fundingSource === 'place') {
             newExpense = {
                 id: generateId(),
                 name: finalName,
                 amount: amountVal,
                 type: purchaseType === 'stock' ? 'auto_purchase' : 'one_time',
                 date: formData.date,
                 notes: purchaseType === 'stock' ? 'توريد مخزون تلقائي' : formData.notes,
                 linkedPurchaseId: purchaseId,
                 paymentMethod: formData.paymentMethod,
                 fromAccountId: formData.fromAccountId,
                 fromAccountNameAtPaymentTime: bankAccounts.find(b=>b.id===formData.fromAccountId)?.name 
             };
         }

         if (onAddPurchase) onAddPurchase(newPurchase, newExpense);
     } else {
         if (!onUpdateSavingPlans || !formData.name || !formData.amount) return;
         const newPlan: SavingPlan = {
             id: generateId(), name: formData.name, type: 'monthly_payment', category: 'expense',
             amount: parseFloat(formData.amount), channel: 'cash', isActive: true, lastAppliedAt: getLocalDate()
         };
         onUpdateSavingPlans([...savingPlans, newPlan]);
     }
     setIsModalOpen(false);
  };

  const handleDelete = () => {
      if (deleteId) {
          if (activeTab === 'daily') {
              if (onDeletePurchase) onDeletePurchase(deleteId);
          } else {
              if (onDeleteSavingPlan) onDeleteSavingPlan(deleteId);
          }
          setDeleteId(null);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Top Navigation Tabs */}
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex overflow-x-auto">
            <button onClick={() => setActiveTab('daily')} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'daily' ? 'bg-orange-100 text-orange-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                <ShoppingBag size={18}/> المشتريات والمصاريف
            </button>
            <button onClick={() => setActiveTab('fixed')} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'fixed' ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                <RefreshCw size={18}/> الالتزامات الثابتة
            </button>
        </div>

        {/* Dashboard Summary Card */}
        {activeTab === 'daily' ? (
            <div className="bg-orange-600 rounded-3xl p-8 text-white shadow-xl shadow-orange-200 flex justify-between items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-12 translate-x-12"></div>
                <div className="relative z-10">
                    <p className="text-orange-200 text-xs font-black uppercase mb-1 tracking-widest">إجمالي مشتريات الشهر الحالي</p>
                    <h3 className="text-4xl font-black tracking-tight">{formatCurrency(stats.totalDaily)}</h3>
                    <div className="flex items-center gap-2 mt-4 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 w-fit">
                        <Info size={14} className="text-orange-100"/>
                        <p className="text-[10px] text-orange-50 font-bold">تشمل المشتريات من مال المكان والشركاء</p>
                    </div>
                </div>
                <div className="bg-white/10 p-6 rounded-[32px] backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform duration-500">
                    <ShoppingBag className="text-white" size={48} strokeWidth={2.5}/>
                </div>
            </div>
        ) : (
            <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 flex justify-between items-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-12 translate-x-12"></div>
                <div className="relative z-10">
                    <p className="text-indigo-200 text-xs font-black uppercase mb-1 tracking-widest">مجموع الالتزامات الشهرية</p>
                    <h3 className="text-4xl font-black tracking-tight">{formatCurrency(stats.totalFixedMonthly)}</h3>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                             <p className="text-[10px] text-indigo-100 font-black">إجمالي الخصم اليومي:</p>
                             <p className="text-sm font-black text-white font-mono">{formatCurrency(stats.totalDailyFixed)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/10 p-6 rounded-[32px] backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform duration-500">
                    <RefreshCw className="text-white" size={48} strokeWidth={2.5}/>
                </div>
            </div>
        )}

        {/* Content Section */}
        {activeTab === 'daily' && (
            <div className="space-y-6 animate-slide-up">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-[28px] border border-white/50 shadow-sm">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute right-4 top-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                        <input 
                            value={searchTerm} 
                            onChange={e=>setSearchTerm(e.target.value)} 
                            placeholder="بحث سريع في المشتريات..." 
                            className="w-full pr-12 pl-4 py-3.5 rounded-2xl border-none bg-white focus:ring-2 focus:ring-orange-100 focus:bg-white transition-all text-sm font-bold shadow-sm" 
                        />
                    </div>
                    <Button onClick={() => handleOpenModal('daily')} className="bg-orange-600 hover:bg-orange-700 w-full md:w-auto px-8 h-14 rounded-2xl shadow-xl shadow-orange-200">
                        <Plus size={20} className="ml-2" /> تسجيل عملية شراء
                    </Button>
                </div>

                {filteredPurchases.length === 0 ? <EmptyState icon={ShoppingBag} title="لا يوجد مشتريات" description="لم يتم تسجيل أي مشتريات مطابقة." /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPurchases.map(purchase => (
                            <div key={purchase.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-soft hover:shadow-xl hover:shadow-orange-100/40 transition-all group relative overflow-hidden flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="bg-orange-50 p-3 rounded-2xl text-orange-600 group-hover:scale-110 transition-transform">
                                        <Tag size={24}/>
                                    </div>
                                    <div className="text-left flex flex-col items-end">
                                        <span className="text-[10px] font-black text-gray-300 uppercase font-mono tracking-tighter mb-1">ID: {purchase.id}</span>
                                        <span className="font-black text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 flex items-center gap-1">
                                            <Calendar size={10}/> {purchase.date}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-6 flex-1">
                                    <h4 className="font-black text-gray-800 text-lg leading-tight mb-2 group-hover:text-orange-600 transition-colors">{purchase.name}</h4>
                                    <div className="text-3xl font-black text-gray-900 tracking-tight">{formatCurrency(purchase.amount)}</div>
                                </div>

                                <div className="space-y-3 border-t border-gray-50 pt-4">
                                    <div className="flex flex-wrap gap-2">
                                         <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black border ${purchase.fundingSource === 'place' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                             {purchase.fundingSource === 'place' ? <><Building2 size={12} className="ml-1.5 opacity-70"/> مال المكان</> : <><User size={12} className="ml-1.5 opacity-70"/> {GLOBAL_PARTNERS.find(x => x.id === purchase.buyer)?.name}</>}
                                         </span>
                                         <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black border ${purchase.paymentMethod === 'bank' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                             {purchase.paymentMethod === 'bank' ? <><Landmark size={12} className="ml-1.5 opacity-70"/> بنك / تطبيق</> : <><Banknote size={12} className="ml-1.5 opacity-70"/> كاش</>}
                                         </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold px-1">
                                        <span className="flex items-center gap-1"><UserCheck size={12} className="opacity-50"/> {purchase.performedByName || 'System'}</span>
                                        <button onClick={() => setDeleteId(purchase.id)} className="text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                            <Trash2 size={14}/> حذف
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Improved Modal - Designed for Purchased Redesign */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'daily' ? "تسجيل عملية شراء" : "إضافة التزام ثابت"} description="يرجى تعبئة تفاصيل العملية المالية لضمان دقة التقارير.">
            <div className="space-y-6">
                
                {modalMode === 'daily' && (
                    <div className="bg-gray-100/60 p-1.5 rounded-[20px] flex">
                        <button 
                            onClick={() => setPurchaseType('operational')} 
                            className={`flex-1 py-3 text-xs font-black rounded-[14px] transition-all flex items-center justify-center gap-2 ${purchaseType === 'operational' ? 'bg-white shadow-lg text-orange-700' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Zap size={16}/> مصروف تشغيلي
                        </button>
                        <button 
                            onClick={() => setPurchaseType('stock')} 
                            className={`flex-1 py-3 text-xs font-black rounded-[14px] transition-all flex items-center justify-center gap-2 ${purchaseType === 'stock' ? 'bg-white shadow-lg text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <PackagePlus size={16}/> تمويل مخزون
                        </button>
                    </div>
                )}

                <div className="space-y-5">
                    {/* Basic Info Section */}
                    <div className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">1. تفاصيل البيان</h4>
                        
                        {purchaseType === 'operational' ? (
                            <div className="space-y-4">
                                <FormInput label="البيان (ماذا اشتريت؟)" placeholder="مثال: صيانة مكيف، قرطاسية..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mb-0" />
                                <FormInput label="المبلغ الإجمالي" unit="₪" type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="mb-0" />
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="space-y-2">
                                    <label className="block text-sm font-black text-gray-700">اختر الصنف من المخزون</label>
                                    <select 
                                        value={formData.stockItemId} 
                                        onChange={e => setFormData({...formData, stockItemId: e.target.value, stockQty: ''})} 
                                        className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3.5 text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="">-- اضغط للاختيار --</option>
                                        {inventoryItems.map(it => <option key={it.id} value={it.id}>{it.name} (التكلفة: {it.costPrice} ₪)</option>)}
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <FormInput label="الكمية الموردة" type="number" unit={selectedStockItem?.unit || 'وحدة'} value={formData.stockQty} onChange={e => setFormData({...formData, stockQty: e.target.value})} className="mb-0" />
                                    
                                    {selectedStockItem && (
                                        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-scale-in">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-600 text-white p-2 rounded-xl"><Calculator size={18}/></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase leading-none mb-1">الإجمالي المحسوب</p>
                                                    <p className="text-xl font-black text-indigo-900 leading-none">{formatCurrency(parseFloat(formData.amount) || 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <FormInput label="التاريخ" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mb-0" />
                    </div>

                    {/* Financial details section (Only for daily purchases) */}
                    {modalMode === 'daily' && (
                        <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-200 space-y-6">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">2. البيانات المالية</h4>
                            
                            {/* Source Selector Cards */}
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider text-center">من قام بدفع المال؟ (الممول)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setFormData(prev => ({...prev, fundingSource: 'place'}))} 
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${formData.fundingSource === 'place' ? 'bg-white border-indigo-500 shadow-lg ring-4 ring-indigo-50' : 'bg-gray-100 border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className={`p-2.5 rounded-xl transition-colors ${formData.fundingSource === 'place' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'}`}>
                                            <ShieldCheck size={20}/>
                                        </div>
                                        <span className={`text-xs font-black ${formData.fundingSource === 'place' ? 'text-indigo-900' : 'text-gray-500'}`}>مال المكان</span>
                                    </button>
                                    <button 
                                        onClick={() => setFormData(prev => ({...prev, fundingSource: 'partner'}))} 
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${formData.fundingSource === 'partner' ? 'bg-white border-amber-500 shadow-lg ring-4 ring-amber-50' : 'bg-gray-100 border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className={`p-2.5 rounded-xl transition-colors ${formData.fundingSource === 'partner' ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-400'}`}>
                                            <User size={20}/>
                                        </div>
                                        <span className={`text-xs font-black ${formData.fundingSource === 'partner' ? 'text-amber-900' : 'text-gray-500'}`}>مال الشريك</span>
                                    </button>
                                </div>
                                
                                {formData.fundingSource === 'partner' && (
                                    <div className="animate-slide-up">
                                        <FormInput as="select" label="اختر الشريك الممول" value={formData.buyer} onChange={e => setFormData({...formData, buyer: e.target.value})} className="mb-0">
                                            {GLOBAL_PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </FormInput>
                                    </div>
                                )}
                            </div>

                            {/* Payment Channel Cards */}
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider text-center">قناة الدفع / السداد</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setFormData(prev => ({...prev, paymentMethod: 'cash'}))} 
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${formData.paymentMethod === 'cash' ? 'bg-white border-emerald-500 shadow-lg ring-4 ring-emerald-50' : 'bg-gray-100 border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className={`p-2.5 rounded-xl transition-colors ${formData.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                                            <Banknote size={20}/>
                                        </div>
                                        <span className={`text-xs font-black ${formData.paymentMethod === 'cash' ? 'text-emerald-900' : 'text-gray-500'}`}>دفع كاش</span>
                                    </button>
                                    <button 
                                        onClick={() => setFormData(prev => ({...prev, paymentMethod: 'bank'}))} 
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${formData.paymentMethod === 'bank' ? 'bg-white border-blue-500 shadow-lg ring-4 ring-blue-50' : 'bg-gray-100 border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <div className={`p-2.5 rounded-xl transition-colors ${formData.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                                            <Landmark size={20}/>
                                        </div>
                                        <span className={`text-xs font-black ${formData.paymentMethod === 'bank' ? 'text-blue-900' : 'text-gray-500'}`}>دفع بنك</span>
                                    </button>
                                </div>
                                
                                {formData.paymentMethod === 'bank' && formData.fundingSource === 'place' && (
                                    <div className="animate-slide-up">
                                        <FormInput as="select" label="اختر الحساب البنكي المخصوم منه" value={formData.fromAccountId} onChange={e => setFormData({...formData, fromAccountId: e.target.value})} className="mb-0">
                                            <option value="">-- اختر الحساب البنكي --</option>
                                            {bankAccounts.filter(b=>b.active).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                                        </FormInput>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="flex items-start gap-3 bg-rose-50 p-4 rounded-2xl border border-rose-100 text-rose-700 animate-pulse">
                        <ShieldAlert size={20} className="shrink-0"/>
                        <p className="text-xs font-black leading-tight">{error}</p>
                    </div>
                )}
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="px-8 rounded-xl h-12">إلغاء</Button>
                    <Button className={`${modalMode==='daily' ? "bg-orange-600 hover:bg-orange-700" : "bg-indigo-600 hover:bg-indigo-700"} px-12 rounded-xl h-12 shadow-lg font-black`} onClick={handleAdd}>
                        <CheckCircle size={18} className="ml-2"/> حفظ البيانات
                    </Button>
                </div>
            </div>
        </Modal>

        <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="هل أنت متأكد من حذف هذا السجل؟ سيؤدي ذلك لإعادة المبلغ للرصيد إذا كان مصروفاً من المكان." />
    </div>
  );
};

export default ExpensesPage;
