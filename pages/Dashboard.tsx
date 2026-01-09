
import React, { useState, useMemo, useEffect } from 'react';
import { Session, DeviceStatus, SystemState, Order, Customer, Record, PricingConfig, DayCycle, LedgerEntry, AppUser, Permission } from '../types';
import { LogOut, Plus, Clock, User, StickyNote, Search, Coffee, Smartphone, Laptop, PieChart, Activity, Wallet, ChevronRight, Lock, Calendar, PlayCircle, Edit2, Trash2, Wifi, StopCircle, Package, Star, CreditCard, Banknote, Timer, Monitor, ArrowRightLeft, History, RotateCcw, Landmark, Box, Zap, AlertCircle, TrendingUp, TrendingDown, Crown, Boxes } from 'lucide-react';
import Button from '../components/ui/Button';
import { formatDate, calculateOrdersTotal, formatCurrency, calculateTimeCost, getCurrentTimeOnly, mergeDateAndTime, getLocalDate, calculateSessionSegments } from '../utils';
import { getLedgerTotals, getLedgerBalance } from '../accounting_core';

interface DashboardProps {
  sessions: Session[];
  records?: Record[];
  dayCycles?: DayCycle[]; 
  onAddCustomer: () => void;
  onCheckout: (session: Session) => void;
  onAddDrink: (session: Session) => void;
  onAddCard: (session: Session) => void; // New Prop
  onNavigate: (view: any) => void;
  onCloseDay?: () => void; 
  systemState?: SystemState;
  onStartNewDay?: () => void;
  onInventory?: () => void; 
  onStartNewMonth?: () => void;
  onEditOrder: (session: Session, order: Order) => void;
  onDeleteOrder: (session: Session, orderId: string) => void;
  onDeviceChange: (sessionId: string, newDevice: DeviceStatus) => void;
  onUndoEvent: (sessionId: string) => void;
  onViewAudit: () => void;
  customers?: Customer[];
  pricingConfig?: PricingConfig;
  ledger?: LedgerEntry[];
  currentUser?: AppUser | null;
}

const DeviceBadge: React.FC<{ status: DeviceStatus }> = ({ status }) => {
  const config = {
    mobile: { icon: Smartphone, text: 'جوال', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    laptop: { icon: Laptop, text: 'لابتوب', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  };
  const { icon: Icon, text, color } = config[status] || config.mobile;
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold border ${color} shadow-sm`}>
      <Icon size={12} className="ml-1" />{text}
    </span>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
    sessions, 
    records = [],
    dayCycles = [], 
    onAddCustomer, 
    onCheckout, 
    onAddDrink, 
    onAddCard,
    onNavigate, 
    onCloseDay, 
    systemState, 
    onStartNewDay, 
    onInventory, 
    onEditOrder, 
    onDeleteOrder, 
    onDeviceChange,
    onUndoEvent,
    onViewAudit,
    customers = [],
    pricingConfig,
    ledger = [],
    currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const checkAccess = (perm: Permission) => {
      if (!currentUser) return false;
      if (currentUser.role === 'admin' || currentUser.role === 'partner') return true;
      return currentUser.permissions?.includes(perm) || false;
  };

  const canManageTreasury = checkAccess('manage_treasury');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const filteredSessions = sessions.filter(session => 
    session.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
      const today = getLocalDate();
      let estimatedOpenRevenue = 0;
      if (pricingConfig) {
          const nowIso = currentTime.toISOString(); 
          sessions.forEach(s => {
             const { totalCost } = calculateSessionSegments(
                 s.startTime, 
                 nowIso, 
                 s.events && s.events.length > 0 ? s.events[0].fromDevice : s.deviceStatus,
                 s.events || [],
                 pricingConfig
             );
             estimatedOpenRevenue += (totalCost + calculateOrdersTotal(s.orders));
          });
      }
      const bankBalance = getLedgerBalance(ledger, 'bank');
      const cashBalance = getLedgerBalance(ledger, 'cash');
      const ledgerStatsToday = getLedgerTotals(ledger, 'today', today);
      const sessionCountToday = records.filter(r => r.startTime.startsWith(today)).length;

      return {
          openRevenue: Math.round(estimatedOpenRevenue),
          bankBalance: bankBalance || 0,
          cashBalance: cashBalance || 0,
          collectedToday: ledgerStatsToday.income || 0,
          totalActive: sessions.length,
          totalToday: sessionCountToday + sessions.length
      };
  }, [sessions, ledger, pricingConfig, currentTime, records]);
  
  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* 1. HERO SECTION: Welcome & Quick Control (Bento Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Welcome Card - Spans 2 cols */}
          <div className="lg:col-span-2 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-[28px] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-200">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                          <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              {systemState?.dayStatus === 'open' ? <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> : <span className="w-2 h-2 rounded-full bg-red-400"></span>}
                              {systemState?.dayStatus === 'open' ? 'الدورة اليومية مفتوحة' : 'الدورة مغلقة'}
                          </span>
                      </div>
                      <h2 className="text-3xl font-black mb-2">أهلاً، {currentUser?.name}</h2>
                      <p className="text-indigo-200 text-sm max-w-sm">
                          نظام إدارة مساحة العمل يعمل بكفاءة. لديك <strong className="text-white">{sessions.length}</strong> جلسات نشطة حالياً.
                      </p>
                  </div>
                  
                  <div className="flex gap-3 mt-8">
                        {systemState?.activeCycleId ? (
                            <button onClick={onCloseDay} className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2">
                                <StopCircle size={18}/> إغلاق اليوم
                            </button>
                        ) : (
                            <button onClick={onStartNewDay} className="flex-1 bg-white text-indigo-700 hover:bg-indigo-50 py-3 rounded-xl font-bold shadow-lg transition-all text-sm flex items-center justify-center gap-2">
                                <PlayCircle size={18}/> بدء يوم جديد
                            </button>
                        )}
                        <button onClick={onAddCustomer} disabled={!systemState?.activeCycleId} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-bold shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            <Plus size={18}/> جلسة جديدة
                        </button>
                  </div>
              </div>
          </div>

          {/* Quick Stats Grid - Spans 2 cols */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              {/* Bank Balance */}
              <div className={`p-6 rounded-[24px] bg-white border border-gray-100 shadow-sm relative overflow-hidden group ${!canManageTreasury ? 'opacity-70 grayscale' : 'hover:shadow-md transition-shadow'}`} onClick={() => canManageTreasury && onNavigate('treasury')}>
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Landmark size={80} className="text-indigo-600"/></div>
                  <div className="flex flex-col h-full justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2 group-hover:scale-110 transition-transform"><Landmark size={20}/></div>
                      <div>
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">رصيد البنك</p>
                          <h3 className="text-2xl font-black text-gray-800 mt-1">{canManageTreasury ? formatCurrency(stats.bankBalance) : '***'}</h3>
                      </div>
                  </div>
              </div>

              {/* Cash Balance */}
              <div className="p-6 rounded-[24px] bg-white border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Banknote size={80} className="text-emerald-600"/></div>
                  <div className="flex flex-col h-full justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2 group-hover:scale-110 transition-transform"><Banknote size={20}/></div>
                      <div>
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">رصيد الكاش</p>
                          <h3 className="text-2xl font-black text-gray-800 mt-1">{canManageTreasury ? formatCurrency(stats.cashBalance) : '***'}</h3>
                      </div>
                  </div>
              </div>

              {/* Expected Revenue */}
              <div className="p-6 rounded-[24px] bg-white border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="flex flex-col h-full justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-2 group-hover:scale-110 transition-transform"><TrendingUp size={20}/></div>
                      <div>
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">دخل متوقع (مفتوح)</p>
                          <h3 className="text-2xl font-black text-gray-800 mt-1">{formatCurrency(stats.openRevenue)}</h3>
                      </div>
                  </div>
              </div>

              {/* Quick Actions (Records/Inventory) */}
              <div className="grid grid-rows-2 gap-3">
                  <button onClick={() => onNavigate('records')} className="bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 rounded-2xl flex items-center px-4 gap-3 transition-all text-gray-600 hover:text-indigo-600 font-bold text-xs group">
                      <History size={16} className="group-hover:scale-110 transition-transform"/> سجل الجلسات
                  </button>
                  <button onClick={onInventory} className="bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 rounded-2xl flex items-center px-4 gap-3 transition-all text-gray-600 hover:text-indigo-600 font-bold text-xs group">
                      <Boxes size={16} className="group-hover:scale-110 transition-transform"/> الجرد
                  </button>
              </div>
          </div>
      </div>

      {/* 3. Active Sessions Header */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-2 pl-3 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 pr-2">
            <div className="bg-indigo-100 text-indigo-700 p-2 rounded-xl"><User size={20}/></div>
            <h2 className="text-lg font-black text-gray-800">
                الجلسات النشطة
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full mr-2">{sessions.length}</span>
            </h2>
          </div>
          <div className="relative flex-1 max-w-md w-full group">
            <Search className="absolute right-3 top-2.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
                type="text" 
                placeholder="بحث سريع عن زبون..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="block w-full rounded-xl border-none bg-gray-50 py-2.5 pr-10 pl-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all placeholder:font-normal" 
            />
          </div>
        </div>

        {/* 4. Session Cards Grid */}
        {filteredSessions.length === 0 ? (
          <div className="text-center py-24 bg-white/50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <User className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700">لا يوجد جلسات نشطة</h3>
            <p className="mt-1 text-sm text-gray-400">ابدأ بإضافة زبون جديد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSessions.map((session) => {
              const ordersTotal = calculateOrdersTotal(session.orders || []);
              const customerInfo = customers.find(c => c.phone === session.customerPhone);
              
              let liveCost = 0;
              if (pricingConfig) {
                  const nowIso = new Date().toISOString();
                  const { totalCost } = calculateSessionSegments(
                      session.startTime, 
                      nowIso, 
                      session.events && session.events.length > 0 ? session.events[0].fromDevice : session.deviceStatus,
                      session.events || [],
                      pricingConfig
                  );
                  liveCost = totalCost;
              }

              return (
                <div key={session.id} className="bg-white rounded-[24px] p-1 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
                  
                  {/* Status Indicator Bar */}
                  <div className="absolute top-0 left-6 right-6 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="p-5 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                              <div className="relative">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${session.deviceStatus === 'mobile' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'} shadow-sm`}>
                                      {session.customerName.charAt(0)}
                                  </div>
                                  {customerInfo?.isVIP && (
                                      <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-white p-1 rounded-full shadow-sm border-2 border-white">
                                          <Crown size={10} fill="currentColor"/>
                                      </div>
                                  )}
                              </div>
                              <div>
                                  <h3 className="font-bold text-gray-900 leading-tight mb-0.5">{session.customerName}</h3>
                                  <div className="flex items-center gap-2">
                                      <DeviceBadge status={session.deviceStatus} />
                                      <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                                          {formatDate(session.startTime)}
                                      </span>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Live Timer Indicator */}
                          <div className="animate-pulse bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> مباشر
                          </div>
                      </div>
                      
                      {/* Financials Pill */}
                      <div className="bg-gray-50 rounded-xl p-1 flex mb-4 border border-gray-100">
                          <div className="flex-1 text-center py-2 border-l border-gray-200">
                              <p className="text-[9px] text-gray-400 font-bold uppercase">الوقت</p>
                              <p className="font-black text-gray-800">{formatCurrency(liveCost)}</p>
                          </div>
                          <div className="flex-1 text-center py-2">
                              <p className="text-[9px] text-gray-400 font-bold uppercase">الطلبات</p>
                              <p className="font-black text-indigo-600">{formatCurrency(ordersTotal)}</p>
                          </div>
                      </div>

                      {/* Orders Preview */}
                      <div className="flex-1 mb-4">
                          {session.orders && session.orders.length > 0 ? (
                              <div className="space-y-2">
                                  {session.orders.slice(0, 2).map(order => (
                                      <div key={order.id} className="flex justify-between items-center text-xs text-gray-600 bg-gray-50/50 p-2 rounded-lg border border-gray-50 group">
                                          <div className="flex items-center gap-2">
                                              <span className="bg-white border border-gray-200 px-1.5 rounded font-bold text-[10px]">{order.quantity}</span>
                                              <span>{order.itemName}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {(order.priceAtOrder * order.quantity) > 0 && (
                                                  <span className="font-bold">{formatCurrency(order.priceAtOrder * order.quantity)}</span>
                                              )}
                                              <button 
                                                  onClick={(e) => { e.stopPropagation(); onDeleteOrder(session, order.id); }}
                                                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                                  title="حذف الطلب"
                                              >
                                                  <Trash2 size={12} />
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                                  {session.orders.length > 2 && (
                                      <p className="text-[10px] text-center text-gray-400 font-bold">+{session.orders.length - 2} طلبات أخرى</p>
                                  )}
                              </div>
                          ) : (
                              <div className="h-full min-h-[60px] flex items-center justify-center text-gray-300 text-xs bg-gray-50/30 rounded-xl border border-dashed border-gray-100">
                                  لا يوجد طلبات
                              </div>
                          )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-auto">
                         <div className="grid grid-cols-2 gap-2 flex-1">
                             <Button onClick={() => onAddDrink(session)} variant="secondary" className="text-xs h-10 border-gray-200 bg-white hover:bg-gray-50 text-gray-700" disabled={!systemState?.activeCycleId}>
                                <Coffee size={14} className="ml-1 text-orange-600" /> مشروب
                             </Button>
                             <Button onClick={() => onAddCard(session)} variant="secondary" className="text-xs h-10 border-gray-200 bg-white hover:bg-gray-50 text-gray-700" disabled={!systemState?.activeCycleId}>
                                <Wifi size={14} className="ml-1 text-blue-600" /> بطاقة نت
                             </Button>
                         </div>
                         <Button onClick={() => onCheckout(session)} className="text-xs h-10 w-24 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100" disabled={!systemState?.activeCycleId}>
                            <LogOut size={14} className="ml-1" /> إغلاق
                         </Button>
                      </div>
                      
                      {/* Secondary Actions (Device/Undo) */}
                      <div className="flex justify-center gap-3 mt-3 pt-3 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button onClick={() => onDeviceChange(session.id, session.deviceStatus === 'mobile' ? 'laptop' : 'mobile')} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                              <Monitor size={12}/> تغيير الجهاز
                          </button>
                          {session.events && session.events.length > 0 && (
                              <button onClick={() => onUndoEvent(session.id)} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
                                  <RotateCcw size={12}/> تراجع
                              </button>
                          )}
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
