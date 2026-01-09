
import React, { useState } from 'react';
import { AuditLogItem } from '../types';
import { History, Shield, Clock, Download, Search, UserCheck } from 'lucide-react';
import Button from '../components/ui/Button';
// @ts-ignore
import * as XLSX from 'xlsx';

interface AuditLogPageProps {
    logs: AuditLogItem[];
}

const AuditLogPage: React.FC<AuditLogPageProps> = ({ logs }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLogs = logs.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const data = filteredLogs.map(log => ({
            'التوقيت': new Date(log.timestamp).toLocaleString('ar-SA'),
            'نوع الكائن': log.entityType,
            'المعرف (ID)': log.entityId,
            'الإجراء': log.action,
            'التفاصيل': log.details,
            'المستخدم': log.performedByName || 'System'
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        if(!ws['!views']) ws['!views'] = [];
        ws['!views'].push({ rightToLeft: true });

        XLSX.utils.book_append_sheet(wb, ws, "سجل العمليات");
        XLSX.writeFile(wb, `Audit_Log_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="text-gray-600"/> سجل العمليات (Audit Log)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">تتبع جميع الإجراءات والتغييرات في النظام (دخول، خروج، تعديلات).</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder="بحث في السجل..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pr-10 pl-4 text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <Button variant="outline" onClick={handleExport}>
                        <Download size={16} className="ml-2"/> تصدير Excel
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">لا يوجد سجلات مطابقة</div>
                    ) : (
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-bold sticky top-0 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3">التوقيت</th>
                                    <th className="px-6 py-3">بواسطة</th>
                                    <th className="px-6 py-3">الإجراء</th>
                                    <th className="px-6 py-3">التفاصيل</th>
                                    <th className="px-6 py-3">Entity ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-gray-400"/>
                                                {new Date(log.timestamp).toLocaleString('ar-SA')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-medium">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full w-fit">
                                                <UserCheck size={12}/> {log.performedByName || 'System'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-800">{log.details}</td>
                                        <td className="px-6 py-3 text-xs text-gray-400 font-mono select-all">{log.entityId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditLogPage;
