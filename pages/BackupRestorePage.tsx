
import React, { useRef, useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { exportBackup, importBackup, clearAllData } from '../storage';

interface BackupRestorePageProps {
    onBackupComplete?: () => void;
}

const BackupRestorePage: React.FC<BackupRestorePageProps> = ({ onBackupComplete }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleDownload = () => {
        const json = exportBackup();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `COMA_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setMessage({ type: 'success', text: 'تم تصدير النسخة الاحتياطية بنجاح.' });
        
        if (onBackupComplete) onBackupComplete();
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            const result = importBackup(content);
            if (result.success) {
                setMessage({ type: 'success', text: result.message });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setMessage({ type: 'error', text: result.message });
            }
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        if (confirm('تحذير شديد: هذا الإجراء سيحذف جميع البيانات من المتصفح ولا يمكن التراجع عنه. هل أنت متأكد؟')) {
            clearAllData();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Database className="text-blue-600"/> النسخ الاحتياطي والاستعادة
                </h2>
                <p className="text-sm text-gray-500 mt-1">حفظ بيانات النظام في ملف خارجي أو استعادتها.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                    <span className="font-bold">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:border-blue-300 transition-colors">
                    <div className="bg-blue-50 p-4 rounded-full mb-4 text-blue-600">
                        <Download size={32}/>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">تصدير نسخة احتياطية</h3>
                    <p className="text-sm text-gray-500 mb-6">تحميل ملف JSON يحتوي على جميع بيانات النظام الحالية (السجلات، الحسابات، الإعدادات).</p>
                    <Button onClick={handleDownload} className="w-full justify-center bg-blue-600 hover:bg-blue-700">
                        تحميل الملف
                    </Button>
                </div>

                {/* Import */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center hover:border-indigo-300 transition-colors">
                    <div className="bg-indigo-50 p-4 rounded-full mb-4 text-indigo-600">
                        <Upload size={32}/>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-2">استعادة نسخة</h3>
                    <p className="text-sm text-gray-500 mb-6">رفع ملف JSON لاستبدال البيانات الحالية. سيتم التحقق من سلامة الملف قبل الاستعادة.</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden"/>
                    <Button onClick={handleUploadClick} className="w-full justify-center bg-indigo-600 hover:bg-indigo-700">
                        رفع ملف النسخة
                    </Button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="text-red-700 font-bold flex items-center gap-2"><AlertTriangle size={20}/> منطقة الخطر</h4>
                        <p className="text-sm text-red-600 mt-1">تصفير النظام وحذف جميع البيانات المحلية.</p>
                    </div>
                    <Button variant="danger" onClick={handleReset}>
                        تصفير النظام بالكامل
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default BackupRestorePage;
