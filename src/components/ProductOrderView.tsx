import React, { useState, useMemo } from 'react';
import { ProductOrderRow } from '../types/fms';
import { productOrderColumns } from '../data/sampleOrders';
import {
  Sparkles,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Filter,
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Upload,
  Calendar,
  Clock,
  Zap,
  Info
} from 'lucide-react';

interface ProductOrderViewProps {
  orders: ProductOrderRow[];
  searchTerm?: string;
  setSearchTerm?: (val: string) => void;
  isFullWidth: boolean;
  onGenerateOrderNo: (orderId: string, customNo?: string) => void;
  onGenerateAllPending?: () => void;
  onDeleteRow?: (orderId: string) => void;
  onClearAllRows?: () => void;
  onOpenImportModal?: () => void;
  onUpdateRow?: (orderId: string, field: keyof ProductOrderRow, value: any) => void;
  onNavigateToAutomation: () => void;
  onAddNewRow: (row: ProductOrderRow) => void;
}

// Robust helper to parse order date and timestamp into year, month, day
export function parseOrderDateInfo(dateStr?: string, timestampStr?: string): { year?: number; month?: number; day?: number } {
  const str = (dateStr || timestampStr || '').trim();
  if (!str) return {};

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10),
      day: parseInt(isoMatch[3], 10)
    };
  }

  // 2. DMY format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    let yr = parseInt(dmyMatch[3], 10);
    if (yr < 100) yr += 2000;
    return {
      day: parseInt(dmyMatch[1], 10),
      month: parseInt(dmyMatch[2], 10),
      year: yr
    };
  }

  // 3. Match any date pattern inside timestamps (e.g. 29/1/2026, 1:27:48 pm)
  const anyMatch = str.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (anyMatch) {
    let yr = parseInt(anyMatch[3], 10);
    if (yr < 100) yr += 2000;
    return {
      day: parseInt(anyMatch[1], 10),
      month: parseInt(anyMatch[2], 10),
      year: yr
    };
  }

  return {};
}

export const ProductOrderView: React.FC<ProductOrderViewProps> = ({
  orders,
  searchTerm,
  setSearchTerm,
  isFullWidth,
  onGenerateOrderNo,
  onGenerateAllPending,
  onDeleteRow,
  onClearAllRows,
  onOpenImportModal,
  onNavigateToAutomation,
  onAddNewRow
}) => {
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [filterTodayYesterdayOnly, setFilterTodayYesterdayOnly] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [inputOrderNos, setInputOrderNos] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [navNotification, setNavNotification] = useState<string | null>(null);

  // Fast Virtual Pagination (Default 30 rows in view for zero-lag rendering)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // The Google Sheet Query Formula connecting Orders!A:R to Product Order
  const queryFormula = `=QUERY(IMPORTRANGE("1TksqSeCWat_0CRRPTxA0nAMiQFtUO17xUhtqHJM2JAs", "Orders!A:R"), "select Col1, Col2,Col8,Col9, Col10, Col11, Col12, Col13, Col14, Col15, Col16, Col17, Col18, Col3, Col4, Col5, Col6, Col7 ", 1)`;

  // Dynamically extract available years from actual orders data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    orders.forEach(row => {
      const info = parseOrderDateInfo(row.orderDate, row.timestamp);
      if (info.year && info.year >= 2020 && info.year <= 2035) {
        yearsSet.add(String(info.year));
      }
    });
    if (yearsSet.size === 0) {
      yearsSet.add(String(new Date().getFullYear()));
    }
    return Array.from(yearsSet).sort().reverse();
  }, [orders]);

  // Filtered rows based on: Search, Pending O.N, Year, Month, Today/Yesterday
  const filteredRows = useMemo(() => {
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth() + 1;
    const todayD = now.getDate();

    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestY = yest.getFullYear();
    const yestM = yest.getMonth() + 1;
    const yestD = yest.getDate();

    return orders.filter(row => {
      // 1. Pending O.N filter
      if (filterPendingOnly && row.orderNo && row.orderNo.trim() !== '') {
        return false;
      }

      const dateInfo = parseOrderDateInfo(row.orderDate, row.timestamp);

      // 2. Today / Yesterday filter
      if (filterTodayYesterdayOnly) {
        const isToday = dateInfo.year === todayY && dateInfo.month === todayM && dateInfo.day === todayD;
        const isYest = dateInfo.year === yestY && dateInfo.month === yestM && dateInfo.day === yestD;
        if (!isToday && !isYest) return false;
      }

      // 3. Year filter
      if (selectedYear !== 'ALL') {
        if (!dateInfo.year || String(dateInfo.year) !== selectedYear) {
          return false;
        }
      }

      // 4. Month filter
      if (selectedMonth !== 'ALL') {
        if (!dateInfo.month || String(dateInfo.month) !== selectedMonth) {
          return false;
        }
      }

      // 5. Search query
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchRef = (row.referenceNo || '').toLowerCase().includes(q);
        const matchCust = (row.customerName || '').toLowerCase().includes(q);
        const matchItem = (row.itemName || '').toLowerCase().includes(q);
        const matchOrderNo = (row.orderNo || '').toLowerCase().includes(q);
        const matchSales = (row.salesPerson || '').toLowerCase().includes(q);
        const matchContact = (row.salesPersonContact || '').toLowerCase().includes(q);
        const matchPhone = (row.customerNumber || '').toLowerCase().includes(q);
        const matchRemark = (row.remark || '').toLowerCase().includes(q);
        if (!matchRef && !matchCust && !matchItem && !matchOrderNo && !matchSales && !matchContact && !matchPhone && !matchRemark) {
          return false;
        }
      }
      return true;
    });
  }, [orders, filterPendingOnly, filterTodayYesterdayOnly, selectedYear, selectedMonth, searchTerm]);

  // Safe pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / (pageSize || 30)));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return filteredRows; // All
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safeCurrentPage, pageSize]);

  const pendingCount = useMemo(() => {
    return orders.filter(r => !r.orderNo || r.orderNo.trim() === '').length;
  }, [orders]);

  const activeAssignedCount = orders.length - pendingCount;

  // Jump cursor / page directly to Today / Yesterday's incoming new order
  const handleJumpToNewOrders = () => {
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth() + 1;
    const todayD = now.getDate();

    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestY = yest.getFullYear();
    const yestM = yest.getMonth() + 1;
    const yestD = yest.getDate();

    // Check if any order matches Today or Yesterday
    let targetIndex = -1;
    let targetOrder: ProductOrderRow | null = null;
    let matchType = 'Today';

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const d = parseOrderDateInfo(o.orderDate, o.timestamp);
      if (d.year === todayY && d.month === todayM && d.day === todayD) {
        targetIndex = i;
        targetOrder = o;
        matchType = 'Today';
        break;
      } else if (d.year === yestY && d.month === yestM && d.day === yestD) {
        targetIndex = i;
        targetOrder = o;
        matchType = 'Yesterday';
        break;
      }
    }

    if (targetOrder) {
      // Clear year/month filter if it hides this order
      if (selectedYear !== 'ALL') setSelectedYear('ALL');
      if (selectedMonth !== 'ALL') setSelectedMonth('ALL');
      if (filterPendingOnly && targetOrder.orderNo) setFilterPendingOnly(false);

      // Find index in filteredRows
      const fIdx = filteredRows.findIndex(r => r.orderId === targetOrder?.orderId);
      const activeIdx = fIdx >= 0 ? fIdx : targetIndex;
      const targetPage = Math.floor(activeIdx / (pageSize || 30)) + 1;
      setCurrentPage(targetPage);
      setHighlightedOrderId(targetOrder.orderId);

      setTimeout(() => {
        const el = document.getElementById(`order-row-${targetOrder?.orderId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);

      setNavNotification(`🎯 Jumped to ${matchType}'s Order (Row #${activeIdx + 1}): "${targetOrder.customerName}" - ${targetOrder.itemName}`);
      setTimeout(() => setNavNotification(null), 4500);
      setTimeout(() => setHighlightedOrderId(null), 6000);
    } else {
      // If no today/yesterday matches, navigate to the very latest incoming order at Row #1
      setCurrentPage(1);
      if (orders.length > 0) {
        const topOrder = orders[0];
        setHighlightedOrderId(topOrder.orderId);
        setTimeout(() => {
          const el = document.getElementById(`order-row-${topOrder.orderId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      }
      setNavNotification(`⚡ Checked Today & Yesterday: No dated entries found. Jumped to latest incoming order at Row #1.`);
      setTimeout(() => setNavNotification(null), 4500);
      setTimeout(() => setHighlightedOrderId(null), 6000);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(queryFormula);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2500);
  };

  return (
    <div className="space-y-2">
      {/* Product Order Clean Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 text-xs">
        {/* Left Side: Total Rows Badge + Year Filter + Month Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Total Rows Badge (Requested by user) */}
          <div className="px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
            <span className="text-slate-500 font-medium text-[11px]">Total Rows:</span>
            <span className="font-mono text-emerald-800 font-extrabold text-xs">
              {filteredRows.length === orders.length ? orders.length.toLocaleString() : `${filteredRows.length.toLocaleString()} of ${orders.length.toLocaleString()}`}
            </span>
          </div>

          {/* Year Filter Dropdown */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-0.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 text-[11px] font-medium">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Month Filter Dropdown */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-0.5 shadow-2xs">
            <span className="text-slate-500 text-[11px] font-medium">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Months</option>
              <option value="1">Jan (01)</option>
              <option value="2">Feb (02)</option>
              <option value="3">Mar (03)</option>
              <option value="4">Apr (04)</option>
              <option value="5">May (05)</option>
              <option value="6">Jun (06)</option>
              <option value="7">Jul (07)</option>
              <option value="8">Aug (08)</option>
              <option value="9">Sep (09)</option>
              <option value="10">Oct (10)</option>
              <option value="11">Nov (11)</option>
              <option value="12">Dec (12)</option>
            </select>
          </div>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Switch to Product Automation */}
          <button
            onClick={onNavigateToAutomation}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Switch to Product Automation tab to view active orders grid"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Product Automation ({activeAssignedCount}) ➔</span>
          </button>

          {/* + Add Row */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Row</span>
          </button>
        </div>
      </div>

      {/* 4. Main Flat Table Grid (Exact 19 Columns A to S) */}
      <div className={`overflow-x-auto overflow-y-auto ${isFullWidth ? 'h-[calc(100vh-180px)] max-h-[85vh]' : 'h-[640px] max-h-[76vh]'} select-text relative fms-sheet-scroll border border-slate-300 rounded-lg shadow-inner bg-white`}>
        <table className="w-full border-collapse text-xs text-left">
          {/* Header Row: Exact 19 Columns A to S */}
          <thead className="sticky top-0 z-30 select-none border-b-2 border-slate-900 font-mono text-[11px]">
            {/* Strip 1: Google Sheet Column Letters A to S */}
            <tr className="bg-slate-900 text-slate-400 text-[10px]">
              <th className="w-10 px-2 py-0.5 text-center bg-slate-950 text-slate-400 border-r border-slate-800 sticky left-0 z-40">
                #
              </th>
              {productOrderColumns.map((col) => {
                let tint = 'bg-slate-900 text-slate-300 border-r border-slate-800';
                if (col.colLetter === 'S') tint = 'bg-emerald-950 text-emerald-300 border-r border-emerald-900 font-extrabold';
                else if (['A', 'B', 'C'].includes(col.colLetter)) tint = 'bg-sky-950 text-sky-300 border-r border-sky-900';
                else if (['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].includes(col.colLetter)) tint = 'bg-amber-950 text-amber-300 border-r border-amber-800 font-bold';
                else tint = 'bg-indigo-950 text-indigo-300 border-r border-indigo-900';

                return (
                  <th key={col.id} className={`px-2 py-0.5 text-center font-mono ${tint}`}>
                    Col {col.colLetter}
                  </th>
                );
              })}
            </tr>

            {/* Strip 2: Exact Column Names */}
            <tr className="border-t border-slate-700">
              <th className="w-10 px-2 py-1.5 text-center bg-slate-900 text-slate-100 border-r border-slate-800 font-bold sticky left-0 z-40">
                #
              </th>
              {productOrderColumns.map((col) => {
                let bgHead = 'bg-slate-800 text-slate-100 border-r border-slate-700 font-bold';
                if (col.colLetter === 'S') bgHead = 'bg-emerald-800 text-emerald-100 border-r border-emerald-700 font-extrabold shadow-sm';
                else if (['A', 'B', 'C'].includes(col.colLetter)) bgHead = 'bg-sky-900 text-sky-100 border-r border-sky-800 font-bold';
                else if (['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].includes(col.colLetter)) bgHead = 'bg-amber-800 text-amber-100 border-r border-amber-700 font-extrabold shadow-sm';
                else bgHead = 'bg-indigo-900 text-indigo-100 border-r border-indigo-800 font-bold';

                return (
                  <th
                    key={col.id}
                    style={{ minWidth: col.minWidth || '110px' }}
                    className={`px-2.5 py-1.5 whitespace-nowrap ${bgHead}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold">{col.label}</span>
                      {col.id === 'orderNo' && (
                        <span className="text-[9px] px-1 bg-amber-400 text-slate-950 rounded font-extrabold">
                          TRIGGER
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body: 100% Exact 19 Columns */}
          <tbody className="font-sans">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={20} className="text-center py-12 text-slate-500 bg-white">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No orders match the filter or search criteria in Product Order.</p>
                  <p className="text-xs text-slate-400 mt-1">Try resetting the month/year filter, or click "Import Sheet" to load your orders.</p>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => {
                const hasOrderNo = Boolean(row.orderNo && row.orderNo.trim() !== '');
                const isHighlighted = highlightedOrderId === row.orderId;
                const rowIndex = (safeCurrentPage - 1) * (pageSize || 30) + index + 1;

                let rowBgClass = hasOrderNo
                  ? index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                  : 'bg-amber-50/40 hover:bg-amber-50/70';

                if (isHighlighted) {
                  rowBgClass = 'bg-amber-100 ring-2 ring-amber-500 font-semibold shadow-md';
                }

                return (
                  <tr
                    key={row.orderId}
                    id={`order-row-${row.orderId}`}
                    className={`border-b border-slate-200 transition-colors hover:bg-sky-50/50 ${rowBgClass}`}
                  >
                    {/* # Index Column */}
                    <td className="w-10 px-2 py-1 text-center font-mono font-bold text-slate-400 bg-slate-50/90 border-r border-slate-200 text-[11px] sticky left-0 z-20">
                      {rowIndex}
                    </td>

                    {/* Col A (1): Timestamp */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-600 font-mono whitespace-nowrap text-[11px]">
                      {row.timestamp}
                    </td>

                    {/* Col B (2): Customer Name */}
                    <td className="px-2 py-1 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap text-[11px]">
                      <div className="flex items-center gap-1">
                        <span>{row.customerName}</span>
                        {row.customerPO && row.customerPO !== 'N/A' && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            (PO: {row.customerPO})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Col C (3): Order Date */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px]">
                      {row.orderDate}
                    </td>

                    {/* Col D (4): Unit */}
                    <td className="px-2 py-1 border-r border-slate-200 font-medium text-purple-900 whitespace-nowrap text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-semibold">
                        {row.unit || '—'}
                      </span>
                    </td>

                    {/* Col E (5): Item Name */}
                    <td className="px-2 py-1 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap text-[11px]">
                      {row.itemName}
                    </td>

                    {/* Col F (6): Color */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px]">
                      {row.color || '—'}
                    </td>

                    {/* Col G (7): Width */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px]">
                      {row.width || '—'}
                    </td>

                    {/* Col H (8): Unit (of item) */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono text-slate-600 text-center text-[10px] whitespace-nowrap">
                      {row.unitOfItem || 'MTR'}
                    </td>

                    {/* Col I (9): Qty */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono font-bold text-slate-900 text-right text-[11px]">
                      {Number(row.qty).toLocaleString()}
                    </td>

                    {/* Col J (10): Rate */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono text-slate-700 text-right text-[11px]">
                      ₹{row.rate}
                    </td>

                    {/* Col K (11): Discount */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono text-slate-600 text-center text-[11px]">
                      {row.discount}%
                    </td>

                    {/* Col L (12): Delivery Date */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px]">
                      {row.deliveryDate || '—'}
                    </td>

                    {/* Col M (13): Remark */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-600 text-[11px] max-w-[200px] truncate" title={row.remark}>
                      {row.remark || '—'}
                    </td>

                    {/* Col N (14): Customer Number */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap text-[11px]">
                      {row.customerNumber || '—'}
                    </td>

                    {/* Col O (15): Billing Address */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-600 text-[10px] max-w-[200px] truncate" title={row.billingAddress}>
                      {row.billingAddress || '—'}
                    </td>

                    {/* Col P (16): Delivery Address */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-600 text-[10px] max-w-[200px] truncate" title={row.deliveryAddress}>
                      {row.deliveryAddress || '—'}
                    </td>

                    {/* Col Q (17): Sales Person Name */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-800 font-medium whitespace-nowrap text-[11px]">
                      {row.salesPerson || '—'}
                    </td>

                    {/* Col R (18): Sales Person Contact */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap text-[11px]">
                      {row.salesPersonContact || '—'}
                    </td>

                    {/* Col S (19): ORDER NUMBER - (Trigger Column into Product Automation) */}
                    <td className="px-2.5 py-1 border-r border-slate-300 bg-emerald-50/40 whitespace-nowrap">
                      {hasOrderNo ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-300 shadow-2xs text-[11px]">
                            {row.orderNo}
                          </span>
                          <span
                            onClick={onNavigateToAutomation}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded px-1.5 py-0.5 cursor-pointer hover:bg-emerald-200"
                            title="Click to view in Product Automation"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. DLFSO2526-01752"
                            value={inputOrderNos[row.orderId] ?? ''}
                            onChange={(e) => setInputOrderNos({ ...inputOrderNos, [row.orderId]: e.target.value })}
                            className="w-32 px-1.5 py-0.5 text-[11px] bg-white border border-amber-300 rounded font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <button
                            onClick={() => {
                              const manualVal = inputOrderNos[row.orderId];
                              onGenerateOrderNo(row.orderId, manualVal);
                            }}
                            className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="Assign Order No and flow to Product Automation"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Assign</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Pagination Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800">
            Showing {pageSize === 0 ? 1 : (safeCurrentPage - 1) * pageSize + 1}–
            {pageSize === 0 ? filteredRows.length : Math.min(safeCurrentPage * pageSize, filteredRows.length)} of{' '}
            <strong className="text-emerald-700 font-bold font-mono">{filteredRows.length.toLocaleString()}</strong> rows
            {filteredRows.length !== orders.length && (
              <span className="text-slate-500 font-normal ml-1">
                (filtered from {orders.length.toLocaleString()} total)
              </span>
            )}
          </span>

          <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-300">
            <span className="text-[11px] text-slate-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value={20}>20 rows</option>
              <option value={30}>30 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={250}>250 rows</option>
              <option value={500}>500 rows</option>
              <option value={0}>All (Full Sheet View)</option>
            </select>
          </div>
        </div>

        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-2 text-xs font-medium text-slate-600">
              Page <strong className="text-slate-900">{safeCurrentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* MODAL: CLEAR ALL ROWS CONFIRMATION */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gradient-to-r from-rose-900 to-red-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-300" />
                <h3 className="font-bold text-sm">Clear All Product Order Data?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                Are you sure you want to completely delete all <span className="text-rose-600 font-bold">{orders.length.toLocaleString()}</span> rows from Product Order?
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] space-y-1">
                <p className="font-semibold text-rose-900">• Sheet will be set to a clean slate (0 rows).</p>
                <p>• You can then click "Import Sheet" to fetch your orders directly from Google Sheet ID <code>1xSSZ6DyQarQJOd8UpOfCV-tjdKL1oQq_IKuXJkcRv5Q</code> (Tab: Product Order).</p>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllRows) onClearAllRows();
                  setShowClearConfirmModal(false);
                }}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete All {orders.length.toLocaleString()} Rows</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW ROW TO PRODUCT ORDER */}
      {showAddModal && (
        <NewProductOrderRowModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(newRow) => {
            onAddNewRow(newRow);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

// Modal for adding a new row into Product Order (19 Columns A to S)
interface NewProductOrderRowModalProps {
  onClose: () => void;
  onSubmit: (row: ProductOrderRow) => void;
}

const NewProductOrderRowModal: React.FC<NewProductOrderRowModalProps> = ({ onClose, onSubmit }) => {
  const [customerName, setCustomerName] = useState('Shree Ganesh Textiles (Delhi)');
  const [orderDate, setOrderDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [unit, setUnit] = useState('WARP(UDHANA)');
  const [itemName, setItemName] = useState('L-4014/NS/56-I');
  const [color, setColor] = useState('White');
  const [width, setWidth] = useState('56"');
  const [unitOfItem, setUnitOfItem] = useState('MTR');
  const [qty, setQty] = useState('500');
  const [rate, setRate] = useState('180');
  const [discount, setDiscount] = useState('10');
  const [deliveryDate, setDeliveryDate] = useState('20/02/2026');
  const [remark, setRemark] = useState('Confirm delivery with sales head');
  const [customerNumber, setCustomerNumber] = useState('9810123456');
  const [billingAddress, setBillingAddress] = useState('Chandni Chowk, Delhi');
  const [deliveryAddress, setDeliveryAddress] = useState('Chandni Chowk, Delhi');
  const [salesPerson, setSalesPerson] = useState('Lalit Maroo');
  const [salesPersonContact, setSalesPersonContact] = useState('9876543210');
  const [orderNo, setOrderNo] = useState('');
  const [generateNow, setGenerateNow] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toLocaleString('en-IN');
    const finalOrderNo = generateNow ? `DLFSO2526-0${Math.floor(1750 + Math.random() * 50)}` : orderNo;

    const newRow: ProductOrderRow = {
      orderId: `ORD-${Date.now()}`,
      timestamp: nowStr,
      customerName,
      orderDate,
      unit,
      itemName,
      color,
      width,
      unitOfItem,
      qty: Number(qty) || 0,
      rate: Number(rate) || 0,
      discount: Number(discount) || 0,
      deliveryDate,
      remark,
      customerNumber,
      billingAddress,
      deliveryAddress,
      salesPerson,
      salesPersonContact,
      orderNo: finalOrderNo,
      orderNoTimestamp: finalOrderNo ? nowStr : '',
      statusAN: 'Open'
    };

    onSubmit(newRow);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-300" />
            <h3 className="font-bold text-sm sm:text-base">Add New Order Row (Columns A to S)</h3>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col B: Customer Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col C: Order Date</label>
              <input
                type="text"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col D: Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col E: Item Name *</label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col F: Color</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col G: Width</label>
              <input
                type="text"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col H: Unit (Item)</label>
              <input
                type="text"
                value={unitOfItem}
                onChange={(e) => setUnitOfItem(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col I: Qty *</label>
              <input
                type="number"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col J: Rate (₹)</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col K: Discount (%)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col L: Delivery Date</label>
              <input
                type="text"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col N: Customer Number</label>
              <input
                type="text"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col O: Billing Address</label>
              <input
                type="text"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col P: Delivery Address</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col Q: Sales Person Name</label>
              <input
                type="text"
                value={salesPerson}
                onChange={(e) => setSalesPerson(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Col R: Sales Person Contact</label>
              <input
                type="text"
                value={salesPersonContact}
                onChange={(e) => setSalesPersonContact(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Col M: Remark</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Col S: Order Number Configuration */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <span className="font-bold text-emerald-950 block">
              Col S: Order Number (Automation Trigger)
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateNow}
                  onChange={(e) => setGenerateNow(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-800">Auto-Generate SO# now (Flows into Product Automation)</span>
              </label>
            </div>
            {!generateNow && (
              <input
                type="text"
                placeholder="Leave blank for pending or type manual Order No"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
              />
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Order Row</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
