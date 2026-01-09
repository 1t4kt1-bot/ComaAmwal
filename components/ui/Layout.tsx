
import React, { useState } from 'react';
import { 
  LayoutDashboard, Coffee, ShoppingBag, Wallet, Receipt, History, Settings, Menu, X, PieChart, Archive, Wifi, Landmark, Crown, ClipboardList, Briefcase, Users, LogOut, UserCog, DatabaseBackup, Boxes, Banknote, ShieldCheck
} from 'lucide-react';
import { AppUser, Permission } from '../../types';
import ConfirmModal from './ConfirmModal';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: any) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  daysSinceBackup?: number;
  currentUser: AppUser | null;
  onLogout: () => void;
  onEditProfile: () => void;
}

const NavItem = ({ id, label, icon: Icon, active, onClick, badge, locked }: any) => (
  <button
    onClick={() => !locked && onClick(id)}
    disabled={locked}
    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all mb-1 font-bold text-sm ${
      locked 
      ? 'opacity-40 cursor-not-allowed grayscale' 
      : active 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
    }`}
  >
    <div className="flex items-center gap-3">
        <Icon size={18} />
        <span>{label}</span>
    </div>
    {badge && !locked && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'}`}>
            {badge}
        </span>
    )}
  </button>
);

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, isMobileMenuOpen, setIsMobileMenuOpen, currentUser, onLogout, onEditProfile }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const checkAccess = (perm?: Permission) => {
      if (!currentUser) return false;
      if (currentUser.role === 'admin' || currentUser.role === 'partner') return true;
      if (!perm) return true; 
      return currentUser.permissions?.includes(perm) || false;
  };

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'vip_customers', label: 'الزبائن والديون', icon: Crown },
    { id: 'records', label: 'سجل الجلسات', icon: History },
    { id: 'drinks', label: 'المشروبات', icon: Coffee, permission: 'manage_products' },
    { id: 'internet_cards', label: 'بطاقات النت', icon: Wifi, permission: 'manage_products' },
    { id: 'inventory', label: 'المخزون', icon: Boxes },
    { id: 'liabilities', label: 'المصاريف والمشتريات', icon: ShoppingBag, permission: 'view_financials' }, 
    { id: 'partners', label: 'الشركاء والأرباح', icon: Users, permission: 'view_financials' }, 
    { id: 'partner_debts', label: 'مسحوبات الشركاء', icon: Wallet, permission: 'view_financials' },
    { id: 'cost_analysis', label: 'التحليل المالي', icon: PieChart, permission: 'view_reports' },
    { id: 'inventory_archive', label: 'الأرشيف الشهري', icon: Archive, permission: 'view_reports' },
    { id: 'treasury', label: 'الصندوق المركزي', icon: Banknote, permission: 'manage_treasury' }, 
    { id: 'ledger_viewer', label: 'دفتر الأستاذ', icon: ShieldCheck, permission: 'manage_treasury' },
    { id: 'audit_log', label: 'سجل العمليات', icon: ClipboardList, permission: 'manage_system' },
    { id: 'backup_restore', label: 'النسخ الاحتياطي', icon: DatabaseBackup, permission: 'manage_system' },
    ...(currentUser?.role === 'admin' ? [{ id: 'users', label: 'المستخدمين والصلاحيات', icon: UserCog }] : []),
    { id: 'settings', label: 'الإعدادات', icon: Settings, permission: 'manage_system' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans text-gray-900">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-[260px] h-full z-30 p-4 border-l border-gray-200 bg-white">
          <div className="flex items-center gap-3 px-2 mb-8">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <LayoutDashboard size={20} />
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tighter">Co'Ma</span>
          </div>
          
          <nav className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            {navItems.map((item) => {
                const hasAccess = item.id === 'users' ? currentUser?.role === 'admin' : checkAccess(item.permission as Permission);
                return (
                    <NavItem key={item.id} {...item} active={activeView === item.id} onClick={onNavigate} locked={!hasAccess} />
                );
            })}
          </nav>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {currentUser?.username.substring(0,1).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold truncate">{currentUser?.name}</span>
                  </div>
                  <button onClick={() => setShowLogoutConfirm(true)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                      <LogOut size={16} />
                  </button>
              </div>
          </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 z-20 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
               <LayoutDashboard size={18} />
            </div>
            <span className="text-lg font-bold">Co'Ma</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-500">
              <Menu size={24} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar scroll-smooth">
           <div className="max-w-[1400px] mx-auto animate-fade-in">
             {children}
           </div>
        </main>
      </div>

      {/* Mobile Drawer (Simplified) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex items-end">
          <div className="absolute inset-0 bg-gray-900/60" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative bg-white w-full rounded-t-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">القائمة الكاملة</h3>
                <button onClick={() => setIsMobileMenuOpen(false)}><X size={24}/></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
               {navItems.map(item => {
                 const hasAccess = item.id === 'users' ? currentUser?.role === 'admin' : checkAccess(item.permission as Permission);
                 return (
                 <button 
                    key={item.id} 
                    onClick={() => { if(hasAccess) { onNavigate(item.id); setIsMobileMenuOpen(false); } }}
                    disabled={!hasAccess}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-95 ${activeView === item.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-gray-100 text-gray-600'}`}
                 >
                    <item.icon size={20} className="mb-2" />
                    <span className="text-[10px] font-bold text-center leading-tight">{item.label}</span>
                 </button>
               )})}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={onLogout}
        title="تسجيل الخروج"
        message="هل أنت متأكد من رغبتك في تسجيل الخروج؟"
        confirmText="تسجيل خروج"
      />
    </div>
  );
};

export default Layout;
