
import React, { useState, useMemo } from 'react';
import { LedgerEntry, TransactionType } from '../types';
import { formatCurrency, formatFullDate } from '../utils';
import { Search, Download, Filter, ArrowUpRight, ArrowDownLeft, ShieldCheck, User, UserCheck } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button';
import { resolveActorName } from '../accounting_core';

interface LedgerViewerPageProps {
    ledger: LedgerEntry[];
}

const TYPE_TRANSLATION: Record<string, string> = {
    [TransactionType.INCOME_SESSION]: 'إيراد مبيعات',
    [TransactionType.INCOME_PRODUCT]: 'إيراد منتجات',
    [TransactionType.DEBT_PAYMENT]: 'سداد دين زبون',
    [TransactionType.LOAN_RECEIPT]: 'استلام قرض',
    [TransactionType.DEBT_CREATE]: 'تسجيل دين',
    [TransactionType.EXPENSE_OPERATIONAL]: 'مصروف تشغيلي',
    [TransactionType.EXPENSE_PURCHASE]: 'مشتريات',
    [TransactionType.LOAN_REPAYMENT]: 'سداد قرض',
    [TransactionType.SAVING_DEPOSIT]: 'إيداع ادخار',
    [TransactionType.SAVING_WITHDRAWAL]: 'سحب ادخار',
    [TransactionType.PARTNER_WITHDRAWAL]: 'سحب شريك',
    [TransactionType.PARTNER_DEPOSIT]: 'إيداع شريك',
    [TransactionType.PARTNER_DEBT_PAYMENT]: 'سداد ذمة شريك',
    [TransactionType.LIQUIDATION_TO_APP]: 'تسييل / تحويل',
    [TransactionType.INTERNAL_TRANSFER]: 'تحويل داخلي',
    [TransactionType.OPENING_BALANCE]: 'رصيد افتتاحي',
};

const LedgerViewerPage: React.FC<LedgerViewerPageProps> = ({ ledger }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [limit, setLimit] = useState(100);

    const filteredLedger = useMemo(() => {
        return ledger.filter(entry => {
            const matchesSearch = 
                entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                entry.id.includes(searchTerm) ||
                (entry.partnerName && entry.partnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (entry.performedByName && entry.performedByName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (entry.referenceId && entry.referenceId.includes(searchTerm));
            
            const matchesType = typeFilter === 'all' || entry.type === typeFilter;
            
            return matchesSearch && matchesType;
        }).slice(0, limit);
    }, [ledger, searchTerm, typeFilter, limit]);

    const handleExport = () => {
        const data = filteredLedger.map(e => ({
            'المعرف (ID)': e.id,
            'التاريخ': e.dateKey,
            'التوقيت': new Date(e.timestamp).toLocaleTimeString('ar-SA'),
            'نوع العملية': TYPE_TRANSLATION[e.type] || e.type,
            'الجهة / المصدر': resolveActorName(e),
            'بواسطة (الموظف)': e.performedByName || '-',
            'الوصف': e.description,
            'المبلغ': e.amount,
            'الاتجاه': e.direction === 'in' ? 'قبض (+)' : 'صرف (-)',
            'القناة المالية': e.channel === 'cash' ? 'كاش (صندوق)' : (e.channel === 'bank' ? 'بنك' : 'ذمم'),
            'حساب البنك': e.accountId || '-',
            'معرف مرجعي': e.referenceId || '-',
            'اسم المحول (بنك)': e.senderName || '-',
            'رقم جوال المحول': e.senderPhone || '-',
            'حالة الحوالة': e.transferStatus === 'confirmed' ? 'مؤكدة' : (e.transferStatus === 'pending' ? 'ما وصل' : '-')
        }));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        if(!ws['!views']) ws['!views'] = [];
        ws['!views'].push({ rightToLeft: true });

        XLSX.utils.book_append_sheet(wb, ws, "دفتر الأستاذ");
        XLSX.writeFile(wb, `Ledger_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <ShieldCheck className="text-indigo-600"/> دفتر الأستاذ (Central Ledger)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        سجل العمليات المالي المركزي. (يعرض من قام بالعملية بشكل منفصل)
                    </p>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download size={16} className="ml-2"/> تصدير Excel (عربي)
                </Button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-3 text-gray-400" size={18}/>
                    <input 
                        type="text" 
                        placeholder="بحث في السجل (ID، وصف، اسم الشريك، الموظف)..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-400"/>
                    <select 
                        value={typeFilter} 
                        onChange={e => setTypeFilter(e.target.value)}
                        className="p-2 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="all">كل العمليات</option>
                        <option value="INCOME_SESSION">إيراد مبيعات</option>
                        <option value="EXPENSE_OPERATIONAL">مصروفات</option>
                        <option value="DEBT_CREATE">ديون</option>
                        <option value="LIQUIDATION_TO_APP">تسييل / تحويل</option>
                        <option value="PARTNER_WITHDRAWAL">مسحوبات شركاء</option>
                        <option value="PARTNER_DEPOSIT">إيداعات/سداد شركاء</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">التاريخ</th>
                                <th className="px-4 py-3">النوع</th>
                                <th className="px-4 py-3">الجهة (المصدر)</th>
                                <th className="px-4 py-3 bg-indigo-50/50 text-indigo-800">بواسطة (الموظف)</th>
                                <th className="px-4 py-3">الوصف</th>
                                <th className="px-4 py-3">القناة</th>
                                <th className="px-4 py-3">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-mono">
                            {filteredLedger.map(entry => (
                                <tr key={entry.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-400 select-all">{entry.id}</td>
                                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                        {entry.dateKey} <span className="text-[10px] text-gray-400 block">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-bold text-gray-700">
                                            {TYPE_TRANSLATION[entry.type] || entry.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-sans font-medium text-gray-700">
                                        <div className="flex items-center gap-1">
                                            <User size={10} className="text-gray-400"/>
                                            {resolveActorName(entry)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-sans font-bold text-indigo-700 bg-indigo-50/20">
                                        <div className="flex items-center gap-1">
                                            <UserCheck size={12} className="text-indigo-500"/>
                                            {entry.performedByName || 'System'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-sans font-medium text-gray-800">{entry.description}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${entry.channel === 'cash' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                            {entry.channel === 'cash' ? 'كاش' : 'بنك'}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 font-bold dir-ltr ${entry.direction === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        <div className="flex items-center gap-1">
                                            {entry.direction === 'in' ? <ArrowDownLeft size={12}/> : <ArrowUpRight size={12}/>}
                                            {formatCurrency(entry.amount)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {ledger.length > limit && (
                    <div className="p-4 text-center border-t border-gray-100">
                        <button onClick={() => setLimit(l => l + 100)} className="text-indigo-600 text-sm font-bold hover:underline">
                            عرض المزيد...
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LedgerViewerPage;
