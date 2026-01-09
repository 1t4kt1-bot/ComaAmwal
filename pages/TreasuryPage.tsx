import React, { useState, useMemo } from 'react';
import { Record, BankAccount, BankAccountType, CashTransfer, Expense, Purchase, DebtItem, PricingConfig, PlaceLoan, SystemState, LedgerEntry, TransactionType } from '../types';
import { 
    Banknote, 
    Landmark, 
    TrendingUp, 
    Wallet, 
    ArrowUpRight, 
    Search, 
    Plus, 
    CreditCard, 
    Smartphone, 
    ArrowDownLeft, 
    ChevronDown,
    AlertCircle,
    X,
    CheckCircle,
    RefreshCw,
    Info,
    Hash,
    User,
    Edit2,
    Calendar,
    Filter,
    Clock,
    XCircle,
    HelpCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import { formatCurrency, formatFullDate, generateId, getLocalDate } from '../utils';
import { getTreasuryStats, resolveActorName } from '../accounting_core';

interface TreasuryPageProps {
    records: Record[];
    accounts: BankAccount[];
    onUpdateAccounts: (accounts: BankAccount[]) => void;
    cashTransfers: CashTransfer[];
    onUpdateCashTransfers: (transfers: CashTransfer[]) => void;
    expenses: Expense[];
    purchases: Purchase[];
    debtsList: DebtItem[];
    pricingConfig: PricingConfig;
    placeLoans: PlaceLoan[];
    systemState: SystemState;
    onAddTransfer?: (t: CashTransfer) => void;
    ledger?: LedgerEntry[];
    onUpdateLedger?: (ledger: LedgerEntry[]) => void;
}

const TreasuryPage: React.FC<TreasuryPageProps> = ({ 
    accounts, onUpdateAccounts, 
    onUpdateCashTransfers, cashTransfers,
    ledger = [],
    onUpdateLedger,
    onAddTransfer
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'transfers'>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferData, setTransferData] = useState({ partnerId: '', amount: '', date: getLocalDate(), note: '', targetAccountId: '' });
    const [transferError, setTransferError] = useState('');

    const [statementSearch, setStatementSearch] = useState('');
    const [dateRangeType, setDateRangeType] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
    const [statementDateFrom, setStatementDateFrom] = useState('');
    const [statementDateTo, setStatementDateTo] = useState('');
    const [statementStatusFilter, setStatementStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');

    const [accountFormData, setAccountFormData] = useState({
        name: '',
        type: '' as BankAccountType | '',
        phone: '',
        iban: ''
    });

    // Helper for validating bank account inputs
    const validateAccount = (data: typeof accountFormData) => {
        const isBank = data.type === 'bop' || data.type === 'isbk';
        const isWallet = data.type === 'palpay' || data.type === 'jawwalpay';
        const cleanPhone = data.phone.replace(/\D/g, '');
        const isPhoneValid = /^(059|056)\d{7}$/.test(cleanPhone);
        const cleanIban = data.iban.replace(/\s/g, '').toUpperCase();
        const isIbanValid = /^PS[0-9A-Z]{27}$/.test(cleanIban);

        const errors = {
            name: !data.name.trim(),
            type: !data.type,
            phone: !isPhoneValid && data.phone.length > 0 ? "رقم الجوال غير صحيح" : "",
            iban: isBank && !isIbanValid && data.iban.length > 0 ? "الآيبان غير صحيح" : ""
        };

        const isValid = !errors.name && !errors.type && (data.phone === '' || isPhoneValid) && (!isBank || isIbanValid);
        return { isValid, errors, cleanPhone, cleanIban };
    };

    // Calculate validation state for the account modal to fix missing 'isFormValid' and 'formErrors'
    const { isValid: isFormValid, errors: formErrors } = validateAccount(accountFormData);

    const handleOpenAccountModal = (acc?: BankAccount) => {
        if (acc) {
            setEditingAccount(acc);
            setAccountFormData({ name: acc.name, type: acc.accountType || '', phone: acc.phone || '', iban: acc.accountNumber || '' });
        } else {
            setEditingAccount(null);
            setAccountFormData({ name: '', type: '', phone: '', iban: '' });
        }
        setIsAccountModalOpen(true);
    };

    const handleSaveAccount = () => {
        const { cleanPhone, cleanIban, isValid } = validateAccount(accountFormData);
        if (!isValid) return;
        const payload: BankAccount = {
            id: editingAccount ? editingAccount.id : generateId(),
            name: accountFormData.name.trim(),
            accountType: accountFormData.type as BankAccountType,
            phone: cleanPhone,
            accountNumber: cleanIban,
            active: editingAccount ? editingAccount.active : true,
            notes: editingAccount ? editingAccount.notes : ''
        };
        if (editingAccount) onUpdateAccounts(accounts.map(a => a.id === editingAccount.id ? payload : a));
        else onUpdateAccounts([...accounts, payload]);
        setIsAccountModalOpen(false);
    };

    const handleCashTransfer = () => {
        const amount = parseFloat(transferData.amount);
        if (!transferData.partnerId || !transferData.targetAccountId || !amount || amount <= 0) { setTransferError('بيانات ناقصة'); return; }
        const stats = getTreasuryStats(ledger, accounts);
        if (amount > stats.cashBalance) { setTransferError(`المبلغ أكبر من المتوفر (${formatCurrency(stats.cashBalance)})`); return; }
        const newTransfer: CashTransfer = { id: generateId(), partnerId: transferData.partnerId, amount, date: transferData.date, timestamp: new Date().toISOString(), note: transferData.note, targetAccountId: transferData.targetAccountId };
        onAddTransfer ? onAddTransfer(newTransfer) : onUpdateCashTransfers([...cashTransfers, newTransfer]);
        setIsTransferModalOpen(false);
    };

    const handleUpdateStatus = (entryId: string, newStatus: 'pending' | 'confirmed' | 'rejected') => {
        if (!onUpdateLedger) return;
        onUpdateLedger(ledger.map(e => e.id === entryId ? { ...e, transferStatus: newStatus } : e));
    };

    const handleDateRangeChange = (type: any) => {
        setDateRangeType(type);
        const today = new Date();
        const f = (d: Date) => d.toISOString().split('T')[0];
        if (type === 'all') { setStatementDateFrom(''); setStatementDateTo(''); }
        else if (type === 'today') { setStatementDateFrom(f(today)); setStatementDateTo(f(today)); }
        else if (type === 'yesterday') { const y = new Date(today); y.setDate(y.getDate()-1); setStatementDateFrom(f(y)); setStatementDateTo(f(y)); }
        else if (type === 'week') { const w = new Date(today); w.setDate(w.getDate()-7); setStatementDateFrom(f(w)); setStatementDateTo(f(today)); }
        else if (type === 'month') { const m = new Date(today); m.setMonth(m.getMonth()-1); setStatementDateFrom(f(m)); setStatementDateTo(f(today)); }
    };

    const stats = useMemo(() => getTreasuryStats(ledger, accounts), [ledger, accounts]);
    const totalFunds = stats.cashBalance + stats.totalBankBalance;

    const filteredMovements = useMemo(() => {
        return ledger.filter(entry => 
            entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
            entry.amount.toString().includes(searchTerm) ||
            (entry.partnerName && entry.partnerName.includes(searchTerm))
        );
    }, [ledger, searchTerm]);

    const statementFiltered = useMemo(() => {
        return ledger.filter(e => {
            if (e.channel !== 'bank' || e.accountId !== selectedAccountId) return false;
            const searchLower = statementSearch.toLowerCase();
            const matchesSearch = statementSearch === '' || e.description.toLowerCase().includes(searchLower) || e.amount.toString().includes(searchLower) || (e.senderName && e.senderName.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;
            if (statementDateFrom && e.dateKey < statementDateFrom) return false;
            if (statementDateTo && e.dateKey > statementDateTo) return false;
            if (statementStatusFilter !== 'all') {
                const status = e.transferStatus || 'rejected';
                if (status !== statementStatusFilter) return false;
            }
            return true;
        }).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    }, [ledger, selectedAccountId, statementSearch, statementDateFrom, statementDateTo, statementStatusFilter]);

    const getAccountIcon = (type?: string) => {
        switch(type) {
            case 'palpay': case 'jawwalpay': return <Smartphone className="text-purple-600"/>;
            case 'bop': case 'isbk': return <Landmark className="text-blue-600"/>;
            default: return <CreditCard className="text-gray-600"/>;
        }
    };

    const getStatusBadge = (status?: string) => {
        const s = status || 'rejected';
        if (s === 'rejected') return { label: 'غير مصنف', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: HelpCircle };
        if (s === 'pending') return { label: 'ما وصل', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock };
        return { label: 'وصل', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle };
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                        <Wallet className="text-emerald-600" size={32} />
                        الصندوق المركزي
                    </h1>
                    <p className="text-gray-500 font-medium mt-1 text-sm">إدارة الحسابات والسيولة النقدية.</p>
                </div>
                <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex">
                    <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><TrendingUp size={16}/> حركة الصندوق</button>
                    <button onClick={() => setActiveTab('transfers')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'transfers' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><Landmark size={16}/> الحسابات البنكية</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-emerald-100 text-xs font-bold uppercase mb-1 tracking-wider">إجمالي الكاش والتحويلات</p>
                        <h3 className="text-3xl font-black">{formatCurrency(totalFunds)}</h3>
                    </div>
                    <ArrowUpRight className="absolute right-4 top-4 text-emerald-400 opacity-20" size={60} />
                </div>
                <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><Banknote size={20}/></div>
                        <span className="text-sm font-bold text-gray-500">كاش (الدرج)</span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-emerald-700">{formatCurrency(stats.cashBalance)}</h3>
                </div>
                <div onClick={() => setActiveTab('transfers')} className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm relative overflow-hidden cursor-pointer hover:bg-indigo-50/50 transition-colors group">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500"></div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 transition-all"><Landmark size={20}/></div>
                        <span className="text-sm font-bold text-gray-500">بنك/تطبيق</span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-indigo-700">{formatCurrency(stats.totalBankBalance)}</h3>
                </div>
            </div>

            {activeTab === 'overview' ? (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => setIsTransferModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md">
                            <RefreshCw size={16} className="ml-2"/> تسييل كاش إلى التطبيق
                        </Button>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-slide-up">
                        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h3 className="font-bold text-lg text-gray-800">سجل الحركات</h3>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute right-3 top-2.5 text-gray-400" size={16}/>
                                <input type="text" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pr-10 pl-4 text-sm focus:outline-none focus:border-indigo-500" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-500 text-xs font-bold">
                                    <tr><th className="px-6 py-4">التاريخ</th><th className="px-6 py-4">البيان / بواسطة</th><th className="px-6 py-4">القناة</th><th className="px-6 py-4">المبلغ</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {filteredMovements.map((entry) => {
                                        // CRITICAL UI FIX: Detect Partner Funded Purchase
                                        const isPartnerPurchase = entry.type === TransactionType.PARTNER_DEPOSIT && 
                                                                 (entry.description.includes('شراء') || entry.description.includes('بضاعة'));
                                        
                                        return (
                                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatFullDate(entry.timestamp || entry.dateKey)}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">{entry.description}</div>
                                                <div className="text-[10px] text-indigo-500 flex items-center gap-1 mt-0.5">
                                                    <User size={10}/> بواسطة: {resolveActorName(entry)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {entry.channel === 'cash' ? (
                                                    <span className="text-emerald-600 font-bold flex items-center gap-1"><Banknote size={14} className="inline"/> كاش</span>
                                                ) : entry.channel === 'bank' ? (
                                                    <span className="text-indigo-600 font-bold flex items-center gap-1"><Landmark size={14} className="inline"/> بنك</span>
                                                ) : (
                                                    <span className="text-rose-600 font-bold flex items-center gap-1"><AlertCircle size={14} className="inline"/> ذمة/دين</span>
                                                )}
                                            </td>
                                            <td className={`px-6 py-4 font-extrabold dir-ltr ${
                                                isPartnerPurchase 
                                                    ? 'text-indigo-600' 
                                                    : (entry.direction === 'in' ? 'text-green-600' : 'text-red-600')
                                            }`}>
                                                <div className="flex flex-col items-end">
                                                    <span>
                                                        {isPartnerPurchase ? '' : (entry.direction === 'in' ? '+' : '-')}
                                                        {formatCurrency(entry.amount)}
                                                    </span>
                                                    {isPartnerPurchase && (
                                                        <span className="text-[9px] font-black uppercase bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 mt-0.5 animate-fade-in tracking-tighter">تمويل خارجي</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-slide-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <button onClick={() => handleOpenAccountModal()} className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all min-h-[160px]">
                            <div className="bg-white p-3 rounded-full shadow-sm mb-3"><Plus size={24} /></div>
                            <span className="font-bold">إضافة حساب جديد</span>
                        </button>
                        {stats.accountsStats.map((acc: any) => (
                            <div key={acc.id} onClick={() => setSelectedAccountId(acc.id)} className={`bg-white p-5 rounded-2xl border shadow-sm cursor-pointer transition-all hover:shadow-md relative group overflow-hidden ${selectedAccountId === acc.id ? 'ring-2 ring-indigo-500 border-transparent' : 'border-gray-200'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${acc.active ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>{getAccountIcon(acc.accountType)}</div>
                                        <div><h3 className="font-bold text-gray-800">{acc.name}</h3><span className="text-[10px] text-gray-500 block">رقم: {acc.accountNumber || '---'}</span></div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-2 py-0.5 rounded text-sm font-bold ${acc.balance >= 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'}`}>{formatCurrency(acc.balance)}</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenAccountModal(acc); }} className="p-1.5 bg-gray-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm border border-gray-100"><Edit2 size={14}/></button>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-end">
                                    <div className="flex gap-4">
                                        <div><span className="text-[10px] text-emerald-600 font-bold block">وارد</span><div className="text-xs font-bold text-gray-700">{formatCurrency(acc.totalIn)}</div></div>
                                        <div><span className="text-[10px] text-red-600 font-bold block">صادر</span><div className="text-xs font-bold text-gray-700">{formatCurrency(acc.totalOut)}</div></div>
                                    </div>
                                    <div className="text-xs text-indigo-600 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">عرض السجل <ChevronDown size={14}/></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {selectedAccountId && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden animate-fade-in mt-4">
                            <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div><h3 className="font-bold text-indigo-900 flex items-center gap-2"><Landmark size={18}/> كشف حساب: {accounts.find(a => a.id === selectedAccountId)?.name}</h3><p className="text-xs text-gray-500 mt-1">عرض وتدقيق الحوالات البنكية</p></div>
                                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                                    <div className="relative"><Search size={14} className="absolute right-2 top-2.5 text-gray-400"/><input placeholder="بحث..." value={statementSearch} onChange={e => setStatementSearch(e.target.value)} className="w-28 md:w-40 text-xs bg-gray-50 border-none rounded-lg py-2 pr-7 pl-2 focus:ring-1 focus:ring-indigo-200"/></div>
                                    <div className="border-r border-gray-200 pr-2"><select value={dateRangeType} onChange={e => handleDateRangeChange(e.target.value)} className="text-xs bg-gray-50 border-none rounded-lg py-2 pl-2 pr-6 focus:ring-1 focus:ring-indigo-200 cursor-pointer font-bold text-gray-700"><option value="all">كل الأوقات</option><option value="today">اليوم</option><option value="yesterday">أمس</option><option value="week">آخر أسبوع</option><option value="month">آخر شهر</option><option value="custom">مخصص</option></select></div>
                                    <div className="border-r border-gray-200 pr-2"><select value={statementStatusFilter} onChange={e => setStatementStatusFilter(e.target.value as any)} className="text-xs bg-gray-50 border-none rounded-lg py-2 pl-2 pr-6 focus:ring-1 focus:ring-indigo-200 cursor-pointer font-bold text-gray-700"><option value="all">كل الحالات</option><option value="rejected">غير مصنف</option><option value="pending">ما وصل</option><option value="confirmed">وصل</option></select></div>
                                    <button onClick={() => setSelectedAccountId(null)} className="text-gray-400 hover:text-red-500 p-1"><X size={18}/></button>
                                </div>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-gray-50 text-gray-500 font-bold sticky top-0 z-10"><tr><th className="px-6 py-3">التاريخ</th><th className="px-6 py-3">البيان</th><th className="px-6 py-3">اسم المحول</th><th className="px-6 py-3">المبلغ</th><th className="px-6 py-3">حالة الحوالة</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {statementFiltered.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">لا يوجد حركات</td></tr> :
                                            statementFiltered.map(tx => {
                                                const badge = getStatusBadge(tx.transferStatus);
                                                const StatusIcon = badge.icon;
                                                return (
                                                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatFullDate(tx.timestamp || tx.dateKey)}</td>
                                                    <td className="px-6 py-3"><div><div className="font-bold text-gray-800">{tx.description}</div><div className="text-[9px] text-gray-400">بواسطة: {resolveActorName(tx)}</div></div></td>
                                                    <td className="px-6 py-3 font-medium text-indigo-700">{tx.senderName || '-'}</td>
                                                    <td className={`px-6 py-3 font-bold dir-ltr ${tx.direction === 'out' ? 'text-red-600' : 'text-green-600'}`}>{tx.direction === 'in' ? '+' : '-'}{formatCurrency(tx.amount)}</td>
                                                    <td className="px-6 py-3">{tx.direction === 'in' && onUpdateLedger ? (<button onClick={() => { const current = tx.transferStatus || 'rejected'; let next: any = 'confirmed'; if (current === 'rejected') next = 'pending'; else if (current === 'pending') next = 'confirmed'; else next = 'rejected'; handleUpdateStatus(tx.id, next); }} className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all border ${badge.color} hover:opacity-80 shadow-sm`}><StatusIcon size={12} /> {badge.label}</button>) : <span className="text-gray-400">-</span>}</td>
                                                </tr>
                                            )})
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title={editingAccount ? "تعديل حساب مالي" : "إضافة حساب مالي جديد"}>
                <div className="space-y-5">
                    <FormInput label="اسم الحساب" value={accountFormData.name} onChange={e => setAccountFormData({...accountFormData, name: e.target.value})} />
                    <div className="space-y-2"><label className="block text-sm font-bold text-gray-800">نوع الحساب</label><select value={accountFormData.type} onChange={e => setAccountFormData({...accountFormData, type: e.target.value as BankAccountType})} className="block w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">-- اختر النوع --</option><option value="palpay">PalPay</option><option value="jawwalpay">Jawwal Pay</option><option value="bop">بنك فلسطين</option><option value="isbk">الإسلامي الفلسطيني</option><option value="other">أخرى</option></select></div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                        <FormInput label="رقم الجوال المرتبط" type="tel" value={accountFormData.phone} onChange={e => setAccountFormData({...accountFormData, phone: e.target.value.replace(/\D/g, '')})} error={formErrors.phone} />
                        {(accountFormData.type === 'bop' || accountFormData.type === 'isbk') && <FormInput label="رقم الآيبان (IBAN)" value={accountFormData.iban} onChange={e => setAccountFormData({...accountFormData, iban: e.target.value.replace(/\s/g, '').toUpperCase()})} error={formErrors.iban} />}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t"><Button variant="secondary" onClick={() => setIsAccountModalOpen(false)}>إلغاء</Button><Button className={`${isFormValid ? 'bg-indigo-600' : 'bg-gray-300'} px-6`} onClick={handleSaveAccount} disabled={!isFormValid}><CheckCircle size={18} className="ml-2"/> {editingAccount ? 'حفظ' : 'إنشاء'}</Button></div>
                </div>
            </Modal>

            <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="تسييل كاش إلى التطبيق">
                <div className="space-y-5">
                    <FormInput as="select" label="الشريك" value={transferData.partnerId} onChange={e => setTransferData({...transferData, partnerId: e.target.value})}><option value="">-- اختر --</option>{PARTNERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</FormInput>
                    <FormInput as="select" label="الحساب البنكي المستقبل" value={transferData.targetAccountId} onChange={e => setTransferData({...transferData, targetAccountId: e.target.value})}><option value="">-- اختر الحساب --</option>{accounts.filter(a => a.active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</FormInput>
                    <div className="grid grid-cols-2 gap-4"><FormInput label="المبلغ" type="number" unit="₪" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} /><FormInput label="التاريخ" type="date" value={transferData.date} onChange={e => setTransferData({...transferData, date: e.target.value})} /></div>
                    {transferError && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-bold flex items-center gap-2"><AlertCircle size={18}/> {transferError}</div>}
                    <div className="flex justify-end gap-3 pt-4 border-t"><Button variant="secondary" onClick={() => setIsTransferModalOpen(false)}>إلغاء</Button><Button className="bg-purple-600 px-6" onClick={handleCashTransfer}><CheckCircle size={18} className="ml-2"/> تأكيد</Button></div>
                </div>
            </Modal>
        </div>
    );
};

const PARTNERS = [{ id: 'abu_khaled', name: 'أبو خالد' }, { id: 'khaled', name: 'خالد' }, { id: 'abdullah', name: 'عبد الله' }];

export default TreasuryPage;