
import { Order, PricingConfig, SessionEvent, SessionSegment, DeviceStatus, LoanInstallment, Drink, InventoryItem } from './types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// --- SECURITY UTILS ---
export async function hashPassword(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- DATE UTILS ---
export const getMonthKey = (dateIso: string): string => {
    return dateIso.slice(0, 7); // YYYY-MM
};

export const formatCurrency = (amount: number): string => {
  const val = amount || 0;
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₪'; 
};

export const formatPercent = (amount: number): string => {
  const val = amount || 0;
  return val + '%';
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ar-SA', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
};

export const formatFullDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ar-SA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
};

// --- DRINK COST CALCULATION ---
export const calculateDrinkCost = (drink: Drink, inventoryItems: InventoryItem[]): number => {
    if (!drink.components || drink.components.length === 0) return 0;
    
    return drink.components.reduce((total, component) => {
        const invItem = inventoryItems.find(item => item.id === component.itemId);
        const itemPrice = invItem?.costPrice || 0;
        return total + (component.qty * itemPrice);
    }, 0);
};

// --- LOAN SCHEDULER ---
export const generateLoanInstallments = (
    loanId: string,
    principal: number,
    startDate: string,
    scheduleType: 'daily' | 'weekly' | 'monthly',
    count: number
): LoanInstallment[] => {
    const installments: LoanInstallment[] = [];
    const amountPerInstallment = Math.ceil(principal / count); 
    
    let runningTotal = 0;

    for (let i = 0; i < count; i++) {
        const date = new Date(startDate);
        if (scheduleType === 'daily') date.setDate(date.getDate() + i);
        if (scheduleType === 'weekly') date.setDate(date.getDate() + (i * 7));
        if (scheduleType === 'monthly') date.setMonth(date.getMonth() + i);

        let amount = amountPerInstallment;
        if (i === count - 1) {
            amount = principal - runningTotal; 
        }
        runningTotal += amount;

        installments.push({
            id: generateId(),
            loanId,
            dueDate: date.toISOString().split('T')[0],
            amount,
            status: 'due'
        });
    }
    return installments;
};

// --- CORE SEGMENT CALCULATION ---
export const calculateSessionSegments = (
    startTime: string,
    endTime: string,
    initialDevice: DeviceStatus,
    events: SessionEvent[] = [],
    config: PricingConfig
): { segments: SessionSegment[], totalCost: number, placeCost: number } => {
    
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const segments: SessionSegment[] = [];
    let currentMs = startMs;
    let currentDevice = initialDevice;
    
    for (const event of sortedEvents) {
        const eventMs = new Date(event.timestamp).getTime();
        if (eventMs <= currentMs) {
            currentDevice = event.toDevice; 
            continue;
        }
        if (eventMs > endMs) break;

        const durationMinutes = (eventMs - currentMs) / 60000;
        const durationHours = durationMinutes / 60;
        const rate = currentDevice === 'mobile' ? config.mobileRate : config.laptopRate;
        const cost = durationHours * rate;
        
        segments.push({
            start: new Date(currentMs).toISOString(),
            end: event.timestamp,
            device: currentDevice,
            durationMinutes,
            ratePerHour: rate,
            cost: cost,
            isCurrent: false
        });

        currentMs = eventMs;
        currentDevice = event.toDevice;
    }

    if (currentMs < endMs) {
        const durationMinutes = (endMs - currentMs) / 60000;
        const durationHours = durationMinutes / 60;
        const rate = currentDevice === 'mobile' ? config.mobileRate : config.laptopRate;
        const cost = durationHours * rate;

        segments.push({
            start: new Date(currentMs).toISOString(),
            end: endTime,
            device: currentDevice,
            durationMinutes,
            ratePerHour: rate,
            cost: cost,
            isCurrent: true
        });
    }

    const totalCost = segments.reduce((acc, seg) => acc + seg.cost, 0);
    const totalPlaceCost = segments.reduce((acc, seg) => {
        const costRate = seg.device === 'mobile' ? config.mobilePlaceCost : config.laptopPlaceCost;
        return acc + ((seg.durationMinutes / 60) * costRate);
    }, 0);

    return { segments, totalCost, placeCost: totalPlaceCost };
};

export const calculateTimeCost = (startTime: string, endTime: string, ratePerHour: number): { amount: number; minutes: number } => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (end < start) return { amount: 0, minutes: 0 };
  const diffMs = end - start;
  const minutes = Math.floor(diffMs / 60000);
  const amount = (minutes / 60) * ratePerHour;
  return { amount, minutes };
};

export const calculateOrdersTotal = (orders: Order[] = []): number => {
  return orders.reduce((total, order) => total + (order.priceAtOrder * order.quantity), 0);
};

export const calculateOrdersCost = (orders: Order[] = []): number => {
  return orders.reduce((total, order) => total + ((order.costAtOrder || 0) * order.quantity), 0);
};

export const getCurrentDateTimeLocal = (): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

export const getCurrentTimeOnly = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getLocalDate = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - offset);
  return local.toISOString().slice(0, 10);
};

export const mergeDateAndTime = (baseDateIso: string, timeString: string): string => {
  const date = new Date(baseDateIso);
  const [hours, minutes] = timeString.split(':').map(Number);
  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date.toISOString();
};

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0) return `${h} ساعة و ${m} دقيقة`;
  return `${m} دقيقة`;
};

export const getDaysInMonth = (dateIso: string): number => {
  const date = new Date(dateIso);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const getDayOfMonth = (dateIso: string): number => {
  return new Date(dateIso).getDate();
};

export const getMonthStartIso = (dateIso: string): string => {
  const date = new Date(dateIso);
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
};

export const getArabicMonthName = (monthKey: string): string => {
    const date = new Date(monthKey + '-01');
    return new Intl.DateTimeFormat('ar-SA', { month: 'long', year: 'numeric' }).format(date);
};

export const getAllDaysOfMonth = (monthKey: string): string[] => {
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const day = i < 10 ? `0${i}` : i;
        days.push(`${monthKey}-${day}`);
    }
    return days;
};

// --- STORAGE UTILS ---
export const getStorageUsageInfo = () => {
    let total = 0;
    for(const x in localStorage) {
        if(localStorage.hasOwnProperty(x)) {
            total += ((localStorage[x].length * 2));
        }
    }
    // 5MB is typical browser limit (approx 5242880 bytes)
    const limit = 5 * 1024 * 1024;
    const usedKB = (total / 1024).toFixed(2);
    const percent = Math.min(100, (total / limit) * 100).toFixed(1);
    
    return {
        usedKB: parseFloat(usedKB),
        percent: parseFloat(percent),
        details: `${usedKB} KB / 5120 KB`
    };
};
