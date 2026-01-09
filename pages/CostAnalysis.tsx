import React, { useState, useMemo } from 'react';
import { DayCycle, SystemState, LedgerEntry, Record } from '../types';
import { formatCurrency, getLocalDate } from '../utils';
import { Calendar, Package, TrendingUp, TrendingDown, BarChart, ShoppingBag, PieChart as PieChartIcon, Clock, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import { getCostAnalysisView } from '../accounting_core';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart as ReBarChart, Bar, Legend
} from 'recharts';

interface CostAnalysisProps {
  dayCycles: DayCycle[];
  systemState?: SystemState;
  onInventory?: () => void;
  ledger?: LedgerEntry[];
  records?: Record[];
}

const CostAnalysis: React.FC<CostAnalysisProps> = ({ onInventory, ledger = [], records = [] }) => {
  const [monthFilter, setMonthFilter] = useState(getLocalDate().slice(0, 7));

  // 1. Daily Data for Performance Area Chart
  const dailyData = useMemo(() => getCostAnalysisView(ledger, records, monthFilter), [ledger, records, monthFilter]);

  // 2. Summary Totals
  const monthTotals = useMemo(() => {
      return dailyData.reduce((acc, day) => ({
          revenue: acc.revenue + day.totalRevenue,
          expenses: acc.expenses + day.totalExpenses,
          cogs: acc.cogs + (day.totalCOGS || 0),
          loans: acc.loans + (day.totalLoanRepayments || 0),
          savings: acc.savings + (day.totalSavings || 0),
          profit: acc.profit + day.netProfit
      }), { revenue: 0, expenses: 0, cogs: 0, loans: 0, savings: 0, profit: 0 });
  }, [dailyData]);

  // 3. Revenue Mix Data for Pie Chart
  const revenueMix = useMemo(() => {
      const monthRecords = records.filter(r => r.endTime.startsWith(monthFilter));
      const sessions = monthRecords.reduce((s, r) => s + (r.sessionInvoice || 0), 0);
      const drinks = monthRecords.reduce((s, r) => s + (r.drinksInvoice || 0), 0);
      const cards = monthRecords.reduce((s, r) => s + (r.internetCardsInvoice || 0), 0);

      return [
          { name: 'الجلسات', value: sessions, color: '#6366f1' },
          { name: 'المشروبات', value: drinks, color: '#f59e0b' },
          { name: 'البطاقات', value: cards, color: '#3b82f6' }
      ].filter(item => item.value > 0);
  }, [records, monthFilter]);

  // 4. Peak Hours Data for Bar Chart
  const peakHours = useMemo(() => {
      const hoursCount = new Array(24).fill(0);
      const monthRecords = records.filter(r => r.startTime.startsWith(monthFilter));
      
      monthRecords.forEach(r => {
          const hour = new Date(r.startTime).getHours();
          hoursCount[hour]++;
      });

      return hoursCount.map((count, hour) => ({
          hour: `${hour}:00`,
          count
      })).filter(h => h.count > 0 || (parseInt(h.hour) > 8 && parseInt(h.hour) < 23));
  }, [records, monthFilter]);

  const inputClassName = "block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:outline-none transition-colors shadow-sm font-bold";

  // Chart Components Custom Styles
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md p-4 border border-gray-100 rounded-2xl shadow-xl">
          <p className="text-xs font-black text-gray-400 mb-2 border-b pb-1">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center justify-between gap-8 mb-1">
              <span className="text-xs font-bold" style={{ color: p.color }}>{p.name}:</span>
              <span className="text-sm font-black text-gray-800">{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 text-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <BarChart className="text-indigo-600" />
            التحليل والرسوم البيانية
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">
             تحليل مرئي شامل للدخل، المصاريف، وسلوك الزبائن خلال الشهر.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-500 px-2">عرض شهر:</span>
                <input 
                  type="month" 
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className={inputClassName}
                />
            </div>
            {onInventory && (
                 <Button onClick={() => onInventory()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                     <Package size={16} className="ml-2" /> الجرد والأرشفة
                 </Button>
             )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">إجمالي الإيراد</p>
                      <h3 className="text-2xl font-black text-emerald-700 tracking-tight">{formatCurrency(monthTotals.revenue)}</h3>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform"><TrendingUp size={20}/></div>
              </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500"></div>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">إجمالي المصاريف</p>
                      <h3 className="text-2xl font-black text-rose-700 tracking-tight">{formatCurrency(monthTotals.expenses)}</h3>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-xl text-rose-600 group-hover:scale-110 transition-transform"><TrendingDown size={20}/></div>
              </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500"></div>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">التكلفة والالتزامات</p>
                      <h3 className="text-2xl font-black text-amber-700 tracking-tight">{formatCurrency(monthTotals.cogs + monthTotals.loans + monthTotals.savings)}</h3>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-600 group-hover:scale-110 transition-transform"><ShoppingBag size={20}/></div>
              </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 rounded-3xl shadow-lg shadow-indigo-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-white/20"></div>
              <div className="flex justify-between items-start relative z-10">
                  <div>
                      <p className="text-indigo-100 text-[10px] font-black uppercase mb-1 tracking-widest">صافي الربح القابل للتوزيع</p>
                      <h3 className="text-2xl font-black text-white tracking-tight">{formatCurrency(monthTotals.profit)}</h3>
                  </div>
                  <div className="p-2 bg-white/20 rounded-xl text-white group-hover:scale-110 transition-transform backdrop-blur-sm"><Zap size={20} fill="currentColor"/></div>
              </div>
          </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Performance Chart - 2/3 Width */}
          <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                  <h4 className="font-black text-gray-800 flex items-center gap-2">
                      <TrendingUp className="text-emerald-500" size={18}/>
                      منحنى الأداء اليومي
                  </h4>
                  <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> إيراد</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400"></span> مصاريف</div>
                  </div>
              </div>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                            tickFormatter={(val) => val.split('-')[2]} // Show only day
                          />
                          <YAxis hide />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            name="إجمالي الإيراد"
                            type="monotone" 
                            dataKey="totalRevenue" 
                            stroke="#6366f1" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorRev)" 
                          />
                          <Area 
                            name="المصاريف الكلية"
                            type="monotone" 
                            dataKey="totalExpenses" 
                            stroke="#fb7185" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fill="none" 
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Revenue Distribution - 1/3 Width */}
          <div className="bg-white p-6 rounded-[32px] border border-gray-200 shadow-sm flex flex-col">
              <h4 className="font-black text-gray-800 mb-8 flex items-center gap-2">
                  <PieChartIcon className="text-orange-500" size={18}/>
                  توزيع مصادر الدخل
              </h4>
              <div className="flex-1 min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={revenueMix}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={8}
                              dataKey="value"
                              animationBegin={200}
                          >
                              {revenueMix.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                              ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                          />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-4">
                  {revenueMix.map(item => (
                      <div key={item.name} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-xs font-bold text-gray-600">{item.name}</span>
                          </div>
                          <span className="text-xs font-black text-gray-900">{formatCurrency(item.value)}</span>
                      </div>
                  ))}
              </div>
          </div>

          {/* Peak Hours - Full Width or Grid */}
          <div className="lg:col-span-3 bg-white p-6 rounded-[32px] border border-gray-200 shadow-sm">
              <h4 className="font-black text-gray-800 mb-8 flex items-center gap-2">
                  <Clock className="text-blue-500" size={18}/>
                  أوقات الذروة (أوقات دخول الزبائن)
              </h4>
              <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={peakHours}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="hour" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                          />
                          <YAxis hide />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                            formatter={(value: number) => [`${value} زبائن`, 'العدد']}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="#818cf8" 
                            radius={[6, 6, 0, 0]} 
                            barSize={30}
                          />
                      </ReBarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>

      {/* Calendar Table */}
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center gap-2">
            <Calendar className="text-gray-400" size={20}/>
            <h3 className="font-black text-gray-800">التفاصيل اليومية المجدولة</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-right">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">اليوم</th>
                <th className="px-6 py-4 text-xs font-black text-emerald-700 uppercase tracking-widest">الإيراد</th>
                <th className="px-6 py-4 text-xs font-black text-rose-700 uppercase tracking-widest">مصاريف</th>
                <th className="px-6 py-4 text-xs font-black text-orange-700 uppercase tracking-widest">تكلفة بضاعة</th>
                <th className="px-6 py-4 text-xs font-black text-blue-700 uppercase tracking-widest">التزامات</th>
                <th className="px-6 py-4 text-xs font-black text-purple-700 uppercase tracking-widest">ادخار</th>
                <th className="px-6 py-4 text-xs font-black text-indigo-700 uppercase bg-indigo-50/50 tracking-widest">الصافي</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 text-sm">
              {dailyData.map((day) => (
                <tr key={day.date} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4 font-black text-gray-900 whitespace-nowrap">
                      {new Date(day.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                      <span className="text-[10px] text-gray-300 mr-2 font-bold inline-block">{new Date(day.date).toLocaleDateString('ar-SA', { weekday: 'short' })}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-700">{formatCurrency(day.totalRevenue)}</td>
                  <td className="px-6 py-4 font-bold text-rose-700">{formatCurrency(day.totalExpenses)}</td>
                  <td className="px-6 py-4 font-bold text-orange-700">{formatCurrency(day.totalCOGS || 0)}</td>
                  
                  <td className="px-6 py-4 font-bold text-blue-700">{formatCurrency(day.totalLoanRepayments || 0)}</td>
                  <td className="px-6 py-4 font-bold text-purple-700">{formatCurrency(day.totalSavings || 0)}</td>
                  
                  <td className={`px-6 py-4 font-black bg-indigo-50/20 group-hover:bg-indigo-50/40 transition-colors ${day.netProfit >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>{formatCurrency(day.netProfit)}</td>
                </tr>
              ))}
              {dailyData.length === 0 && (
                  <tr>
                      <td colSpan={7} className="text-center py-20 text-gray-400">
                          <div className="flex flex-col items-center justify-center opacity-30">
                              <Calendar size={64} className="mb-4"/>
                              <p className="font-bold">لا يوجد بيانات مالية مسجلة لهذا الشهر</p>
                          </div>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostAnalysis;