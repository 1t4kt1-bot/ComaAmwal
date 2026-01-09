
import React, { useState } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';

interface LoginPageProps {
    onLogin: (u: string, p: string) => Promise<boolean>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const success = await onLogin(username, password);
        if (!success) {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-indigo-900 font-sans" dir="rtl">
            <div className="w-full max-w-md px-6 animate-fade-in">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="p-8 pb-6 text-center">
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl mx-auto flex items-center justify-center mb-6">
                            <span className="text-3xl font-black text-indigo-900">
                                C<span className="text-indigo-600">'</span>M
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">تسجيل الدخول</h2>
                        <p className="text-gray-500 text-sm font-medium">إدارة مساحة العمل</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 mr-1 uppercase tracking-wider">اسم المستخدم</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                    <User size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pr-10 pl-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold" 
                                    placeholder="Username"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 mr-1 uppercase tracking-wider">كلمة المرور</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pr-10 pl-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold" 
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 px-4 rounded-xl shadow-lg text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-70 mt-2"
                        >
                            {isLoading ? "جاري الدخول..." : "دخول النظام"}
                        </button>
                    </form>
                    
                    <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Co'Ma Workspace Manager v1.0</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
