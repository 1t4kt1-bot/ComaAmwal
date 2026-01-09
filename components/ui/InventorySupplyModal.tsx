
import { AlertCircle, Banknote, Calculator, CheckCircle, ChevronLeft, Landmark, Package, ShieldCheck, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createEntry, GLOBAL_PARTNERS, validateTransaction } from '../../accounting_core';
import { AppUser, BankAccount, InventoryItem, LedgerEntry, TransactionType } from '../../types';
import { formatCurrency, generateId, getLocalDate } from '../../utils';
import Button from './Button';
import FormInput from './FormInput';
import Modal from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inventoryItems: InventoryItem[];
  setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  ledger: LedgerEntry[];
  setLedger: React.Dispatch<React.SetStateAction<LedgerEntry[]>>;
  bankAccounts: BankAccount[];
  currentUser: AppUser | null;
  logAction: (entityType: any, entityId: string, action: string, details: string, performerOverride?: string) => void;
}

const InventorySupplyModal: React.FC<Props> = ({ 
  isOpen, onClose, inventoryItems, setInventoryItems, 
  ledger, setLedger, bankAccounts, currentUser, logAction 
}) => {
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [itemId, setItemId] = useState<string>('');
  const [qty, setQty] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);
  const [fundingSource, setFundingSource] = useState<'place' | 'partner'>('place');
  const [channel, setChannel] = useState<'cash' | 'bank'>('cash');
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [partnerId, setPartnerId] = useState<string | undefined>(GLOBAL_PARTNERS[0]?.id || '');
  const [error, setError] = useState<string>('');

  const selectedItem = (inventoryItems || []).find(i => i.id === itemId);

  // --- AUTO CALCULATE AMOUNT ---
  useEffect(() => {
      if (selectedItem && qty > 0) {
          const unitPrice = selectedItem.costPrice || 0;
          setAmount(qty * unitPrice);
      } else {
          setAmount(0);
      }
  }, [qty, itemId, selectedItem]);

  const reset = () => {
    setStep('details'); setItemId(''); setQty(0); setAmount(0); setFundingSource('place'); setChannel('cash'); 
    setAccountId(undefined); setPartnerId(GLOBAL_PARTNERS[0]?.id || ''); setError('');
  };

  const handleNext = () => {
    if (!itemId) { setError('يجب اختيار صنف'); return; }
    if (!qty || qty <= 0) { setError('الكمية يجب أن تكون أكبر من صفر'); return; }
    if (fundingSource === 'place' && amount > 0) {
        try {
            validateTransaction(ledger, amount, channel, accountId);
        } catch (e: any) {
            setError(e.message);
            return;
        }
    }
    setError('');
    setStep('confirm');
  };

  const handleSubmit = () => {
    if (!selectedItem) return;
    const supplyId = generateId();
    const movement = { 
        id: generateId(), 
        date: new Date().toISOString(), 
        qty, 
        type: 'in' as const, 
        notes: `توريد: ${selectedItem.name} (${fundingSource === 'place' ? 'مال المكان' : 'مال شريك'})` 
    };

    // Update inventory
    setInventoryItems(prev => prev.map(it => 
        it.id === itemId ? ({ ...it, qty: (it.qty || 0) + qty, movements: [...(it.movements || []), movement] }) : it
    ));

    const date = getLocalDate();
    try {
      if (fundingSource === 'place') {
        const entry = createEntry(
            TransactionType.EXPENSE_PURCHASE, amount, 'out', channel, 
            `شراء مخزون: ${selectedItem.name}`, accountId, supplyId, 
            undefined, date, undefined, undefined, 
            currentUser?.id, currentUser?.name
        );
        setLedger(prev => [entry, ...prev]);
      } else {
        const partnerName = GLOBAL_PARTNERS.find(p => p.id === partnerId)?.name || 'شريك';
        const entry = createEntry(
            TransactionType.PARTNER_DEPOSIT, amount, 'in', 'receivable', 
            `شراء بضاعة (شريك): ${selectedItem.name}`, undefined, supplyId, 
            partnerId, date, undefined, partnerName, 
            currentUser?.id, currentUser?.name
        );
        setLedger(prev => [entry, ...prev]);
      }

      logAction('inventory', itemId, 'SUPPLY', `تم توريد ${qty} ${selectedItem.unit || ''} بمبلغ ${amount} ₪`, currentUser?.name);
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل التحقق المالي');
      setStep('details');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="توريد بضاعة للمخزون" description="تحديث الرصيد وربط التكلفة بالحسابات المالية">
      <div className="space-y-6">
        {step === 'details' ? (
          <div className="space-y-5 animate-fade-in">
            {/* Item Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">الصنف المراد توريده</label>
              <select value={itemId} onChange={e => { setItemId(e.target.value); setQty(0); }} className="block w-full rounded-xl border border-gray-300 bg-white p-3.5 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none">
                <option value="">-- اختر الصنف من القائمة --</option>
                {(inventoryItems || []).map(it => <option key={it.id} value={it.id}>{it.name} (سعر الوحدة: {it.costPrice} ₪)</option>)}
              </select>
            </div>

            <div className="space-y-2">
                <FormInput 
                  label="الكمية الموردة" 
                  type="number" 
                  unit={selectedItem?.unit || 'وحدة'} 
                  value={qty === 0 ? '' : qty.toString()} 
                  onChange={e => setQty(parseFloat(e.target.value || '0'))} 
                />
            </div>

            {selectedItem && qty > 0 && (
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2.5 rounded-xl shadow-sm text-indigo-600 border border-indigo-50">
                            <Calculator size={22}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">إجمالي التكلفة المحسوبة</p>
                            <p className="text-xl font-black text-indigo-900">{formatCurrency(amount)}</p>
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-gray-400 font-bold">الحسبة: {qty} × {selectedItem.costPrice} ₪</p>
                    </div>
                </div>
            )}

            {/* Funding Source */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-black text-gray-400 uppercase mb-3 tracking-widest">مصدر التمويل (من أين دفع المال؟)</label>
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setFundingSource('place')} className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${fundingSource === 'place' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}>
                        <ShieldCheck size={18}/> مال المكان
                    </button>
                    <button onClick={() => setFundingSource('partner')} className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${fundingSource === 'partner' ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}>
                        <User size={18}/> مال الشريك
                    </button>
                </div>

                {fundingSource === 'place' ? (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex gap-2">
                            {/* Added missing Banknote import from lucide-react */}
                            <button onClick={() => setChannel('cash')} className={`flex-1 py-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 ${channel === 'cash' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'bg-gray-100/50 border-transparent text-gray-400'}`}><Banknote size={14} className="opacity-70"/> كاش</button>
                            <button onClick={() => setChannel('bank')} className={`flex-1 py-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 ${channel === 'bank' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'bg-gray-100/50 border-transparent text-gray-400'}`}><Landmark size={14} className="opacity-70"/> بنك</button>
                        </div>
                        {channel === 'bank' && (
                            <FormInput as="select" label="الحساب البنكي المخصوم منه" value={accountId || ''} onChange={e => setAccountId(e.target.value)} className="mb-0">
                                <option value="">-- اختر الحساب --</option>
                                {bankAccounts.filter(b=>b.active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </FormInput>
                        )}
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        <FormInput as="select" label="اختر الشريك الذي دفع" value={partnerId || ''} onChange={e => setPartnerId(e.target.value)} className="mb-0">
                            {GLOBAL_PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </FormInput>
                    </div>
                )}
            </div>

            {/* Added missing AlertCircle import from lucide-react */}
            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2 animate-pulse"><AlertCircle size={16}/> {error}</div>}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => { reset(); onClose(); }}>إلغاء</Button>
              <Button onClick={handleNext} disabled={!itemId || qty <= 0} className="bg-indigo-600 px-8">
                  مراجعة الحسبة <ChevronLeft size={18} className="mr-1"/>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <div className="bg-indigo-50 p-6 rounded-[32px] text-center border border-indigo-100 shadow-sm">
                <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm border border-indigo-50">
                    <Package size={32}/>
                </div>
                <h4 className="text-xl font-black text-indigo-900 mb-1">تأكيد التوريد</h4>
                <p className="text-sm text-indigo-600 font-bold">يرجى التأكد من الحسبة المالية قبل الحفظ</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                    <span className="text-gray-400 text-xs font-bold uppercase">الصنف</span>
                    <span className="font-black text-gray-800">{selectedItem?.name}</span>
                </div>
                <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                    <span className="text-gray-400 text-xs font-bold uppercase">الكمية الجديدة</span>
                    <span className="font-black text-emerald-600">+{qty} {selectedItem?.unit}</span>
                </div>
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <span className="text-gray-400 text-xs font-bold uppercase">سعر الوحدة</span>
                    <span className="font-black text-gray-700">{formatCurrency(selectedItem?.costPrice || 0)}</span>
                </div>
                <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                    <span className="text-gray-400 text-xs font-bold uppercase">التكلفة المالية الإجمالية</span>
                    <span className="font-black text-rose-600 text-lg">{formatCurrency(amount)}</span>
                </div>
                <div className="p-4 bg-gray-50 flex justify-between items-center">
                    <span className="text-gray-400 text-xs font-bold uppercase">مصدر الدفع</span>
                    <span className="font-bold text-indigo-700">
                        {fundingSource === 'place' ? `المكان (${channel === 'cash' ? 'كاش' : 'بنك'})` : `الشريك: ${GLOBAL_PARTNERS.find(p=>p.id===partnerId)?.name}`}
                    </span>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setStep('details')} className="px-6 py-2 rounded-xl text-gray-500 font-bold hover:bg-gray-100">تعديل</button>
              <Button onClick={handleSubmit} className="bg-indigo-600 px-8 py-3 rounded-xl shadow-lg shadow-indigo-100 font-black">
                  <CheckCircle size={20} className="ml-2"/> تأكيد وإدخال للمخزون
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default InventorySupplyModal;
