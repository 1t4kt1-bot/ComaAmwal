
import React, { useState } from 'react';
import { AppUser, Permission, UserRole } from '../types';
import { UserCog, Plus, Search, Edit2, Trash2, ShieldCheck, User, X, CheckCircle, Briefcase, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import ConfirmModal from '../components/ui/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';

interface UsersPageProps {
    users: AppUser[];
    onAddUser: (u: AppUser) => void;
    onUpdateUser: (u: AppUser) => void;
    onDeleteUser: (id: string) => void;
    currentUser: AppUser;
}

const AVAILABLE_PERMISSIONS: { key: Permission; label: string }[] = [
    { key: 'view_summary', label: 'عرض ملخص اليوم' },
    { key: 'manage_products', label: 'إدارة المنتجات (مشروبات/بطاقات)' },
    { key: 'view_financials', label: 'المالية (مصاريف، شركاء، ديون)' },
    { key: 'manage_treasury', label: 'إدارة الصندوق والحسابات البنكية' },
    { key: 'view_reports', label: 'عرض التقارير والتحليل المالي' },
    { key: 'manage_system', label: 'إعدادات النظام والنسخ الاحتياطي' },
];

const UsersPage: React.FC<UsersPageProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        role: 'user' as UserRole,
        permissions: [] as Permission[]
    });
    const [error, setError] = useState('');

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpen = (user?: AppUser) => {
        setError('');
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                username: user.username,
                password: user.password,
                role: user.role,
                permissions: user.permissions || []
            });
        } else {
            setEditingUser(null);
            setFormData({ name: '', username: '', password: '', role: 'user', permissions: [] });
        }
        setIsModalOpen(true);
    };

    const handlePermissionChange = (perm: Permission) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.username || !formData.password) {
            setError('جميع الحقول مطلوبة');
            return;
        }

        // Check duplicate username
        const duplicate = users.find(u => u.username.toLowerCase() === formData.username.toLowerCase() && u.id !== editingUser?.id);
        if (duplicate) {
            setError('اسم المستخدم مستخدم بالفعل');
            return;
        }

        const newUser: AppUser = {
            id: editingUser ? editingUser.id : Math.random().toString(36).substr(2, 9),
            name: formData.name,
            username: formData.username,
            password: formData.password,
            role: formData.role,
            permissions: formData.role === 'user' ? formData.permissions : undefined, // Clean permissions if not user
            createdAt: editingUser ? editingUser.createdAt : new Date().toISOString()
        };

        if (editingUser) {
            onUpdateUser(newUser);
        } else {
            onAddUser(newUser);
        }
        setIsModalOpen(false);
    };

    const getRoleBadge = (role: UserRole) => {
        if (role === 'admin') return <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold">مسؤول (كامل)</span>;
        if (role === 'partner') return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold">شريك</span>;
        return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-bold">مستخدم</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <UserCog className="text-indigo-600" /> إدارة المستخدمين
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">إضافة موظفين وشركاء، وتحديد الصلاحيات وكلمات المرور.</p>
                </div>
                <Button onClick={() => handleOpen()} size="lg" className="shadow-lg shadow-indigo-200">
                    <Plus size={18} className="ml-2" /> إضافة مستخدم
                </Button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative">
                    <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="بحث بالاسم أو اسم المستخدم..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </div>

            {filteredUsers.length === 0 ? (
                <EmptyState icon={UserCog} title="لا يوجد مستخدمين" description="لم يتم العثور على مستخدمين." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            {user.role === 'admin' && <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-br-full -translate-x-8 -translate-y-8 flex items-end justify-end p-2"><ShieldCheck className="text-white mb-1 mr-1" size={16} /></div>}
                            {user.role === 'partner' && <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-br-full -translate-x-8 -translate-y-8 flex items-end justify-end p-2"><Briefcase className="text-white mb-1 mr-1" size={16} /></div>}
                            
                            <div className="flex items-start justify-between mb-4 pl-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : user.role === 'partner' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{user.name}</h3>
                                        <p className="text-xs text-gray-500 font-mono">@{user.username}</p>
                                    </div>
                                </div>
                                {getRoleBadge(user.role)}
                            </div>

                            {/* Permission Summary for Users */}
                            {user.role === 'user' && (
                                <div className="mb-4">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">الصلاحيات الممنوحة</p>
                                    <div className="flex flex-wrap gap-1">
                                        {user.permissions && user.permissions.length > 0 ? (
                                            user.permissions.slice(0, 3).map(p => (
                                                <span key={p} className="text-[9px] bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                                    {AVAILABLE_PERMISSIONS.find(ap => ap.key === p)?.label.split(' ')[0]}...
                                                </span>
                                            ))
                                        ) : <span className="text-[10px] text-gray-400 italic">صلاحيات أساسية فقط</span>}
                                        {user.permissions && user.permissions.length > 3 && <span className="text-[9px] text-gray-400">+{user.permissions.length - 3}</span>}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                <span className="text-xs text-gray-400">أضيف في: {new Date(user.createdAt).toLocaleDateString('ar-SA')}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpen(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                    {user.id !== currentUser.id && (
                                        <button onClick={() => setDeleteId(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? "تعديل مستخدم" : "إضافة مستخدم جديد"}>
                <div className="space-y-4">
                    <FormInput label="الاسم الكامل" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="الاسم الظاهر في النظام" />
                    <FormInput label="اسم المستخدم (للدخول)" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                    <FormInput label="كلمة المرور" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="********" />
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <label className="block text-sm font-bold text-gray-800 mb-2">نوع الدور (Role)</label>
                        <div className="flex gap-2 mb-2">
                            <button type="button" onClick={() => setFormData({...formData, role: 'user'})} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${formData.role === 'user' ? 'bg-white shadow text-gray-800 border border-gray-200 ring-1 ring-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}>
                                <User size={14}/> مستخدم
                            </button>
                            <button type="button" onClick={() => setFormData({...formData, role: 'partner'})} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${formData.role === 'partner' ? 'bg-amber-100 text-amber-800 shadow ring-1 ring-amber-300' : 'text-gray-500 hover:bg-gray-100'}`}>
                                <Briefcase size={14}/> شريك
                            </button>
                            <button type="button" onClick={() => setFormData({...formData, role: 'admin'})} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${formData.role === 'admin' ? 'bg-indigo-600 text-white shadow ring-1 ring-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                                <ShieldCheck size={14}/> مسؤول
                            </button>
                        </div>
                        
                        <div className="bg-white p-2 rounded border border-gray-100 text-[10px] text-gray-600">
                            {formData.role === 'admin' && 'المسؤول: صلاحيات كاملة (إدارة كل شيء + المستخدمين).'}
                            {formData.role === 'partner' && 'الشريك: صلاحيات كاملة مثل المسؤول، لكن لا يمكنه إدارة المستخدمين أو الصلاحيات.'}
                            {formData.role === 'user' && 'المستخدم: صلاحيات أساسية (Dashboard, Sessions, Records). يمكن منح صلاحيات إضافية بالأسفل.'}
                        </div>
                    </div>

                    {/* Permissions Selector (Only for User) */}
                    {formData.role === 'user' && (
                        <div className="border-t border-gray-100 pt-3 animate-slide-up">
                            <label className="block text-sm font-bold text-gray-800 mb-2">تحديد الصلاحيات الإضافية</label>
                            <div className="grid grid-cols-1 gap-2">
                                {AVAILABLE_PERMISSIONS.map(perm => (
                                    <div key={perm.key} onClick={() => handlePermissionChange(perm.key)} className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${formData.permissions.includes(perm.key) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <span className={`text-xs font-bold ${formData.permissions.includes(perm.key) ? 'text-indigo-800' : 'text-gray-600'}`}>{perm.label}</span>
                                        {formData.permissions.includes(perm.key) && <CheckCircle size={14} className="text-indigo-600"/>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-2 rounded flex items-center gap-2"><X size={16}/> {error}</p>}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                        <Button onClick={handleSubmit}><CheckCircle size={18} className="ml-2"/> حفظ</Button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal 
                isOpen={!!deleteId} 
                onClose={() => setDeleteId(null)} 
                onConfirm={() => { if(deleteId) onDeleteUser(deleteId); }} 
                message="هل أنت متأكد من حذف هذا المستخدم؟" 
            />
        </div>
    );
};

export default UsersPage;
