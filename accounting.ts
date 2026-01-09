
import { Record, Session, PricingConfig, Order, Expense, Purchase, DebtItem, BankAccount, DayCycle, Customer, Discount, PlaceLoan, InventorySnapshot, PartnerLedgerItem, CashTransfer } from './types';
import { calculateTimeCost, calculateOrdersTotal, calculateOrdersCost, getDaysInMonth, calculateSessionSegments, generateId, formatCurrency } from './utils';
import { GLOBAL_PARTNERS } from './accounting_core';

// --- CORE CALCULATIONS ---

export const calcRecordFinancials = (
    session: Session | Record, 
    endTimeIso: string, 
    config: PricingConfig,
    orders?: Order[],
    discount?: Discount
): Partial<Record> => {
    
    const { segments, totalCost, placeCost } = calculateSessionSegments(
        session.startTime,
        endTimeIso,
        session.events && session.events.length > 0 ? session.events[0].fromDevice : session.deviceStatus,
        session.events || [],
        config
    );

    const currentOrders = orders !== undefined ? orders : session.orders;
    const drinkOrders = currentOrders.filter(o => o.type === 'drink' || !o.type); 
    const cardOrders = currentOrders.filter(o => o.type === 'internet_card');

    const drinksInv = calculateOrdersTotal(drinkOrders);
    const cardsInv = calculateOrdersTotal(cardOrders);
    const drinksCost = calculateOrdersCost(drinkOrders);
    const cardsCost = calculateOrdersCost(cardOrders);

    let rawTotal = totalCost + drinksInv + cardsInv;
    let discountAmount = 0;
    if (discount) {
        discountAmount = discount.type === 'fixed' ? discount.value : (rawTotal * (discount.value / 100));
    }
    discountAmount = Math.min(discountAmount, rawTotal);
    
    const totalInvoice = Math.round(rawTotal - discountAmount);
    const totalDirectCost = placeCost + drinksCost + cardsCost;
    const grossProfit = totalInvoice - totalDirectCost;
    const devCut = grossProfit > 0 ? grossProfit * (config.devPercent / 100) : 0;

    return {
        durationMinutes: Math.floor(segments.reduce((acc, s) => acc + s.durationMinutes, 0)),
        sessionInvoice: totalCost,
        drinksInvoice: drinksInv,
        internetCardsInvoice: cardsInv,
        totalInvoice,
        totalDue: totalInvoice,
        discountApplied: discount ? { ...discount, amount: discountAmount, locked: true } : undefined,
        placeCost, drinksCost, internetCardsCost: cardsCost,
        grossProfit, devPercentSnapshot: config.devPercent, devCut, netProfit: grossProfit - devCut,
        hourlyRateSnapshot: session.deviceStatus === 'mobile' ? config.mobileRate : config.laptopRate,
        placeCostRateSnapshot: session.deviceStatus === 'mobile' ? config.mobilePlaceCost : config.laptopPlaceCost,
        segmentsSnapshot: segments
    };
};

export const calculateCustomerTransaction = (totalDue: number, paidAmount: number, customer: Customer) => {
    const startCredit = customer.creditBalance || 0;
    const appliedCredit = Math.min(startCredit, totalDue);
    const dueAfterCredit = totalDue - appliedCredit;
    const delta = paidAmount - dueAfterCredit;

    let createdDebt = 0, createdCredit = 0;
    if (delta > 0) createdCredit = delta;
    else if (delta < 0) createdDebt = Math.abs(delta);

    const preSettleDebt = (customer.debtBalance || 0) + createdDebt;
    const preSettleCredit = (startCredit - appliedCredit) + createdCredit;
    const settled = Math.min(preSettleDebt, preSettleCredit);

    return {
        totalDue, paidAmount, appliedCredit, createdDebt, createdCredit, 
        settledDebt: settled, 
        finalCredit: preSettleCredit - settled, 
        finalDebt: preSettleDebt - settled, 
        isFullyPaid: (preSettleDebt - settled) === 0
    };
};

export const generatePartnerLedger = (partnerId: string, snapshots: InventorySnapshot[], purchases: Purchase[], debtItems: DebtItem[], placeLoans: PlaceLoan[]): PartnerLedgerItem[] => {
    const items: PartnerLedgerItem[] = [];
    const pName = GLOBAL_PARTNERS.find(x => x.id === partnerId)?.name;

    snapshots.forEach(snap => {
        const p = snap.partners.find(part => part.name === pName);
        if (p) {
            if (p.cashShareAvailable > 0) items.push({ id: generateId(), date: snap.periodEnd, type: 'profit_share', channel: 'cash', amount: p.cashShareAvailable, description: `حصة أرباح كاش - ${snap.archiveId}`, refId: snap.id });
            if (p.bankShareAvailable > 0) items.push({ id: generateId(), date: snap.periodEnd, type: 'profit_share', channel: 'bank', amount: p.bankShareAvailable, description: `حصة أرباح بنك - ${snap.archiveId}`, refId: snap.id });
        }
    });

    purchases.filter(pur => pur.fundingSource === 'partner' && pur.buyer === partnerId).forEach(pur => {
        items.push({ id: pur.id, date: pur.date, type: 'purchase_reimbursement', channel: pur.paymentMethod || 'cash', amount: pur.amount, description: `شراء للمكان: ${pur.name}`, refId: pur.id });
    });

    debtItems.filter(d => d.partnerId === partnerId && (d.debtSource === 'place' || !d.debtSource)).forEach(d => {
        items.push({ id: d.id, date: d.date, type: 'withdrawal', channel: d.debtChannel || 'cash', amount: -Math.abs(d.amount), description: `سحب: ${d.note || ''}`, refId: d.id });
    });

    return items.sort((a, b) => b.date.localeCompare(a.date));
};
