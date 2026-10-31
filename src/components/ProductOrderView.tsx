import React, { useState, useMemo } from 'react';
import { ProductOrderRow } from '../types/fms';
import { productOrderColumns } from '../data/sampleOrders';
import {
  Search,
  Sparkles,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Filter,
  Layers,
  X
} from 'lucide-react';

interface ProductOrderViewProps {
  orders: ProductOrderRow[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  isFullWidth: boolean;
  onGenerateOrderNo: (orderId: string, customNo?: string) => void;
  onGenerateAllPending: () => void;
  onDeleteRow?: (orderId: string) => void;
  onUpdateRow?: (orderId: string, field: keyof ProductOrderRow, value: any) => void;
  onNavigateToAutomation: () => void;
  onAddNewRow: (row: ProductOrderRow) => void;
}

export const ProductOrderView: React.FC<ProductOrderViewProps> = ({
  orders,
  searchTerm,
  setSearchTerm,
  isFullWidth,
  onGenerateOrderNo,
  onGenerateAllPending,
  onNavigateToAutomation,
  onAddNewRow
}) => {
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [inputOrderNos, setInputOrderNos] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered rows based on search and pending status
  const filteredRows = useMemo(() => {
    return orders.filter(row => {
      if (filterPendingOnly && row.orderNo && row.orderNo.trim() !== '') {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchRef = (row.referenceNo || '').toLowerCase().includes(q);
        const matchPO = (row.customerPO || '').toLowerCase().includes(q);
        const matchCust = (row.customerName || '').toLowerCase().includes(q);
        const matchItem = (row.itemName || '').toLowerCase().includes(q);
        const matchOrderNo = (row.orderNo || '').toLowerCase().includes(q);
        const matchSales = (row.salesPerson || '').toLowerCase().includes(q);
        const matchTrans = (row.transporterName || '').toLowerCase().includes(q);
        if (!matchRef && !matchPO && !matchCust && !matchItem && !matchOrderNo && !matchSales && !matchTrans) {
          return false;
        }
      }
      return true;
    });
  }, [orders, filterPendingOnly, searchTerm]);

  const pendingCount = useMemo(() => {
    return orders.filter(r => !r.orderNo || r.orderNo.trim() === '').length;
  }, [orders]);

  const activeAssignedCount = orders.length - pendingCount;

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-1.5">
      {/* Product Order Top Action Toolbar: only right corner actions as requested */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 text-xs">
        {/* Left side: Search Box */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO, Customer, Item, Order No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs w-64 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Right Corner: Exactly the 4 items requested */}
        <div className="flex items-center gap-2 ml-auto">
          {/* 1. Pending O.N Only (X) */}
          <button
            onClick={() => setFilterPendingOnly(!filterPendingOnly)}
            className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer ${
              filterPendingOnly
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Pending O.N Only ({pendingCount})</span>
          </button>

          {/* 2. ⚡ Generate O.N for All Pending (X) */}
          {pendingCount > 0 && (
            <button
              onClick={onGenerateAllPending}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Automatically generate Order Numbers for all pending orders"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>⚡ Generate O.N for All Pending ({pendingCount})</span>
            </button>
          )}

          {/* 3. Product Automation (X) ➔ */}
          <button
            onClick={onNavigateToAutomation}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Switch to Product Automation tab to view active orders grid"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Product Automation ({activeAssignedCount}) ➔</span>
          </button>

          {/* 4. + Add Row */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Row</span>
          </button>
        </div>
      </div>

      {/* Main Single Row Flat Table Grid */}
      <div className={`overflow-x-auto overflow-y-auto ${isFullWidth ? 'h-[calc(100vh-140px)] max-h-[89vh]' : 'h-[660px] max-h-[78vh]'} select-text relative fms-sheet-scroll border border-slate-300 rounded-lg shadow-inner bg-white`}>
        <table className="w-full border-collapse text-xs text-left">
          {/* Header Row: 28 Columns with clean categorization */}
          <thead className="sticky top-0 z-30 select-none border-b-2 border-slate-900 font-mono text-[11px]">
            {/* Column Letter / Index Numbers Strip */}
            <tr className="bg-slate-900 text-slate-400 text-[10px]">
              <th className="w-10 px-2 py-0.5 text-center bg-slate-950 text-slate-400 border-r border-slate-800 sticky left-0 z-40">
                #
              </th>
              {productOrderColumns.map((col, idx) => {
                let tint = 'bg-slate-900 text-slate-300 border-r border-slate-800';
                if (idx < 6) tint = 'bg-sky-950 text-sky-300 border-r border-sky-900';
                else if (idx >= 6 && idx < 15) tint = 'bg-amber-950 text-amber-300 border-r border-amber-800 font-bold';
                else if (idx >= 15 && idx < 26) tint = 'bg-indigo-950 text-indigo-300 border-r border-indigo-900';
                else tint = 'bg-emerald-950 text-emerald-300 border-r border-emerald-900';

                return (
                  <th key={col.id} className={`px-2 py-0.5 text-center font-mono ${tint}`}>
                    {idx + 1}
                  </th>
                );
              })}
            </tr>

            {/* Column Names Strip */}
            <tr className="border-t border-slate-700">
              <th className="w-10 px-2 py-1.5 text-center bg-slate-900 text-slate-100 border-r border-slate-800 font-bold sticky left-0 z-40">
                #
              </th>
              {productOrderColumns.map((col, idx) => {
                let bgHead = 'bg-slate-800 text-slate-100 border-r border-slate-700 font-bold';
                if (idx < 6) bgHead = 'bg-sky-900 text-sky-100 border-r border-sky-800 font-bold';
                else if (idx >= 6 && idx < 15) bgHead = 'bg-amber-700 text-white border-r border-amber-600 font-bold shadow-inner';
                else if (idx >= 15 && idx < 26) bgHead = 'bg-indigo-900 text-indigo-100 border-r border-indigo-800 font-bold';
                else bgHead = 'bg-emerald-900 text-emerald-100 border-r border-emerald-800 font-bold';

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

          {/* Table Body: 100% Single Row-Wise (No Merge Logic) */}
          <tbody className="font-sans">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={29} className="text-center py-12 text-slate-500 bg-white">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No orders match the filter or search criteria in Product Order.</p>
                  <p className="text-xs text-slate-400 mt-1">Try clearing search or toggle Pending O.N filter.</p>
                </td>
              </tr>
            ) : (
              filteredRows.map((row, index) => {
                const hasOrderNo = Boolean(row.orderNo && row.orderNo.trim() !== '');
                const rowBg = hasOrderNo
                  ? index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                  : 'bg-amber-50/40 hover:bg-amber-50/70';

                return (
                  <tr
                    key={row.orderId}
                    className={`border-b border-slate-200 transition-colors hover:bg-sky-50/40 ${rowBg}`}
                  >
                    {/* # Index Column */}
                    <td className="w-10 px-2 py-1 text-center font-mono font-bold text-slate-400 bg-slate-50/90 border-r border-slate-200 text-[11px] sticky left-0 z-20">
                      {index + 1}
                    </td>

                    {/* Col 1: Order No (Reference / GNZ) */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono font-bold text-blue-900 whitespace-nowrap text-[11px]">
                      <div className="flex items-center gap-1">
                        <span>{row.referenceNo || `GNZ-${row.orderId.slice(-6)}`}</span>
                        <button
                          onClick={() => handleCopyText(row.referenceNo || row.orderId, row.orderId)}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-slate-400 hover:text-slate-700 p-0.5"
                          title="Copy Reference"
                        >
                          {copiedId === row.orderId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Col 2: Timestamp */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-600 font-mono whitespace-nowrap text-[11px]">
                      {row.timestamp}
                    </td>

                    {/* Col 3: Customer PO */}
                    <td className="px-2 py-1 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap text-[11px]">
                      <span className={row.customerPO === 'N/A' ? 'text-slate-400 italic' : 'text-slate-900 font-bold'}>
                        {row.customerPO}
                      </span>
                    </td>

                    {/* Col 4: Customer Name */}
                    <td className="px-2 py-1 border-r border-slate-200 font-medium text-slate-900 whitespace-nowrap text-[11px]">
                      {row.customerName}
                    </td>

                    {/* Col 5: Customer Email */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-600 text-[10px] whitespace-nowrap">
                      {row.customerEmail || '—'}
                    </td>

                    {/* Col 6: Order Date */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px]">
                      {row.orderDate}
                    </td>

                    {/* Col 7: Unit (Category) */}
                    <td className="px-2 py-1 border-r border-slate-200 font-medium text-purple-900 whitespace-nowrap text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-semibold">
                        {row.unit}
                      </span>
                    </td>

                    {/* Col 8: Item Name */}
                    <td className="px-2 py-1 border-r border-slate-200 font-semibold text-slate-900 whitespace-nowrap text-[11px]">
                      {row.itemName}
                    </td>

                    {/* Col 9: Color */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px]">
                      {row.color}
                    </td>

                    {/* Col 10: Width */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px]">
                      {row.width}
                    </td>

                    {/* Col 11: Unit (of item) */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono text-slate-600 text-center text-[10px] whitespace-nowrap">
                      {row.unitOfItem}
                    </td>

                    {/* Col 12: Qty */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono font-bold text-slate-900 text-right text-[11px]">
                      {Number(row.qty).toLocaleString()}
                    </td>

                    {/* Col 13: Rate */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono text-slate-700 text-right text-[11px]">
                      ₹{row.rate}
                    </td>

                    {/* Col 14: Discount */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono text-slate-600 text-center text-[11px]">
                      {row.discount}%
                    </td>

                    {/* Col 15: Delivery Date */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px]">
                      {row.deliveryDate}
                    </td>

                    {/* Col 16: Remark */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-600 text-[11px] max-w-[200px] truncate" title={row.remark}>
                      {row.remark || '—'}
                    </td>

                    {/* Col 17: Customer Number */}
                    <td className="px-2 py-1 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap text-[11px]">
                      {row.customerNumber || '—'}
                    </td>

                    {/* Col 18: Billing Address */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-600 text-[10px] max-w-[220px] truncate" title={row.billingAddress}>
                      {row.billingAddress || '—'}
                    </td>

                    {/* Col 19: Delivery Address */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-600 text-[10px] max-w-[220px] truncate" title={row.deliveryAddress}>
                      {row.deliveryAddress || '—'}
                    </td>

                    {/* Col 20: Transporter Name */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-800 whitespace-nowrap text-[11px]">
                      {row.transporterName || '—'}
                    </td>

                    {/* Col 21: Sales Person Name */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-800 font-medium whitespace-nowrap text-[11px]">
                      {row.salesPerson || '—'}
                    </td>

                    {/* Col 22: Account Status */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-700 whitespace-nowrap text-[11px]">
                      {row.accountStatus || '—'}
                    </td>

                    {/* Col 23: Branch */}
                    <td className="px-2 py-1 border-r border-slate-200 font-medium text-slate-800 whitespace-nowrap text-[11px]">
                      {row.branch || 'Delhi'}
                    </td>

                    {/* Col 24: Approval Status */}
                    <td className="px-2 py-1 border-r border-slate-200 whitespace-nowrap text-[11px] text-center">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                        {row.approvalStatus || 'APPROVED'}
                      </span>
                    </td>

                    {/* Col 25: Branch Head Name */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-800 whitespace-nowrap text-[11px]">
                      {row.branchHeadName || 'Vinay Chhajer'}
                    </td>

                    {/* Col 26: Branch Head Email */}
                    <td className="px-2 py-1 border-r border-slate-200 text-slate-600 text-[10px] whitespace-nowrap">
                      {row.branchHeadEmail || 'vinay.chhajer@ginzalimited.com'}
                    </td>

                    {/* Col 27: ORDER NO (O.N GENERATE) - THE CRITICAL AUTOMATION TRIGGER */}
                    <td className="px-2.5 py-1 border-r border-slate-300 bg-emerald-50/30 whitespace-nowrap">
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
                            <span>Active (Open)</span>
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
                            onClick={() => onGenerateOrderNo(row.orderId, inputOrderNos[row.orderId])}
                            className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-[11px] shadow-2xs flex items-center gap-1 transition-colors"
                            title="Assign Order No and push to Product Automation with Col AN default Open"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Generate O.N</span>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Col 28: Timestamp ( O.N Generate ) */}
                    <td className="px-2 py-1 text-slate-600 font-mono whitespace-nowrap text-[10px]">
                      {row.orderNoTimestamp || (hasOrderNo ? row.timestamp : '—')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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

// Modal for adding a new row into Product Order
interface NewProductOrderRowModalProps {
  onClose: () => void;
  onSubmit: (row: ProductOrderRow) => void;
}

const NewProductOrderRowModal: React.FC<NewProductOrderRowModalProps> = ({ onClose, onSubmit }) => {
  const [referenceNo] = useState(`GNZ-${Math.floor(100000 + Math.random() * 900000)}`);
  const [customerPO, setCustomerPO] = useState(`52${Math.floor(80 + Math.random() * 20)}`);
  const [customerName, setCustomerName] = useState('Shree Ganesh Textiles (Delhi)');
  const [customerEmail, setCustomerEmail] = useState('ganesh.textiles@gmail.com');
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
  const [transporterName, setTransporterName] = useState('Atc express');
  const [salesPerson, setSalesPerson] = useState('Lalit Maroo');
  const [accountStatus, setAccountStatus] = useState('Nil');
  const [branch, setBranch] = useState('Delhi');
  const [approvalStatus, setApprovalStatus] = useState('APPROVED');
  const [branchHeadName, setBranchHeadName] = useState('Vinay Chhajer');
  const [branchHeadEmail, setBranchHeadEmail] = useState('vinay.chhajer@ginzalimited.com');
  const [orderNo, setOrderNo] = useState('');
  const [generateNow, setGenerateNow] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toLocaleString('en-IN');
    const finalOrderNo = generateNow ? `DLFSO2526-0${Math.floor(1750 + Math.random() * 50)}` : orderNo;

    const newRow: ProductOrderRow = {
      orderId: `ORD-${Date.now()}`,
      referenceNo,
      timestamp: nowStr,
      customerPO,
      customerName,
      customerEmail,
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
      transporterName,
      salesPerson,
      accountStatus,
      branch,
      approvalStatus,
      branchHeadName,
      branchHeadEmail,
      orderNo: finalOrderNo,
      orderNoTimestamp: finalOrderNo ? nowStr : '',
      statusAN: 'Open'
    };

    onSubmit(newRow);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Add Row to Product Order (28 Columns Master Sheet)
            </h3>
            <p className="text-xs text-slate-300">
              New single-row incoming order. Assigning an Order No will flow this order into Product Automation (Active Orders) with Col AN default Open.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Section 1: Customer & PO */}
          <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-200 space-y-3">
            <span className="font-bold text-sky-950 block uppercase text-[11px] tracking-wider">
              1. Customer &amp; Order Header (Cols 1–6)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Order No (Reference)</label>
                <input
                  type="text"
                  disabled
                  value={referenceNo}
                  className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-blue-900 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Customer PO (Col 3)</label>
                <input
                  type="text"
                  required
                  value={customerPO}
                  onChange={(e) => setCustomerPO(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Customer Name (Col 4)</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Customer Email (Col 5)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Customer Number (Col 17)</label>
                <input
                  type="text"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Order Date (Col 6)</label>
                <input
                  type="text"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Product & Item Specs */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 block uppercase text-[11px] tracking-wider">
              2. Product &amp; Specifications (Cols 7–15)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Unit / Category (Col 7)</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                >
                  <option value="WARP(UDHANA)">WARP(UDHANA)</option>
                  <option value="ELASTIC">ELASTIC</option>
                  <option value="CKU">CKU</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Item Name (Col 8)</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Color (Col 9)</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Width (Col 10)</label>
                <input
                  type="text"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Unit of Item (Col 11)</label>
                <input
                  type="text"
                  value={unitOfItem}
                  onChange={(e) => setUnitOfItem(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Qty (Col 12)</label>
                <input
                  type="number"
                  required
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Rate (₹) (Col 13)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Discount % (Col 14)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Delivery Date (Col 15)</label>
                <input
                  type="text"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Logistics & Approval */}
          <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200 space-y-3">
            <span className="font-bold text-indigo-950 block uppercase text-[11px] tracking-wider">
              3. Logistics, Branch &amp; Approval (Cols 16–26)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Transporter Name (Col 20)</label>
                <input
                  type="text"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Sales Person (Col 21)</label>
                <input
                  type="text"
                  value={salesPerson}
                  onChange={(e) => setSalesPerson(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Branch (Col 23)</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Billing &amp; Delivery Address (Cols 18 &amp; 19)</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => {
                    setBillingAddress(e.target.value);
                    setDeliveryAddress(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Remark (Col 16)</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Order No Generation Trigger (Col 27 & 28) */}
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-300 space-y-3">
            <span className="font-bold text-emerald-950 block uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              4. Order Number Generation (Col 27 &amp; 28 Trigger)
            </span>
            <p className="text-[11px] text-emerald-900">
              When an Order Number is present, this order will automatically flow into the <strong>Product Automation (Active Orders)</strong> tab with default status <strong>Open</strong> in Column AN!
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-900">
                <input
                  type="checkbox"
                  checked={generateNow}
                  onChange={(e) => setGenerateNow(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Auto-generate Order Number immediately (e.g. DLFSO2526-0XXXX)</span>
              </label>

              {!generateNow && (
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Or enter custom Order No (e.g. TDN/03595/25-26) or leave blank"
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded font-mono text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shadow-sm"
            >
              Add to Product Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
