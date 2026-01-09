
import React, { useState } from 'react';
import { PlaceLoan, BankAccount, Expense, SavingPlan, LedgerEntry, Purchase, TransactionType, InventoryItem } from '../types';
import { Briefcase, Plus, Calendar, Landmark, Banknote, CheckCircle, Clock, PiggyBank, Receipt, ShoppingBag, Info, RefreshCw, Trash2, Edit2, ShieldCheck, X } from 'lucide-react';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import Modal from '../components/ui/Modal';
import { generateId, formatCurrency, getLocalDate } from '../utils';
import { getSavingsBalance } from '../accounting_core';
import ExpensesPage from './ExpensesPage';
import PlaceLoansPage from './PlaceLoansPage';
import ConfirmModal from '../components/ui/ConfirmModal';

interface LiabilitiesPageProps {
  // Loans Props
  loans: PlaceLoan[];
  onUpdateLoans: (loans: PlaceLoan[]) => void;
  onAddLoan?: (l: PlaceLoan) => void;
  onPayInstallment?: (updatedLoan: PlaceLoan, newExpense: Expense) => void;
  
  // Expenses & Purchases Props
  expenses: Expense[];
  onUpdateExpenses: (e: Expense[]) => void;
  onAddExpense?: (e: Expense) => void;
  purchases?: Purchase[];
  onUpdatePurchases?: (p: Purchase[]) => void;
  onAddPurchase?: (p: Purchase, e?: Expense) => void;

  // Savings Props
  savingPlans: SavingPlan[];
  onUpdateSavingPlans: (plans: SavingPlan[]) => void;
  onManualSaving: (amount: number, channel: 'cash' | 'bank', accountId?: string, editingId?: string) => void;
  ledger: LedgerEntry[];
  onUpdateLedger: (ledger: LedgerEntry[]) => void;
  bankAccounts: BankAccount[];
    // Inventory state forwarded from App
    inventoryItems: InventoryItem[];
    setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;

  // Delete Handlers
  onDeletePurchase?: (id: string) => void;
  onDeleteExpense?: (id: string) => void;
  onDeleteSavingPlan?: (id: string) => void;
}

const LiabilitiesPage: React.FC<LiabilitiesPageProps> = ({
    loans, onUpdateLoans, onAddLoan, onPayInstallment,
    expenses, onUpdateExpenses, onAddExpense,
    purchases, onUpdatePurchases, onAddPurchase,
    savingPlans, onUpdateSavingPlans, onManualSaving,
    ledger, onUpdateLedger, bankAccounts,
    onDeletePurchase, onDeleteExpense, onDeleteSavingPlan,
    inventoryItems, setInventoryItems
}) => {
    const [activeTab, setActiveTab] = useState<'loans' | 'expenses' | 'savings'>('loans');
    
    // --- Manual Saving Modal State ---
    const [isSavingModalOpen, setIsSavingModalOpen] = useState(false);
    const [savingFormData, setSavingFormData] = useState({ amount: '', channel: 'cash' as 'cash'|'bank', accountId: '' });
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

    // --- Auto Saving Plan Modal State ---
    const [isAutoPlanModalOpen, setIsAutoPlanModalOpen] = useState(false);
    const [autoPlanData, setAutoPlanData] = useState({ name: '', type: 'daily_saving' as 'daily_saving'|'monthly_payment', amount: '' });

    const [deleteId, setDeleteId] = useState<{type: 'ledger' | 'plan', id: string} | null>(null);

    // Filter to show only SAVINGS, not Fixed Expenses
    const trueSavingPlans = savingPlans.filter(p => p.category !== 'saving'); // Actually category 'saving' are true savings, category 'expense' are fixed expenses.
    // Correction: In App logic, saving plans used in Liabilities are category='saving'. Fixed expenses are category='expense'.
    // The previous implementation used filter(p => p.category !== 'expense') which means 'saving'. Correct.
    const savingPlansList = savingPlans.filter(p => p.category === 'saving');
    const totalSavings = getSavingsBalance(ledger);

    // --- HANDLERS ---

    const openManualSaving = (entry?: LedgerEntry) => {
        if (entry) {
            setEditingEntryId(entry.id);
            setSavingFormData({
                amount: entry.amount.toString(),
                channel: entry.channel as 'cash'|'bank',
                accountId: entry.accountId || ''
            });
        } else {
            setEditingEntryId(null);
            setSavingFormData({ amount: '', channel: 'cash', accountId: '' });
        }
        setIsSavingModalOpen(true);
    };

    const handleManualSavingSubmit = () => {
        const amount = parseFloat(savingFormData.amount);
        if (!amount || amount <= 0) return;
        if (savingFormData.channel === 'bank' && !savingFormData.accountId) return;
        
        onManualSaving(amount, savingFormData.channel, savingFormData.accountId, editingEntryId || undefined);
        setIsSavingModalOpen(false);
    };

    const handleAutoPlanSubmit = () => {
        if (!autoPlanData.name || !autoPlanData.amount) return;
        const amount = parseFloat(autoPlanData.amount);
        if (amount <= 0) return;

        const newPlan: SavingPlan = {
            id: generateId(),
            name: autoPlanData.name,
            type: autoPlanData.type,
            category: 'saving', // Crucial: This marks it as SAVING not EXPENSE
            amount: amount,
            channel: 'cash', // Default to cash for now
            isActive: true,
            lastAppliedAt: getLocalDate()
        };

        onUpdateSavingPlans([...savingPlans, newPlan]);
        setIsAutoPlanModalOpen(false);
        setAutoPlanData({ name: '', type: 'daily_saving', amount: '' });
    };

    const handleDelete = () => {
        if (!deleteId) return;
        
        if (deleteId.type === 'ledger') {
            onUpdateLedger(ledger.filter(e => e.id !== deleteId.id));
        } else if (deleteId.type === 'plan') {
            if (onDeleteSavingPlan) onDeleteSavingPlan(deleteId.id);
            else onUpdateSavingPlans(savingPlans.filter(p => p.id !== deleteId.id));
        }
        setDeleteId(null);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex overflow-x-auto">
                <button onClick={() => setActiveTab('loans')} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'loans' ? 'bg-amber-100 text-amber-800' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Briefcase size={18}/> ديون المكان
                </button>
                <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'expenses' ? 'bg-red-100 text-red-800' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Receipt size={18}/> المصاريف والمشتريات
                </button>
                <button onClick={() => setActiveTab('savings')} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'savings' ? 'bg-purple-100 text-purple-800' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <PiggyBank size={18}/> صندوق الادخار
                </button>
            </div>

            {/* Content */}
            {activeTab === 'loans' && (
                <PlaceLoansPage 
                    loans={loans} 
                    onUpdateLoans={onUpdateLoans} 
                    bankAccounts={bankAccounts} 
                    expenses={expenses} 
                    onUpdateExpenses={onUpdateExpenses}
                    onAddLoan={onAddLoan}
                    onPayInstallment={onPayInstallment}
                />
            )}

            {activeTab === 'expenses' && (
                <ExpensesPage 
                    expenses={expenses} 
                    onUpdateExpenses={onUpdateExpenses} 
                    bankAccounts={bankAccounts}
                    onAddExpense={onAddExpense}
                    savingPlans={savingPlans} 
                    onUpdateSavingPlans={onUpdateSavingPlans}
                    // Passing Purchases Props down
                    purchases={purchases || []}
                    onUpdatePurchases={onUpdatePurchases || (() => {})}
                    onAddPurchase={onAddPurchase}
                    onDeletePurchase={onDeletePurchase}
                    onDeleteSavingPlan={onDeleteSavingPlan}
                    inventoryItems={inventoryItems}
                    setInventoryItems={setInventoryItems}
                />
            )}

            {activeTab === 'savings' && (
                <div className="space-y-6 animate-slide-up">
                    
                    {/* Summary Card */}
                    <div className="bg-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-200 relative overflow-hidden flex justify-between items-center">
                        <div className="relative z-10">
                            <p className="text-purple-200 text-xs font-bold uppercase mb-1">إجمالي المدخرات المتراكمة</p>
                            <h3 className="text-3xl font-black">{formatCurrency(totalSavings)}</h3>
                            <p className="text-[10px] text-purple-100 mt-2 flex items-center gap-1"><Info size={12}/> مبالغ مجنبة خارج الأرباح</p>
                        </div>
                        <div className="flex gap-3 relative z-10">
                             <Button onClick={() => openManualSaving()} className="bg-white text-purple-700 hover:bg-purple-50 shadow-md">
                                 <Plus size={16} className="ml-1"/> إيداع يدوي
                             </Button>
                             <Button onClick={() => setIsAutoPlanModalOpen(true)} className="bg-purple-800 text-white hover:bg-purple-900 border border-purple-500/50 shadow-md">
                                 <RefreshCw size={16} className="ml-1"/> خطة تلقائية
                             </Button>
                        </div>
                        <PiggyBank className="text-white opacity-20 absolute -left-4 -bottom-4" size={120} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT: Active Saving Plans */}
                        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <ShieldCheck size={18} className="text-purple-600"/> خطط الادخار النشطة
                            </h4>
                            
                            {savingPlansList.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm flex flex-col items-center">
                                    <RefreshCw size={24} className="mb-2 opacity-20"/>
                                    لا يوجد خطط تلقائية
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {savingPlansList.map(plan => (
                                        <div key={plan.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex flex-col gap-2 group hover:border-purple-200 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-gray-800 text-sm">{plan.name}</div>
                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                        {plan.type === 'daily_saving' ? 'اقتطاع يومي' : 'اقتطاع شهري'}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-purple-700 text-sm">{formatCurrency(plan.amount)}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {plan.isActive ? 'نشط' : 'متوقف'}
                                                </span>
                                                <button onClick={() => setDeleteId({type: 'plan', id: plan.id})} className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Ledger History */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Clock size={18} className="text-gray-500"/> سجل الحركات</h3>
                            </div>
                            
                            <div className="overflow-y-auto max-h-[400px]">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-gray-50 text-gray-500 font-bold sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3">التاريخ</th>
                                            <th className="px-6 py-3">البيان</th>
                                            <th className="px-6 py-3">القناة</th>
                                            <th className="px-6 py-3">المبلغ</th>
                                            <th className="px-6 py-3">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {ledger.filter(e => e.type === TransactionType.SAVING_DEPOSIT || e.type === TransactionType.SAVING_WITHDRAWAL).map(entry => (
                                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{entry.dateKey}</td>
                                                <td className="px-6 py-3 font-medium text-gray-800">{entry.description}</td>
                                                <td className="px-6 py-3">
                                                    {entry.channel === 'cash' ? <span className="text-emerald-600 font-bold">كاش</span> : <span className="text-indigo-600 font-bold">بنك</span>}
                                                </td>
                                                <td className={`px-6 py-3 font-bold dir-ltr ${entry.type === TransactionType.SAVING_DEPOSIT ? 'text-green-600' : 'text-red-600'}`}>
                                                    {entry.type === TransactionType.SAVING_DEPOSIT ? '+' : '-'}{formatCurrency(entry.amount)}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openManualSaving(entry)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={14}/></button>
                                                        <button onClick={() => setDeleteId({type: 'ledger', id: entry.id})} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {ledger.filter(e => e.type === TransactionType.SAVING_DEPOSIT || e.type === TransactionType.SAVING_WITHDRAWAL).length === 0 && (
                                            <tr><td colSpan={5} className="text-center py-10 text-gray-400">لا يوجد حركات ادخار مسجلة</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Saving Modal (Edit/Create) */}
            <Modal isOpen={isSavingModalOpen} onClose={() => setIsSavingModalOpen(false)} title={editingEntryId ? "تعديل حركة ادخار" : "إيداع يدوي في الصندوق"}>
                <div className="space-y-4">
                    <FormInput label="المبلغ" type="number" unit="₪" value={savingFormData.amount} onChange={e => setSavingFormData({...savingFormData, amount: e.target.value})} />
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <label className="block text-sm font-bold text-gray-800 mb-2">مصدر المال (يخصم من)</label>
                        <div className="flex gap-2 mb-3">
                            <button onClick={() => setSavingFormData({...savingFormData, channel: 'cash'})} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${savingFormData.channel === 'cash' ? 'bg-emerald-600 text-white' : 'bg-white border text-gray-600'}`}><Banknote size={14}/> كاش</button>
                            <button onClick={() => setSavingFormData({...savingFormData, channel: 'bank'})} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 ${savingFormData.channel === 'bank' ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}><Landmark size={14}/> بنك</button>
                        </div>
                        {savingFormData.channel === 'bank' && (
                            <FormInput as="select" label="من حساب" value={savingFormData.accountId} onChange={e => setSavingFormData({...savingFormData, accountId: e.target.value})}>
                                <option value="">-- اختر الحساب --</option>
                                {bankAccounts.filter(b=>b.active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </FormInput>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsSavingModalOpen(false)}>إلغاء</Button>
                        <Button onClick={handleManualSavingSubmit}>{editingEntryId ? 'حفظ التعديلات' : 'تأكيد الإيداع'}</Button>
                    </div>
                </div>
            </Modal>

            {/* Auto Plan Modal */}
            <Modal isOpen={isAutoPlanModalOpen} onClose={() => setIsAutoPlanModalOpen(false)} title="إضافة خطة ادخار تلقائي">
                <div className="space-y-4">
                    <FormInput label="اسم الخطة / الهدف" placeholder="مثال: تجديد أثاث، طوارئ..." value={autoPlanData.name} onChange={e => setAutoPlanData({...autoPlanData, name: e.target.value})} />
                    
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-purple-900 text-sm">
                        <p className="font-bold flex items-center gap-2 mb-2"><Info size={16}/> كيف يعمل؟</p>
                        <p className="leading-relaxed text-xs opacity-80">
                            سيقوم النظام باقتطاع هذا المبلغ تلقائياً من الأرباح (عند إجراء الجرد) وإضافته لرصيد المدخرات. هذا المبلغ لا يعتبر مصروفاً بل ترحيل للأرباح.
                        </p>
                    </div>

                    <FormInput as="select" label="تكرار الاقتطاع" value={autoPlanData.type} onChange={e => setAutoPlanData({...autoPlanData, type: e.target.value as any})}>
                        <option value="daily_saving">يومي (كل يوم في الجرد)</option>
                        <option value="monthly_payment">شهري (مرة واحدة في الشهر)</option>
                    </FormInput>

                    <FormInput label="المبلغ المقتطع" type="number" unit="₪" value={autoPlanData.amount} onChange={e => setAutoPlanData({...autoPlanData, amount: e.target.value})} />

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <Button variant="secondary" onClick={() => setIsAutoPlanModalOpen(false)}>إلغاء</Button>
                        <Button className="bg-purple-700 hover:bg-purple-800" onClick={handleAutoPlanSubmit}>إنشاء الخطة</Button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal 
                isOpen={!!deleteId} 
                onClose={() => setDeleteId(null)} 
                onConfirm={handleDelete} 
                message={deleteId?.type === 'plan' ? "هل أنت متأكد من حذف خطة الادخار هذه؟ لن يتم اقتطاع مبالغ جديدة مستقبلاً." : "هل أنت متأكد من حذف سجل الادخار هذا؟ سيتم إعادة المبلغ إلى الرصيد التشغيلي."} 
            />
        </div>
    );
};

export default LiabilitiesPage;
