import React, { useState, useEffect } from 'react';
import { PricingConfig } from '../types';
import { Save, Info, AlertCircle, DollarSign, Smartphone, Laptop, Zap, PieChart, HardDrive, CheckCircle, Database, Settings as SettingsIcon, TrendingUp, TrendingDown, Activity, Trash2, ShieldAlert, Gauge } from 'lucide-react';
import Button from '../components/ui/Button';
import { getStorageUsageInfo } from '../utils';
import { clearTransactionalData } from '../storage';
import ConfirmModal from '../components/ui/ConfirmModal';

interface SettingsProps {
  pricingConfig: PricingConfig;
  onUpdatePricing: (config: PricingConfig) => void;
}

const InputGroup = ({ 
  label, 
  value, 
  onChange, 
  unit, 
  icon: Icon,
  placeholder, 
  helpText, 
  step = "0.1",
  color = "indigo"
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  unit?: string; 
  icon: any;
  placeholder?: string; 
  helpText?: string;
  step?: string;
  color?: "indigo" | "rose" | "emerald" | "amber" | "purple";
}) => {
    const colorClasses = {
        indigo: "text-indigo-600 focus-within:border-indigo-500 focus-within:ring-indigo-100",
        rose: "text-rose-600 focus-within:border-rose-500 focus-within:ring-rose-100",
        emerald: "text-emerald-600 focus-within:border-emerald-500 focus-within:ring-emerald-100",
        amber: "text-amber-600 focus-within:border-amber-500 focus-within:ring-amber-100",
        purple: "text-purple-600 focus-within:border-purple-500 focus-within:ring-purple-100",
    };

    return (
      <div className="mb-5 group">
        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
        <div className={`relative flex items-center border border-gray-200 rounded-xl bg-white transition-all duration-200 shadow-sm ${colorClasses[color]}`}>
          <div className="pl-3 pr-3 pointer-events-none opacity-70">
             <Icon size={18} />
          </div>
          <div className="w-px h-6 bg-gray-100 mx-1"></div>
          <input
            type="number"
            min="0"
            step={step}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="block w-full p-3 text-sm font-bold text-gray-900 bg-transparent border-none focus:ring-0 placeholder-gray-300"
          />
          {unit && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-xs font-bold bg-gray-50 px-2 py-1 rounded border border-gray-100">{unit}</span>
            </div>
          )}
        </div>
        {helpText && (
          <p className="mt-1.5 text-[11px] text-gray-400 font-medium flex items-start gap-1 leading-tight">
            <Info size={12} className="mt-0.5 shrink-0" /> {helpText}
          </p>
        )}
      </div>
    );
};

const Settings: React.FC<SettingsProps> = ({ 
  pricingConfig,
  onUpdatePricing,
}) => {
  // Pricing State
  const [mobileRate, setMobileRate] = useState(pricingConfig.mobileRate.toString());
  const [laptopRate, setLaptopRate] = useState(pricingConfig.laptopRate.toString());
  const [mobilePlaceCost, setMobilePlaceCost] = useState(pricingConfig.mobilePlaceCost.toString());
  const [laptopPlaceCost, setLaptopPlaceCost] = useState(pricingConfig.laptopPlaceCost.toString());
  const [devPercent, setDevPercent] = useState(pricingConfig.devPercent.toString());
  
  // Electricity State
  const [kwhPrice, setKwhPrice] = useState((pricingConfig.kwhPrice || 0).toString());
  const [lastMeterReading, setLastMeterReading] = useState((pricingConfig.lastMeterReading || 0).toString());
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [storageInfo, setStorageInfo] = useState(getStorageUsageInfo());
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  useEffect(() => {
    setMobileRate(pricingConfig.mobileRate.toString());
    setLaptopRate(pricingConfig.laptopRate.toString());
    setMobilePlaceCost(pricingConfig.mobilePlaceCost.toString());
    setLaptopPlaceCost(pricingConfig.laptopPlaceCost.toString());
    setDevPercent(pricingConfig.devPercent.toString());
    setKwhPrice((pricingConfig.kwhPrice || 0).toString());
    setLastMeterReading((pricingConfig.lastMeterReading || 0).toString());
    
    // Refresh storage info
    const interval = setInterval(() => {
        setStorageInfo(getStorageUsageInfo());
    }, 5000);
    return () => clearInterval(interval);
  }, [pricingConfig]);

  const handleSavePricing = () => {
    const mRate = parseFloat(mobileRate);
    const lRate = parseFloat(laptopRate);
    const mCost = parseFloat(mobilePlaceCost);
    const lCost = parseFloat(laptopPlaceCost);
    const dev = parseFloat(devPercent);
    const kwPrice = parseFloat(kwhPrice);
    const lastReading = parseFloat(lastMeterReading);

    if ([mRate, lRate, mCost, lCost, dev, kwPrice, lastReading].some(v => isNaN(v) || v < 0)) {
      alert('الرجاء إدخال أرقام صحيحة وموجبة في جميع الحقول.');
      return;
    }

    setSaveStatus('saving');
    
    // Simulate network delay for UX
    setTimeout(() => {
        onUpdatePricing({
            mobileRate: mRate,
            laptopRate: lRate,
            mobilePlaceCost: mCost,
            laptopPlaceCost: lCost,
            devPercent: dev,
            kwhPrice: kwPrice,
            lastMeterReading: lastReading
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    }, 600);
  };

  const getStorageStatus = () => {
      if (storageInfo.percent > 85) return { text: 'حرجة', color: 'text-red-600', bg: 'bg-red-500', barColor: 'bg-red-500' };
      if (storageInfo.percent > 60) return { text: 'متوسطة', color: 'text-orange-600', bg: 'bg-orange-500', barColor: 'bg-orange-500' };
      return { text: 'مستقرة', color: 'text-emerald-600', bg: 'bg-emerald-500', barColor: 'bg-emerald-500' };
  };

  const storageStatus = getStorageStatus();

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
         <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
               <SettingsIcon size={24} />
             </div>
             <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">إعدادات النظام</h2>
                <p className="text-gray-500 text-sm font-medium">التحكم في الأسعار، التكاليف، وإدارة البيانات.</p>
             </div>
         </div>
         
         <Button 
            onClick={handleSavePricing} 
            className={`min-w-[160px] h-12 text-sm shadow-lg transition-all duration-300 ${saveStatus === 'saved' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
            disabled={saveStatus === 'saving'}
         >
             {saveStatus === 'saving' ? (
                 <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> جارِ الحفظ...</div>
             ) : saveStatus === 'saved' ? (
                 <div className="flex items-center gap-2"><CheckCircle size={18}/> تم الحفظ</div>
             ) : (
                 <div className="flex items-center gap-2"><Save size={18}/> حفظ التغييرات</div>
             )}
         </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Financial Settings */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* 1. Revenue Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative group hover:shadow-md transition-shadow duration-300">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500"></div>
                  <div className="p-6 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><TrendingUp size={20}/></div>
                          سياسة التسعير (الإيرادات)
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 mr-11">المبالغ التي يدفعها الزبون مقابل الساعة.</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputGroup 
                          label="سعر ساعة الجوال" 
                          icon={Smartphone} 
                          value={mobileRate} 
                          onChange={setMobileRate} 
                          unit="₪ / ساعة" 
                          placeholder="مثال: 10" 
                          helpText="السعر الأساسي للعمل بدون لابتوب."
                          color="indigo"
                      />
                      <InputGroup 
                          label="سعر ساعة اللابتوب" 
                          icon={Laptop} 
                          value={laptopRate} 
                          onChange={setLaptopRate} 
                          unit="₪ / ساعة" 
                          placeholder="مثال: 15" 
                          helpText="يشمل استخدام الكهرباء والمقاعد المخصصة."
                          color="indigo"
                      />
                  </div>
              </div>

              {/* 2. Electricity Tracking */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative group hover:shadow-md transition-shadow duration-300">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500"></div>
                  <div className="p-6 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Zap size={20}/></div>
                          نظام تتبع الكهرباء
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 mr-11">ضبط تكلفة الكيلو واط وقراءة البداية لعداد الكهرباء.</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputGroup 
                          label="سعر الكيلو واط" 
                          icon={DollarSign} 
                          value={kwhPrice} 
                          onChange={setKwhPrice} 
                          unit="₪" 
                          placeholder="مثال: 0.7" 
                          helpText="السعر المعتمد لحساب التكلفة عند الجرد."
                          color="amber"
                      />
                      <InputGroup 
                          label="آخر قراءة عداد (بداية)" 
                          icon={Gauge} 
                          value={lastMeterReading} 
                          onChange={setLastMeterReading} 
                          unit="kWh" 
                          placeholder="مثال: 12450" 
                          helpText="نقطة البداية لأول عملية جرد قادمة."
                          color="amber"
                      />
                  </div>
              </div>

              {/* 3. Costs Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative group hover:shadow-md transition-shadow duration-300">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500"></div>
                  <div className="p-6 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown size={20}/></div>
                          التكلفة التشغيلية التقديرية
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 mr-11">مبالغ تقتطع تقديرياً مقابل كل ساعة (صيانة، ضيافة خفية).</p>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InputGroup 
                          label="تكلفة ساعة الجوال" 
                          icon={Activity} 
                          value={mobilePlaceCost} 
                          onChange={setMobilePlaceCost} 
                          unit="₪ / ساعة" 
                          placeholder="مثال: 0.5" 
                          color="rose"
                      />
                      <InputGroup 
                          label="تكلفة ساعة اللابتوب" 
                          icon={Activity} 
                          value={laptopPlaceCost} 
                          onChange={setLaptopPlaceCost} 
                          unit="₪ / ساعة" 
                          placeholder="مثال: 1.2" 
                          color="rose"
                      />
                  </div>
              </div>

              {/* 4. Distribution Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative group hover:shadow-md transition-shadow duration-300">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-purple-500"></div>
                  <div className="p-6 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><PieChart size={20}/></div>
                          توزيع الأرباح
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 mr-11">النسب المقتطعة قبل توزيع الحصص على الشركاء.</p>
                  </div>
                  <div className="p-6">
                      <div className="max-w-md">
                        <InputGroup 
                            label="نسبة الصندوق التطويري" 
                            icon={DollarSign} 
                            value={devPercent} 
                            onChange={setDevPercent} 
                            unit="%" 
                            step="1"
                            placeholder="مثال: 15" 
                            helpText="يتم خصم هذه النسبة من صافي الربح لتطوير المكان وصيانته."
                            color="purple"
                        />
                      </div>
                      
                      <div className="mt-4 bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-start gap-3">
                          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                              <h4 className="text-sm font-bold text-amber-800 mb-1">تنبيه هام</h4>
                              <p className="text-xs text-amber-700 leading-relaxed">
                                  أي تغيير في الأسعار أو التكاليف سيتم تطبيقه على <strong>الجلسات الجديدة فقط</strong>. الجلسات المفتوحة حالياً والسجلات المؤرشفة ستحتفظ بالأسعار القديمة لضمان دقة الحسابات.
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* RIGHT COLUMN: Storage & Maintenance */}
          <div className="space-y-6">
              
              {/* Elegant Storage Health Widget */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${storageStatus.bg} ${storageStatus.color} bg-opacity-20`}>
                              <Database size={20} />
                          </div>
                          <div>
                              <h3 className="font-bold text-gray-800 text-sm">مساحة التخزين</h3>
                              <p className="text-[10px] text-gray-400">Local Storage</p>
                          </div>
                      </div>
                      <span className={`text-xl font-black ${storageStatus.color}`}>{storageInfo.percent}%</span>
                  </div>
                  
                  {/* Linear Progress Bar */}
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-3 shadow-inner">
                      <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${storageStatus.barColor}`} 
                          style={{ width: `${storageInfo.percent}%` }}
                      ></div>
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 mb-4">
                      <span>{storageInfo.usedKB} KB مستخدم</span>
                      <span>5120 KB متاح</span>
                  </div>

                  {storageInfo.percent > 70 && (
                      <div className="bg-red-50 text-red-700 px-3 py-3 rounded-xl text-xs font-bold flex items-start gap-2 border border-red-100">
                          <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                          <p className="leading-tight">الذاكرة ممتلئة تقريباً. يرجى عمل نسخة احتياطية وحذف البيانات القديمة.</p>
                      </div>
                  )}
                  
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                      يتم تخزين البيانات محلياً على هذا الجهاز.
                  </p>
              </div>

              {/* Maintenance & Cleanup Card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 border border-orange-100">
                          <ShieldAlert size={20}/>
                      </div>
                      <div>
                          <h4 className="font-bold text-gray-800 text-sm">صيانة النظام</h4>
                          <p className="text-xs text-gray-500">إدارة وتنظيف البيانات</p>
                      </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowCleanupConfirm(true)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors group"
                  >
                      <div className="flex items-center gap-2">
                          <Trash2 size={16} className="text-red-600"/>
                          <div className="text-right">
                              <p className="text-xs font-bold text-red-800">تنظيف السجلات النشطة</p>
                              <p className="text-[9px] text-red-600 opacity-80">حذف الجلسات والفواتير الحالية فقط</p>
                          </div>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-red-500 group-hover:scale-125 transition-transform"></div>
                      </div>
                  </button>
                  <p className="text-[10px] text-gray-400 mt-3 text-center leading-relaxed px-2">
                      سيتم الاحتفاظ بـ: الأرشيف، المستخدمين، المنتجات، الإعدادات، وأسماء الزبائن.
                  </p>
              </div>

              {/* App Info Widget */}
              <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
                  <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                              <Activity size={20} className="text-white"/>
                          </div>
                          <div>
                              <h4 className="font-bold text-lg leading-tight">Co'Ma Manager</h4>
                              <p className="text-indigo-200 text-xs">نظام إدارة مساحات العمل</p>
                          </div>
                      </div>
                      
                      <div className="space-y-2 text-[11px] text-indigo-100 border-t border-indigo-700 pt-3">
                          <div className="flex justify-between"><span>الإصدار</span><span className="font-mono">v2.1.0 (Stable)</span></div>
                          <div className="flex justify-between"><span>آخر تحديث</span><span className="font-mono">October 2023</span></div>
                          <div className="flex justify-between"><span>الحالة</span><span className="text-emerald-300 font-bold">● متصل</span></div>
                      </div>
                  </div>
              </div>

          </div>
      </div>

      <ConfirmModal 
        isOpen={showCleanupConfirm}
        onClose={() => setShowCleanupConfirm(false)}
        onConfirm={clearTransactionalData}
        title="تأكيد تنظيف النظام"
        message="هل أنت متأكد من رغبتك في حذف السجلات التشغيلية الحالية (الفواتير، الجلسات، دفتر الأستاذ النشط)؟ لن يتم حذف الأرشيف السابق ولا الإعدادات."
        confirmText="نعم، نظف السجلات"
      />
    </div>
  );
};

export default Settings;