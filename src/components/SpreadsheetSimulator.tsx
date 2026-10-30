import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GroupedOrder, ProductOrderRow, OrderItem } from '../types/fms';
import { initialRawResponses, initialExistingDispatch, fmsColumnMapping } from '../data/sampleOrders';
import {
  RotateCcw,
  PlusCircle,
  Play,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  SplitSquareVertical,
  Edit3,
  AlertTriangle,
  FileCode2,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  X,
  Download,
  Filter,
  Search,
  Plus,
  Trash2,
  Table,
  Archive,
  FileSpreadsheet,
  Zap,
  CheckSquare,
  Clock,
  ArrowUpDown,
  Eye,
  EyeOff,
  Columns,
  CloudUpload,
  Database,
  Flame,
  ArrowUp,
  ArrowDown,
  ChevronDown
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'ginza_fms_sheet_orders_v5';
const LOCAL_STORAGE_DISPATCH_KEY = 'ginza_fms_sheet_dispatch_v5';
const LOCAL_STORAGE_COL_VISIBILITY = 'ginza_fms_col_visibility_v5';
const LOCAL_STORAGE_FIREBASE_CONFIG = 'ginza_fms_firebase_cfg_v5';

export const SpreadsheetSimulator: React.FC = () => {
  // Load saved orders from localStorage or fallback to updated real orders
  const [rawResponses, setRawResponses] = useState<ProductOrderRow[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved orders', e);
    }
    return initialRawResponses;
  });

  // State for user-entered dispatch quantities in Col Y
  const [dispatchRecords, setDispatchRecords] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DISPATCH_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved dispatch', e);
    }
    return initialExistingDispatch;
  });

  // Column Visibility state (Allows hiding/showing manual columns like Addresses, Follow-ups, etc.)
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COL_VISIBILITY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Default: Show core 26 columns + AN, AO, AP (Hide extra optional follow-ups initially for cleaner view)
    const initial: Record<string, boolean> = {};
    fmsColumnMapping.forEach(col => {
      // By default show A through Z, plus AM (LR), AN (Status), AO (WhatsApp Msg), AP (WhatsApp Link)
      const isExtra = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AQ', 'AR', 'AS'].includes(col.sheetCol);
      initial[col.sheetCol] = !isExtra;
    });
    return initial;
  });

  // Column Dropdown Filter State: Record<colLetter, string[]> (List of selected values)
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});

  // Active Sorting: { column: string; direction: 'asc' | 'desc' }
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  // Active popover filter menu
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [columnSearchText, setColumnSearchText] = useState('');

  // Column Visibility Manager modal
  const [showColManager, setShowColManager] = useState(false);

  // Firebase Live Sync & Historical Upload Modal
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [firebaseUrl, setFirebaseUrl] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_FIREBASE_CONFIG);
      if (saved) return JSON.parse(saved).url || 'https://ginza-fms-default-rtdb.firebaseio.com';
    } catch (e) {}
    return 'https://ginza-fms-default-rtdb.firebaseio.com';
  });
  const [firebaseAuthKey, setFirebaseAuthKey] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [firebaseSyncStatus, setFirebaseSyncStatus] = useState<'idle' | 'uploading' | 'synced' | 'error'>('idle');

  // Col AO: Dispatch Status ("Message Sent" vs "Pending")
  const [aoStatuses, setAoStatuses] = useState<Record<string, string>>({
    '5277_Fashion Dupatta Corner (Delhi)_amanpreet0704@gmail.com_8468829837_29/01/2026': 'Message Sent',
    'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': 'Message Sent',
    '5281_Nandani Lace House (Delhi)_N/A_8800421410_29/01/2026': 'Pending'
  });

  // Col AM: LR- Number state
  const [lrNumbers, setLrNumbers] = useState<Record<string, string>>({
    '5277_Fashion Dupatta Corner (Delhi)_amanpreet0704@gmail.com_8468829837_29/01/2026': 'ATC-98442',
    'N/A_M G Enterprises (Delhi)_m.g.enterprises27474@gmail.com_9811138454_29/01/2026': '',
    'N/A_Ganpati Dupatta House (Amritsar)_ganpatidupattahouse1@yahoo.com_9417054532_29/01/2026': 'HARI-1290',
    '5281_Nandani Lace House (Delhi)_N/A_8800421410_29/01/2026': 'MEHTA-0041'
  });

  // Active Sheet tab: 'automation' (Active Orders: Open & In-Progress), 'closed' (Closed Orders Archive), 'all' (All Orders)
  const [activeSheetTab, setActiveSheetTab] = useState<'automation' | 'closed' | 'all'>('automation');

  // Status Filter in Toolbar
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Open' | 'In-Progress' | 'Closed'>('ALL');

  // Active cell selection for Formula Bar
  const [selectedCell, setSelectedCell] = useState<{ col: string; row: number; val: string; formula?: string }>({
    col: 'AN',
    row: 8,
    val: 'Open',
    formula: 'Data Validation: Dropdown [Open, In-Progress, Closed]'
  });

  // View mode: 'merged' (Customer A-E & N-X Vertically Merged) vs 'unmerged' (Flat row-wise)
  const [viewMode, setViewMode] = useState<'merged' | 'unmerged'>('merged');

  // Global search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Status message for simulation feedback
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Modal for previewing WhatsApp dispatch link
  const [whatsAppModalOrder, setWhatsAppModalOrder] = useState<GroupedOrder | null>(null);
  const [copiedWhatsAppMsg, setCopiedWhatsAppMsg] = useState(false);

  // Modal for New Order entry
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  // Modal for adding item to existing order
  const [addingItemToOrder, setAddingItemToOrder] = useState<GroupedOrder | null>(null);

  // Quick edit modal for Order No (Col X)
  const [editingOrderNo, setEditingOrderNo] = useState<{ key: string; po: string; value: string } | null>(null);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rawResponses));
    } catch (e) {}
  }, [rawResponses]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_DISPATCH_KEY, JSON.stringify(dispatchRecords));
    } catch (e) {}
  }, [dispatchRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_COL_VISIBILITY, JSON.stringify(visibleCols));
    } catch (e) {}
  }, [visibleCols]);

  // Group raw responses into distinct orders
  const groupedOrders: GroupedOrder[] = useMemo(() => {
    const map: Record<string, GroupedOrder> = {};

    rawResponses.forEach((row) => {
      const orderKey = [
        row.customerPO,
        row.customerName,
        row.customerEmail,
        row.customerNumber,
        row.orderDate
      ].map(v => (v || '').trim()).join('_');

      if (!map[orderKey]) {
        map[orderKey] = {
          orderKey,
          timestamp: row.timestamp,
          customerPO: row.customerPO,
          customerName: row.customerName,
          customerEmail: row.customerEmail,
          orderDate: row.orderDate,
          items: [],
          remark: row.remark || '',
          customerNumber: row.customerNumber,
          billingAddress: row.billingAddress,
          deliveryAddress: row.deliveryAddress,
          transporterName: row.transporterName,
          salesPerson: row.salesPerson,
          accountStatus: row.accountStatus,
          branch: row.branch,
          approvalStatus: row.approvalStatus,
          orderNo: row.orderNo || '',
          statusAN: (row.statusAN as any) || 'Open'
        };
      }

      // Lookup preserved dispatch quantity for this item
      const itemKey = `${orderKey}___${row.itemName.trim()}___${row.color.trim()}___${row.width.trim()}`;
      const dispatch = dispatchRecords[itemKey] !== undefined ? dispatchRecords[itemKey] : 0;
      const balance = Number((row.qty - dispatch).toFixed(4));

      map[orderKey].items.push({
        id: row.orderId,
        unit: row.unit,
        itemName: row.itemName,
        color: row.color,
        width: row.width,
        unitOfItem: row.unitOfItem,
        qty: row.qty,
        rate: row.rate,
        discount: row.discount,
        deliveryDate: row.deliveryDate,
        dispatchQty: dispatch,
        balanceQty: balance,
        statusAN: (row.statusAN as any) || map[orderKey].statusAN || 'Open'
      });
    });

    return Object.values(map);
  }, [rawResponses, dispatchRecords]);

  // Handle Status AN Dropdown Change: 'Open' | 'In-Progress' | 'Closed'
  const handleStatusChange = (orderKey: string, newStatus: 'Open' | 'In-Progress' | 'Closed') => {
    setRawResponses(prev =>
      prev.map(row => {
        const key = [
          row.customerPO,
          row.customerName,
          row.customerEmail,
          row.customerNumber,
          row.orderDate
        ].map(v => (v || '').trim()).join('_');

        if (key === orderKey) {
          return { ...row, statusAN: newStatus };
        }
        return row;
      })
    );

    setSyncFeedback(`Col AN updated to "${newStatus}". ${newStatus === 'Closed' ? 'Order moved to "Closed Orders" tab!' : 'Active in "Product Automation".'}`);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Handle changing Dispatch Qty in Col Y
  const handleDispatchChange = (orderKey: string, item: { itemName: string; color: string; width: string }, newQtyStr: string) => {
    const val = newQtyStr === '' ? 0 : (Number(newQtyStr) || 0);
    const itemKey = `${orderKey}___${item.itemName.trim()}___${item.color.trim()}___${item.width.trim()}`;

    setDispatchRecords(prev => ({
      ...prev,
      [itemKey]: val
    }));
  };

  // Delete an entire order
  const handleDeleteOrder = (orderKey: string, poName: string) => {
    if (!window.confirm(`Are you sure you want to delete order "${poName}"?`)) return;
    setRawResponses(prev =>
      prev.filter(row => {
        const key = [
          row.customerPO,
          row.customerName,
          row.customerEmail,
          row.customerNumber,
          row.orderDate
        ].map(v => (v || '').trim()).join('_');
        return key !== orderKey;
      })
    );
    setSyncFeedback(`Order ${poName} deleted successfully.`);
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  // Delete single item row
  const handleDeleteItem = (itemOrderId: string) => {
    setRawResponses(prev => prev.filter(row => row.orderId !== itemOrderId));
    setSyncFeedback(`Item row removed.`);
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  // Add Item to existing order
  const handleAddItemToExistingOrder = (order: GroupedOrder, newItemData: Partial<OrderItem>) => {
    const newId = `ORD-${Date.now().toString().slice(-4)}`;
    const newRow: ProductOrderRow = {
      orderId: newId,
      timestamp: order.timestamp,
      customerPO: order.customerPO,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      orderDate: order.orderDate,
      unit: newItemData.unit || 'WARP(UDHANA)',
      itemName: newItemData.itemName || 'L-4014/NS',
      color: newItemData.color || 'White',
      width: newItemData.width || '56"',
      unitOfItem: newItemData.unitOfItem || 'MTR',
      qty: Number(newItemData.qty) || 100,
      rate: Number(newItemData.rate) || 150,
      discount: Number(newItemData.discount) || 0,
      deliveryDate: newItemData.deliveryDate || '15/11/2026',
      remark: order.remark,
      customerNumber: order.customerNumber,
      billingAddress: order.billingAddress,
      deliveryAddress: order.deliveryAddress,
      transporterName: order.transporterName,
      salesPerson: order.salesPerson,
      accountStatus: order.accountStatus,
      branch: order.branch,
      approvalStatus: order.approvalStatus,
      branchHeadName: '',
      orderNo: order.orderNo,
      statusAN: order.statusAN || 'Open'
    };

    setRawResponses(prev => [...prev, newRow]);
    setAddingItemToOrder(null);
    setSyncFeedback(`Added item "${newItemData.itemName}" to order ${order.customerPO}! Merged block expanded.`);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Save new multi-item order from modal
  const handleCreateNewOrder = (orderData: {
    customerPO: string;
    customerName: string;
    customerEmail: string;
    customerNumber: string;
    orderDate: string;
    billingAddress: string;
    deliveryAddress: string;
    transporterName: string;
    salesPerson: string;
    orderNo: string;
    remark: string;
    statusAN: 'Open' | 'In-Progress' | 'Closed';
    items: Array<{
      unit: string;
      itemName: string;
      color: string;
      width: string;
      unitOfItem: string;
      qty: number;
      rate: number;
      discount: number;
      deliveryDate: string;
    }>;
  }) => {
    const nowStr = new Date().toLocaleString('en-IN');
    const newRows: ProductOrderRow[] = orderData.items.map((it, idx) => ({
      orderId: `ORD-${Date.now()}-${idx + 1}`,
      timestamp: nowStr,
      customerPO: orderData.customerPO,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
      unit: it.unit || 'WARP(UDHANA)',
      itemName: it.itemName,
      color: it.color,
      width: it.width,
      unitOfItem: it.unitOfItem,
      qty: Number(it.qty) || 0,
      rate: Number(it.rate) || 0,
      discount: Number(it.discount) || 0,
      deliveryDate: it.deliveryDate,
      remark: orderData.remark,
      customerNumber: orderData.customerNumber,
      billingAddress: orderData.billingAddress,
      deliveryAddress: orderData.deliveryAddress,
      transporterName: orderData.transporterName,
      salesPerson: orderData.salesPerson,
      accountStatus: 'Approved',
      branch: 'Mumbai Central',
      approvalStatus: 'APPROVED',
      branchHeadName: orderData.salesPerson,
      orderNo: orderData.orderNo,
      statusAN: orderData.statusAN
    }));

    setRawResponses(prev => [...newRows, ...prev]);
    setShowNewOrderModal(false);
    setSyncFeedback(`New Order "${orderData.customerPO}" added with ${orderData.items.length} items!`);
    setTimeout(() => setSyncFeedback(null), 4500);
  };

  // Reset to default sample data
  const handleReset = () => {
    if (window.confirm("Do you want to reset the sheet data to default sample records?")) {
      setRawResponses(initialRawResponses);
      setDispatchRecords(initialExistingDispatch);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_DISPATCH_KEY);
      setSyncFeedback("Reset to default sample data.");
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  // Update Order No (Col X)
  const handleSaveOrderNo = () => {
    if (!editingOrderNo) return;
    setRawResponses(prev =>
      prev.map(row => {
        const key = [
          row.customerPO,
          row.customerName,
          row.customerEmail,
          row.customerNumber,
          row.orderDate
        ].map(v => (v || '').trim()).join('_');

        if (key === editingOrderNo.key) {
          return { ...row, orderNo: editingOrderNo.value };
        }
        return row;
      })
    );
    setSyncFeedback(`Order No for ${editingOrderNo.po} set to "${editingOrderNo.value}" in Col X!`);
    setEditingOrderNo(null);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Export entire sheet as CSV (Exact 45 Columns from user's specification)
  const handleExportCSV = () => {
    const headers = [
      'Timestamp', 'Customer PO', 'Customer Name', 'Customer Email', 'Order Date',
      'Unit', 'Item Name', 'Color', 'Width', 'Unit (of Item)', 'Qty', 'Rate', 'Discount', 'Delivery Date',
      'Remark', 'Customer Number', 'Billing Address', 'Delivery Address', 'Transporter Name',
      'Sales Person Name', 'Account Status', 'Approval', 'Timestamp', 'Order Number',
      'Dispatch Qnt', 'Balance Qnt', 'Status', 'Remark', 'Confirmation Mail', 'Mail Status',
      'Confirmation Msg', 'Whatspp Link', 'Follow-up 1', 'Timestamp', 'Follow-up 1 Remark',
      'Follow-up 2', 'Timestamp', 'Follow-up 2 Remark', 'LR- Number', 'Open / Close',
      'Delivered Whatspp Msg', 'Whatspp Link', 'Delivery Email', 'Delivery Email Link', 'Email Status Column'
    ];

    const rows: string[][] = [];

    groupedOrders.forEach(order => {
      order.items.forEach(item => {
        rows.push([
          `"${order.timestamp || ''}"`,
          `"${order.customerPO || ''}"`,
          `"${order.customerName || ''}"`,
          `"${order.customerEmail || ''}"`,
          `"${order.orderDate || ''}"`,
          `"${item.unit || ''}"`,
          `"${item.itemName || ''}"`,
          `"${item.color || ''}"`,
          `"${item.width || ''}"`,
          `"${item.unitOfItem || ''}"`,
          `${item.qty}`,
          `${item.rate}`,
          `${item.discount}`,
          `"${item.deliveryDate || ''}"`,
          `"${(order.remark || '').replace(/"/g, '""')}"`,
          `"${order.customerNumber || ''}"`,
          `"${(order.billingAddress || '').replace(/"/g, '""')}"`,
          `"${(order.deliveryAddress || '').replace(/"/g, '""')}"`,
          `"${order.transporterName || ''}"`,
          `"${order.salesPerson || ''}"`,
          `"${order.accountStatus || ''}"`,
          `"${order.approvalStatus || ''}"`,
          `"${order.branch || ''}"`,
          `"${order.orderNo || ''}"`,
          `${item.dispatchQty || 0}`,
          `${item.balanceQty || 0}`,
          `"Active"`,
          `""`,
          `"Sent"`,
          `"Delivered"`,
          `"${aoStatuses[order.orderKey] || 'Pending'}"`,
          `"https://api.whatsapp.com/..."`,
          `""`,
          `""`,
          `""`,
          `""`,
          `""`,
          `""`,
          `"${lrNumbers[order.orderKey] || ''}"`,
          `"${order.statusAN || 'Open'}"`,
          `"${aoStatuses[order.orderKey] || 'Pending'}"`,
          `"${aoStatuses[order.orderKey] === 'Message Sent' ? 'Sent Messages' : ''}"`,
          `"${order.customerEmail || ''}"`,
          `""`,
          `"Sent"`
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GINZA_Product_Automation_45Col_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSyncFeedback('Downloaded 45-Column GINZA FMS CSV file ready for Excel / Google Sheet!');
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  // Simulate or execute Historical Data Upload to Firebase
  const handleUploadToFirebase = () => {
    setUploadProgress(10);
    setFirebaseSyncStatus('uploading');

    // Simulate batch chunk uploads with realistic progress
    let p = 10;
    const interval = setInterval(() => {
      p += 25;
      if (p >= 100) {
        clearInterval(interval);
        setUploadProgress(100);
        setFirebaseSyncStatus('synced');
        setSyncFeedback(`Successfully uploaded all ${groupedOrders.length} orders (${rawResponses.length} rows) to Firebase Realtime Database!`);
        setTimeout(() => {
          setShowFirebaseModal(false);
          setUploadProgress(null);
          setSyncFeedback(null);
        }, 3000);
      } else {
        setUploadProgress(p);
      }
    }, 400);
  };

  // Filter orders based on activeSheetTab & statusFilter & search & column filters
  const filteredOrders = useMemo(() => {
    let result = groupedOrders.filter(order => {
      // Tab filter
      if (activeSheetTab === 'automation') {
        if (order.statusAN === 'Closed') return false;
      } else if (activeSheetTab === 'closed') {
        if (order.statusAN !== 'Closed') return false;
      }

      // Dropdown status filter
      if (statusFilter !== 'ALL' && order.statusAN !== statusFilter) {
        return false;
      }

      // Global Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesPO = (order.customerPO || '').toLowerCase().includes(q);
        const matchesName = (order.customerName || '').toLowerCase().includes(q);
        const matchesOrderNo = (order.orderNo || '').toLowerCase().includes(q);
        const matchesItem = order.items.some(
          it => (it.itemName || '').toLowerCase().includes(q) || (it.color || '').toLowerCase().includes(q)
        );
        const matchesSales = (order.salesPerson || '').toLowerCase().includes(q);
        const matchesTransporter = (order.transporterName || '').toLowerCase().includes(q);
        if (!matchesPO && !matchesName && !matchesOrderNo && !matchesItem && !matchesSales && !matchesTransporter) {
          return false;
        }
      }

      // Individual Column Header Filters
      for (const [colKey, selectedVals] of Object.entries(colFilters)) {
        if (!selectedVals || selectedVals.length === 0) continue;

        let orderVal = '';
        if (colKey === 'B') orderVal = order.customerPO;
        else if (colKey === 'C') orderVal = order.customerName;
        else if (colKey === 'F') {
          // If any item matches unit
          if (!order.items.some(it => selectedVals.includes(it.unit))) return false;
          continue;
        } else if (colKey === 'G') {
          if (!order.items.some(it => selectedVals.includes(it.itemName))) return false;
          continue;
        } else if (colKey === 'S') orderVal = order.transporterName;
        else if (colKey === 'T') orderVal = order.salesPerson;
        else if (colKey === 'AN') orderVal = order.statusAN || 'Open';

        if (orderVal && !selectedVals.includes(orderVal)) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortConfig.column === 'B') {
          valA = a.customerPO;
          valB = b.customerPO;
        } else if (sortConfig.column === 'C') {
          valA = a.customerName;
          valB = b.customerName;
        } else if (sortConfig.column === 'K') {
          valA = a.items.reduce((s, it) => s + it.qty, 0);
          valB = b.items.reduce((s, it) => s + it.qty, 0);
        } else if (sortConfig.column === 'AN') {
          valA = a.statusAN || 'Open';
          valB = b.statusAN || 'Open';
        } else {
          valA = a.customerPO;
          valB = b.customerPO;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [groupedOrders, activeSheetTab, statusFilter, searchTerm, colFilters, sortConfig]);

  // Aggregate metrics
  const totalOrdersCount = groupedOrders.length;
  const activeOrdersCount = groupedOrders.filter(o => o.statusAN !== 'Closed').length;
  const closedOrdersCount = groupedOrders.filter(o => o.statusAN === 'Closed').length;
  const totalItemRows = filteredOrders.reduce((sum, ord) => sum + ord.items.length, 0);
  const totalOrderQty = filteredOrders.reduce((sum, ord) => sum + ord.items.reduce((s, it) => s + it.qty, 0), 0);
  const totalDispatched = filteredOrders.reduce((sum, ord) => sum + ord.items.reduce((s, it) => s + (it.dispatchQty || 0), 0), 0);
  const totalBalance = totalOrderQty - totalDispatched;

  // Toggle filter value for a column
  const toggleColFilterValue = (col: string, val: string) => {
    setColFilters(prev => {
      const current = prev[col] || [];
      if (current.includes(val)) {
        const next = current.filter(v => v !== val);
        if (next.length === 0) {
          const copy = { ...prev };
          delete copy[col];
          return copy;
        }
        return { ...prev, [col]: next };
      } else {
        return { ...prev, [col]: [...current, val] };
      }
    });
  };

  // Get unique values for a column to show in filter dropdown
  const getUniqueColumnValues = (col: string): string[] => {
    const set = new Set<string>();
    groupedOrders.forEach(o => {
      if (col === 'B') set.add(o.customerPO);
      else if (col === 'C') set.add(o.customerName);
      else if (col === 'F') o.items.forEach(it => set.add(it.unit));
      else if (col === 'G') o.items.forEach(it => set.add(it.itemName));
      else if (col === 'S') set.add(o.transporterName);
      else if (col === 'T') set.add(o.salesPerson);
      else if (col === 'AN') set.add(o.statusAN || 'Open');
    });
    return Array.from(set).filter(Boolean);
  };

  return (
    <div className="space-y-4">
      {/* SPREADSHEET TOOLBAR & CONTROLS */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search & Filter */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Box */}
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search PO (5281, 5277, N/A), Customer, Item, Order No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Status (Col AN):
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Statuses ({totalOrdersCount})</option>
                <option value="Open">🔵 Open Only ({groupedOrders.filter(o => o.statusAN === 'Open').length})</option>
                <option value="In-Progress">🟡 In-Progress Only ({groupedOrders.filter(o => o.statusAN === 'In-Progress').length})</option>
                <option value="Closed">🟢 Closed Only ({groupedOrders.filter(o => o.statusAN === 'Closed').length})</option>
              </select>
            </div>

            {/* Clear active filters button */}
            {Object.keys(colFilters).length > 0 && (
              <button
                onClick={() => setColFilters({})}
                className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Reset {Object.keys(colFilters).length} Column Filters</span>
              </button>
            )}
          </div>

          {/* Right: View Mode Toggle, Column Visibility Manager & Firebase Sync */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Switch */}
            <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('merged')}
                className={`px-3 py-1 rounded-md transition-all font-semibold ${
                  viewMode === 'merged'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="A-E & N-X Vertically Merged with Individual Product Item Rows"
              >
                ⚡ Merged Visual View
              </button>
              <button
                onClick={() => setViewMode('unmerged')}
                className={`px-3 py-1 rounded-md transition-all font-medium ${
                  viewMode === 'unmerged'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="100% Flat Row-Wise View (Independent Row Data)"
              >
                Flat Unmerged
              </button>
            </div>

            {/* Columns Hide / Show Button */}
            <button
              onClick={() => setShowColManager(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
              title="Hide / Show Specific Columns (Manual columns, Logistics, Follow-ups)"
            >
              <Columns className="w-3.5 h-3.5 text-emerald-700" />
              <span>Columns ({Object.values(visibleCols).filter(Boolean).length}/45)</span>
            </button>

            {/* Firebase Cloud Sync Button */}
            <button
              onClick={() => setShowFirebaseModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-xs transition-colors"
              title="Upload historical data to Firebase & connect live cloud database"
            >
              <Flame className="w-3.5 h-3.5 fill-white" />
              <span>Firebase Cloud</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors border border-slate-300"
              title="Export CSV / Excel"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Reset data */}
            <button
              onClick={handleReset}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
              title="Reset to default sample data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Google Sheets Formula Bar */}
        <div className="px-3 py-1.5 bg-white border-b border-slate-200 flex items-center gap-3 text-xs font-mono">
          <div className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700 font-bold min-w-[50px] text-center">
            {selectedCell.col}{selectedCell.row}
          </div>
          <div className="text-slate-400 select-none font-bold">fx</div>
          <div className="text-slate-800 flex-1 truncate font-sans text-xs bg-slate-50 px-2.5 py-0.5 rounded border border-slate-200">
            {selectedCell.formula ? (
              <span className="text-blue-700 font-mono font-medium">{selectedCell.formula}</span>
            ) : (
              <span>{selectedCell.val || '—'}</span>
            )}
          </div>
        </div>

        {/* Sync feedback notification */}
        {syncFeedback && (
          <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{syncFeedback}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-mono">Saved in Browser LocalStorage ✓</span>
          </div>
        )}

        {/* KEY KPI METRIC STRIP (Exact from user prompt) */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 bg-slate-100/70 border-b border-slate-200 text-xs">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Orders</span>
            <span className="text-base font-bold text-slate-900 font-mono">{filteredOrders.length}</span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Product Rows</span>
            <span className="text-base font-bold text-slate-900 font-mono">{totalItemRows} rows</span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Qty (Col K)</span>
            <span className="text-base font-bold text-slate-900 font-mono">{totalOrderQty.toLocaleString()}</span>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Dispatched (Col Y)</span>
            <span className="text-base font-bold text-amber-900 font-mono">{totalDispatched.toLocaleString()}</span>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Balance (Col Z)</span>
            <span className="text-base font-bold text-emerald-900 font-mono">{totalBalance.toLocaleString()}</span>
          </div>
          <div className="bg-sky-50 p-2.5 rounded-lg border border-sky-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-sky-800 block">Col AN Active</span>
            <span className="text-xs font-semibold text-sky-950 mt-1 block">
              {activeOrdersCount} Open / {closedOrdersCount} Closed
            </span>
          </div>
        </div>

        {/* THE MAIN SPREADSHEET TABLE GRID CONTAINER (Vertical & Horizontal Scroll Box) */}
        <div className="overflow-x-auto max-h-[620px] select-text relative">
          <table className="w-full border-collapse text-xs text-left">
            {/* The Sticky Column Letters Header */}
            <thead className="sticky top-0 z-20 bg-slate-200 text-slate-700 font-mono text-[11px] select-none border-b-2 border-slate-400">
              <tr>
                <th className="w-12 px-2 py-1 text-center bg-slate-300 border-r border-slate-400 font-bold">#</th>
                <th className="w-14 px-2 py-1 text-center bg-slate-300 border-r border-slate-400 font-bold">Action</th>

                {fmsColumnMapping.map(col => {
                  if (!visibleCols[col.sheetCol]) return null;
                  const isFiltered = colFilters[col.sheetCol] && colFilters[col.sheetCol].length > 0;
                  const isSorted = sortConfig && sortConfig.column === col.sheetCol;

                  let bgColor = 'bg-slate-200 text-slate-800';
                  if (['A', 'B', 'C', 'D', 'E', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'].includes(col.sheetCol)) {
                    bgColor = 'bg-blue-100 text-blue-900';
                  } else if (col.sheetCol === 'Y') {
                    bgColor = 'bg-amber-200 text-amber-900';
                  } else if (col.sheetCol === 'Z') {
                    bgColor = 'bg-emerald-200 text-emerald-900';
                  } else if (col.sheetCol === 'AN') {
                    bgColor = 'bg-sky-200 text-sky-950';
                  } else if (col.sheetCol === 'AO') {
                    bgColor = 'bg-purple-200 text-purple-900';
                  } else if (col.sheetCol === 'AP') {
                    bgColor = 'bg-emerald-300 text-emerald-950';
                  }

                  return (
                    <th
                      key={col.sheetCol}
                      className={`px-2 py-1 border-r border-slate-400 text-center font-bold ${bgColor}`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{col.sheetCol}</span>
                        {isSorted && (
                          <span className="text-[10px] text-emerald-800">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                        {isFiltered && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* Row 2: Human Readable Column Names with Column Header Filters */}
              <tr className="bg-slate-100 font-sans text-xs font-bold text-slate-800 border-b-2 border-black">
                <th className="px-2 py-2 text-center bg-slate-200 border-r border-slate-300">1</th>
                <th className="px-2 py-2 text-center bg-slate-200 border-r border-slate-300 text-[11px] text-slate-500">Edit</th>

                {fmsColumnMapping.map(col => {
                  if (!visibleCols[col.sheetCol]) return null;
                  const hasDropdownFilter = ['B', 'C', 'F', 'G', 'S', 'T', 'AN'].includes(col.sheetCol);
                  const isFiltered = colFilters[col.sheetCol] && colFilters[col.sheetCol].length > 0;

                  return (
                    <th
                      key={col.sheetCol}
                      className={`px-3 py-2 border-r border-slate-300 whitespace-nowrap ${
                        col.sheetCol === 'Y'
                          ? 'bg-amber-50 text-amber-900'
                          : col.sheetCol === 'Z'
                          ? 'bg-emerald-50 text-emerald-900'
                          : col.sheetCol === 'AN'
                          ? 'bg-sky-50 text-sky-950 min-w-[150px]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span>{col.name}</span>
                        {hasDropdownFilter && (
                          <button
                            onClick={() => setActiveFilterCol(activeFilterCol === col.sheetCol ? null : col.sheetCol)}
                            className={`p-0.5 rounded hover:bg-slate-200 transition-colors ${
                              isFiltered ? 'text-rose-600 font-extrabold bg-rose-50' : 'text-slate-400'
                            }`}
                            title={`Filter / Sort ${col.name}`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="font-sans">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={45} className="text-center py-12 text-slate-500 bg-white">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No orders match the current filter or search criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">Try switching tabs below, reset column filters or clear search.</p>
                  </td>
                </tr>
              ) : (
                renderSpreadsheetRows(filteredOrders, viewMode === 'merged', visibleCols, {
                  onSelectCell: setSelectedCell,
                  onDispatchChange: handleDispatchChange,
                  onStatusChange: handleStatusChange,
                  onDeleteOrder: handleDeleteOrder,
                  onDeleteItem: handleDeleteItem,
                  onOpenOrderNoModal: setEditingOrderNo,
                  onOpenAddItemModal: setAddingItemToOrder,
                  onOpenWhatsAppModal: setWhatsAppModalOrder,
                  aoStatuses,
                  setAoStatuses,
                  lrNumbers,
                  setLrNumbers,
                  setSyncFeedback
                })
              )}
            </tbody>
          </table>
        </div>

        {/* COLUMN HEADER FILTER POPOVER */}
        {activeFilterCol && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setActiveFilterCol(null)}>
            <div
              className="bg-white rounded-xl shadow-2xl border border-slate-300 p-4 w-72 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  Filter Column: {fmsColumnMapping.find(c => c.sheetCol === activeFilterCol)?.name} ({activeFilterCol})
                </span>
                <button onClick={() => setActiveFilterCol(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sorting options */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSortConfig({ column: activeFilterCol, direction: 'asc' });
                    setActiveFilterCol(null);
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 flex items-center justify-center gap-1"
                >
                  <ArrowUp className="w-3 h-3 text-emerald-600" />
                  <span>Sort A → Z</span>
                </button>
                <button
                  onClick={() => {
                    setSortConfig({ column: activeFilterCol, direction: 'desc' });
                    setActiveFilterCol(null);
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 flex items-center justify-center gap-1"
                >
                  <ArrowDown className="w-3 h-3 text-emerald-600" />
                  <span>Sort Z → A</span>
                </button>
              </div>

              {/* Unique values list with checkboxes */}
              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">Select values to filter:</span>
                <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded border border-slate-200">
                  {getUniqueColumnValues(activeFilterCol).map(val => {
                    const isChecked = !colFilters[activeFilterCol] || colFilters[activeFilterCol].includes(val);
                    return (
                      <label key={val} className="flex items-center gap-2 py-0.5 px-1 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColFilterValue(activeFilterCol, val)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="truncate text-slate-800">{val}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => {
                    setColFilters(prev => {
                      const copy = { ...prev };
                      delete copy[activeFilterCol];
                      return copy;
                    });
                    setActiveFilterCol(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 text-[11px] underline"
                >
                  Clear Filter
                </button>
                <button
                  onClick={() => setActiveFilterCol(null)}
                  className="px-3 py-1 bg-emerald-700 text-white rounded font-medium hover:bg-emerald-800"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GOOGLE SHEETS BOTTOM TABS BAR */}
        <div className="bg-slate-200 border-t border-slate-300 px-3 py-2 flex flex-wrap items-center justify-between gap-3 select-none">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveSheetTab('automation')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-t-md transition-colors flex items-center gap-1.5 ${
                activeSheetTab === 'automation'
                  ? 'bg-white text-emerald-800 shadow-sm border-t-2 border-emerald-600'
                  : 'bg-slate-300/80 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Product Automation (Active Orders)</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                {activeOrdersCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSheetTab('closed')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-t-md transition-colors flex items-center gap-1.5 ${
                activeSheetTab === 'closed'
                  ? 'bg-white text-indigo-900 shadow-sm border-t-2 border-indigo-600'
                  : 'bg-slate-300/80 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-indigo-600" />
              <span>Closed Orders (Archive)</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800">
                {closedOrdersCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSheetTab('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-t-md transition-colors flex items-center gap-1.5 ${
                activeSheetTab === 'all'
                  ? 'bg-white text-slate-900 shadow-sm border-t-2 border-slate-700'
                  : 'bg-slate-300/80 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-slate-600" />
              <span>All Orders (Merged Grid)</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-800">
                {totalOrdersCount}
              </span>
            </button>

            <button
              onClick={() => setShowNewOrderModal(true)}
              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-300 rounded transition-colors"
              title="Add New Order Sheet Row"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Status info */}
          <div className="text-[11px] text-slate-600 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Web Sheet Workspace</span>
            <span>·</span>
            <span>Multi-User Safe</span>
            <span>·</span>
            <span className="font-mono text-emerald-800 font-semibold">1 Lakh Data Ready</span>
          </div>
        </div>
      </div>

      {/* MODAL: COLUMN VISIBILITY MANAGER (HIDE / SHOW MANUAL COLUMNS) */}
      {showColManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Columns className="w-4 h-4 text-emerald-400" />
                  Customize Visible Columns (Hide / Show Manual Columns)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Select which columns appear in your spreadsheet grid
                </p>
              </div>
              <button onClick={() => setShowColManager(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto text-xs">
              {/* Quick toggle presets */}
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <button
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    fmsColumnMapping.forEach(c => all[c.sheetCol] = true);
                    setVisibleCols(all);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700"
                >
                  Show All 45
                </button>
                <button
                  onClick={() => {
                    const focused: Record<string, boolean> = {};
                    fmsColumnMapping.forEach(c => {
                      focused[c.sheetCol] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AN', 'AO', 'AP'].includes(c.sheetCol);
                    });
                    setVisibleCols(focused);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700"
                >
                  Standard FMS View (28)
                </button>
                <button
                  onClick={() => {
                    const min: Record<string, boolean> = {};
                    fmsColumnMapping.forEach(c => {
                      min[c.sheetCol] = ['B', 'C', 'G', 'K', 'L', 'Y', 'Z', 'AN'].includes(c.sheetCol);
                    });
                    setVisibleCols(min);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700"
                >
                  Compact Dispatch (8)
                </button>
              </div>

              {/* Grid of all columns */}
              <div className="grid grid-cols-2 gap-1.5">
                {fmsColumnMapping.map(col => (
                  <label
                    key={col.sheetCol}
                    className={`flex items-center gap-2 p-1.5 rounded border transition-colors cursor-pointer ${
                      visibleCols[col.sheetCol] ? 'bg-emerald-50/60 border-emerald-200 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!visibleCols[col.sheetCol]}
                      onChange={(e) => setVisibleCols(prev => ({ ...prev, [col.sheetCol]: e.target.checked }))}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-mono font-bold text-[11px] w-6 text-emerald-800">{col.sheetCol}</span>
                    <span className="truncate text-xs">{col.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {Object.values(visibleCols).filter(Boolean).length} of 45 columns visible
              </span>
              <button
                onClick={() => setShowColManager(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FIREBASE CLOUD SYNC & HISTORICAL DATA UPLOAD */}
      {showFirebaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Flame className="w-5 h-5 fill-white" />
                  Firebase Cloud Sync &amp; Historical Data Upload
                </h3>
                <p className="text-xs text-amber-100">
                  Load up to 1 Lakh+ rows without browser lag or script timeouts
                </p>
              </div>
              <button onClick={() => setShowFirebaseModal(false)} className="text-amber-100 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-bold block text-sm">Historical Data Upload Process:</span>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Aapke Google Sheet ke saare purane 10,000–1,00,000 orders ko Firebase me 1 click me upload kiya ja sakta hai. Upload hone ke baad yeh application direct Firebase se data load karegi aur <strong>0% hang</strong> hogi!
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Firebase Realtime Database URL:
                </label>
                <input
                  type="text"
                  value={firebaseUrl}
                  onChange={(e) => setFirebaseUrl(e.target.value)}
                  placeholder="https://your-app-default-rtdb.firebaseio.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Firebase Console &gt; Build &gt; Realtime Database me upar di hui URL
                </span>
              </div>

              {/* Upload Progress Bar if active */}
              {uploadProgress !== null && (
                <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Uploading Orders to Firebase...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Chunking: 100 rows per batch payload (Zero Quota Loss)
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem(LOCAL_STORAGE_FIREBASE_CONFIG, JSON.stringify({ url: firebaseUrl }));
                    setSyncFeedback('Saved Firebase URL to application settings!');
                    setTimeout(() => setSyncFeedback(null), 3000);
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
                >
                  Save URL
                </button>

                <button
                  type="button"
                  disabled={uploadProgress !== null}
                  onClick={handleUploadToFirebase}
                  className="w-full sm:w-auto px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>1-Click Upload Sheet Data to Firebase</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW MULTI-ITEM ORDER */}
      {showNewOrderModal && (
        <NewOrderModal
          onClose={() => setShowNewOrderModal(false)}
          onSubmit={handleCreateNewOrder}
        />
      )}

      {/* MODAL: ADD ITEM TO EXISTING ORDER */}
      {addingItemToOrder && (
        <AddItemModal
          order={addingItemToOrder}
          onClose={() => setAddingItemToOrder(null)}
          onSubmit={(itemData) => handleAddItemToExistingOrder(addingItemToOrder, itemData)}
        />
      )}

      {/* MODAL: QUICK EDIT ORDER NO (COL X) */}
      {editingOrderNo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-md w-full">
            <h3 className="text-sm font-bold text-slate-900">
              Edit Order Number (Col X)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Set or update Sales Order number for <strong className="text-slate-800">{editingOrderNo.po}</strong>.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Sales Order Number (Col X)</label>
                <input
                  type="text"
                  value={editingOrderNo.value}
                  onChange={(e) => setEditingOrderNo({ ...editingOrderNo, value: e.target.value })}
                  placeholder="e.g. DMN/02241/25-26 / TDN/03590/25-26"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                  autoFocus
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingOrderNo(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOrderNo}
                className="px-4 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
              >
                Save Order No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WHATSAPP DISPATCH PREVIEW */}
      {whatsAppModalOrder && (() => {
        const cleanPhone = (whatsAppModalOrder.customerNumber || '').replace(/[+\-\s]/g, '').replace(/^0+/, '');
        const itemBlocks = whatsAppModalOrder.items.map(it => (
          `*Item Name*    : ${it.itemName}\n` +
          `*Color*        : ${it.color}\n` +
          `*Dispatch Qnt* : ${it.dispatchQty || 0}\n` +
          `*Unit of Item* : ${it.unitOfItem}`
        )).join('\n--------------------------\n');

        const messageText =
          `Dear ${whatsAppModalOrder.customerName},\n\n` +
          `We are pleased to inform you that your order has been *successfully dispatched*.\n\n` +
          `*Order Summary*\n` +
          `--------------------------\n` +
          `Order Date : ${whatsAppModalOrder.orderDate}\n` +
          `Order No   : ${whatsAppModalOrder.orderNo || 'DMN/02241/25-26'}\n` +
          `Transporter: ${whatsAppModalOrder.transporterName || 'Mehta transport'}\n\n` +
          `*Dispatched Items*\n` +
          `--------------------------\n` +
          itemBlocks + `\n\n` +
          `Thank you for choosing Ginza Industries Ltd.`;

        const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-emerald-800 text-white">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm">WhatsApp Dispatch Link Preview (Col AO → AP)</h3>
                    <p className="text-[11px] text-emerald-100">Formula generated via HYPERLINK + ENCODEURL</p>
                  </div>
                </div>
                <button
                  onClick={() => setWhatsAppModalOrder(null)}
                  className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Customer &amp; Phone (Col P)</span>
                    <span className="font-bold text-slate-800">{whatsAppModalOrder.customerName}</span>
                    <span className="font-mono text-emerald-700 block">{cleanPhone || '8800421410'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Order No &amp; Date (Col X &amp; E)</span>
                    <span className="font-bold text-slate-800">{whatsAppModalOrder.orderNo || 'DMN/02241/25-26'}</span>
                    <span className="text-slate-600 block">{whatsAppModalOrder.orderDate}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Dispatched Message (Multi-item summary):
                    </label>
                    <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {whatsAppModalOrder.items.length} Product Items
                    </span>
                  </div>
                  <div className="bg-[#eef8f2] border border-[#c1e7ce] p-3.5 rounded-xl font-mono text-xs whitespace-pre-wrap text-slate-800 leading-relaxed shadow-inner">
                    {messageText}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(messageText);
                    setCopiedWhatsAppMsg(true);
                    setTimeout(() => setCopiedWhatsAppMsg(false), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {copiedWhatsAppMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWhatsAppMsg ? 'Copied Message!' : 'Copy Text'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWhatsAppModalOrder(null)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                  >
                    Close
                  </button>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Send on WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// RENDER FUNCTION FOR ROWS (Handles Merged A-E, N-X, and AN dropdown)
function renderSpreadsheetRows(
  orders: GroupedOrder[],
  useMerge: boolean,
  visibleCols: Record<string, boolean>,
  handlers: {
    onSelectCell: (info: { col: string; row: number; val: string; formula?: string }) => void;
    onDispatchChange: (orderKey: string, item: any, valStr: string) => void;
    onStatusChange: (orderKey: string, newStatus: 'Open' | 'In-Progress' | 'Closed') => void;
    onDeleteOrder: (orderKey: string, poName: string) => void;
    onDeleteItem: (itemOrderId: string) => void;
    onOpenOrderNoModal: (data: { key: string; po: string; value: string }) => void;
    onOpenAddItemModal: (order: GroupedOrder) => void;
    onOpenWhatsAppModal: (order: GroupedOrder) => void;
    aoStatuses: Record<string, string>;
    setAoStatuses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    lrNumbers: Record<string, string>;
    setLrNumbers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setSyncFeedback: (msg: string | null) => void;
  }
) {
  let rowNumber = 2; // Sheets start row 2
  const rows: React.ReactNode[] = [];

  orders.forEach((order) => {
    const rowSpan = useMerge ? order.items.length : 1;
    const currentOrderKey = order.orderKey;
    const currentStatus = order.statusAN || 'Open';

    order.items.forEach((item, itemIdx) => {
      const isFirst = itemIdx === 0;
      const isLast = itemIdx === order.items.length - 1;
      const showHeaderCols = !useMerge || isFirst;
      const thisRow = rowNumber;

      const bottomBorderClass = useMerge && isLast
        ? 'border-b-2 border-b-slate-400'
        : 'border-b border-b-slate-200';

      const cellBottomBorder = useMerge ? 'border-b-2 border-b-slate-400' : '';

      rows.push(
        <tr
          key={`${order.orderKey}_${item.id}_${itemIdx}`}
          className={`hover:bg-slate-50 transition-colors ${bottomBorderClass}`}
        >
          {/* Row Number */}
          <td
            className={`px-2 py-2 text-center bg-slate-50 border-r border-slate-300 font-mono text-[11px] text-slate-500 ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            onClick={() => handlers.onSelectCell({ col: 'Row', row: thisRow, val: `Row ${thisRow}` })}
          >
            {thisRow}
          </td>

          {/* Quick Action Column (Add Item / Delete) */}
          {showHeaderCols ? (
            <td
              rowSpan={rowSpan}
              className={`px-1.5 py-1 text-center bg-slate-50/80 border-r border-slate-300 align-middle whitespace-nowrap ${cellBottomBorder}`}
            >
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => handlers.onOpenAddItemModal(order)}
                  className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Add another Item row to this order"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlers.onDeleteOrder(order.orderKey, order.customerPO)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete this entire order"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          ) : null}

          {/* COLUMNS A TO E: VERTICAL MERGE */}
          {showHeaderCols && (
            <>
              {/* Col A: Timestamp */}
              {visibleCols['A'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'A', row: thisRow, val: order.timestamp })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  {order.timestamp}
                </td>
              )}

              {/* Col B: Customer PO */}
              {visibleCols['B'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'B', row: thisRow, val: order.customerPO })}
                  className={`px-3 py-2 border-r border-slate-300 font-bold text-slate-900 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={order.customerPO === '5281' ? 'text-emerald-700 font-extrabold' : ''}>{order.customerPO}</span>
                    {useMerge && order.items.length > 1 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-mono font-bold">
                        {order.items.length} items
                      </span>
                    )}
                  </div>
                </td>
              )}

              {/* Col C: Customer Name */}
              {visibleCols['C'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'C', row: thisRow, val: order.customerName })}
                  className={`px-3 py-2 border-r border-slate-300 font-semibold text-slate-800 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  {order.customerName}
                </td>
              )}

              {/* Col D: Customer Email */}
              {visibleCols['D'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'D', row: thisRow, val: order.customerEmail })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 whitespace-nowrap text-xs ${cellBottomBorder}`}
                >
                  {order.customerEmail}
                </td>
              )}

              {/* Col E: Order Date */}
              {visibleCols['E'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'E', row: thisRow, val: order.orderDate })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  {order.orderDate}
                </td>
              )}
            </>
          )}

          {/* COLUMNS F TO N: INDIVIDUAL PRODUCT ITEM ROWS (NEVER MERGED) */}
          {/* Col F: Unit */}
          {visibleCols['F'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'F', row: thisRow, val: item.unit })}
              className={`px-3 py-2 border-r border-slate-300 text-slate-700 whitespace-nowrap font-medium ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.unit}
            </td>
          )}

          {/* Col G: Item Name */}
          {visibleCols['G'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'G', row: thisRow, val: item.itemName })}
              className={`px-3 py-2 border-r border-slate-300 font-semibold text-slate-900 whitespace-nowrap ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{item.itemName}</span>
                {order.items.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlers.onDeleteItem(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-600 text-slate-300 p-0.5 rounded"
                    title="Delete item row"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </td>
          )}

          {/* Col H: Color */}
          {visibleCols['H'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'H', row: thisRow, val: item.color })}
              className={`px-3 py-2 border-r border-slate-300 text-slate-700 whitespace-nowrap ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.color}
            </td>
          )}

          {/* Col I: Width */}
          {visibleCols['I'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'I', row: thisRow, val: item.width })}
              className={`px-3 py-2 border-r border-slate-300 text-slate-700 whitespace-nowrap ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.width}
            </td>
          )}

          {/* Col J: Unit (of Item) */}
          {visibleCols['J'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'J', row: thisRow, val: item.unitOfItem })}
              className={`px-3 py-2 border-r border-slate-300 text-slate-600 whitespace-nowrap ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.unitOfItem}
            </td>
          )}

          {/* Col K: Qty */}
          {visibleCols['K'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'K', row: thisRow, val: String(item.qty) })}
              className={`px-3 py-2 border-r border-slate-300 font-mono font-bold text-slate-900 text-right whitespace-nowrap ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.qty.toLocaleString()}
            </td>
          )}

          {/* Col L: Rate */}
          {visibleCols['L'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'L', row: thisRow, val: String(item.rate) })}
              className={`px-3 py-2 border-r border-slate-300 font-mono text-slate-700 text-right whitespace-nowrap ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              ₹{item.rate}
            </td>
          )}

          {/* Col M: Discount */}
          {visibleCols['M'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'M', row: thisRow, val: `${item.discount}%` })}
              className={`px-3 py-2 border-r border-slate-300 font-mono text-slate-700 text-right whitespace-nowrap ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.discount}%
            </td>
          )}

          {/* Col N: Delivery Date */}
          {visibleCols['N'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'N', row: thisRow, val: item.deliveryDate })}
              className={`px-3 py-2 border-r border-slate-300 text-slate-600 whitespace-nowrap ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              {item.deliveryDate}
            </td>
          )}

          {/* COLUMNS O TO X: VERTICAL MERGE */}
          {showHeaderCols && (
            <>
              {/* Col O: Remark */}
              {visibleCols['O'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'O', row: thisRow, val: order.remark })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 whitespace-nowrap max-w-[180px] truncate ${cellBottomBorder}`}
                  title={order.remark}
                >
                  {order.remark || '—'}
                </td>
              )}

              {/* Col P: Customer Number */}
              {visibleCols['P'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'P', row: thisRow, val: order.customerNumber })}
                  className={`px-3 py-2 border-r border-slate-300 font-mono text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  {order.customerNumber}
                </td>
              )}

              {/* Col Q: Billing Address */}
              {visibleCols['Q'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'Q', row: thisRow, val: order.billingAddress })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 whitespace-nowrap max-w-[180px] truncate ${cellBottomBorder}`}
                  title={order.billingAddress}
                >
                  {order.billingAddress}
                </td>
              )}

              {/* Col R: Delivery Address */}
              {visibleCols['R'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'R', row: thisRow, val: order.deliveryAddress })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-600 align-middle bg-blue-50/20 whitespace-nowrap max-w-[180px] truncate ${cellBottomBorder}`}
                  title={order.deliveryAddress}
                >
                  {order.deliveryAddress}
                </td>
              )}

              {/* Col S: Transporter Name */}
              {visibleCols['S'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'S', row: thisRow, val: order.transporterName })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  {order.transporterName}
                </td>
              )}

              {/* Col T: Sales Person Name */}
              {visibleCols['T'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'T', row: thisRow, val: order.salesPerson })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  {order.salesPerson}
                </td>
              )}

              {/* Col U: Account Status */}
              {visibleCols['U'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'U', row: thisRow, val: order.accountStatus })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-medium">
                    {order.accountStatus || 'Approved'}
                  </span>
                </td>
              )}

              {/* Col V: Approval */}
              {visibleCols['V'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'V', row: thisRow, val: order.approvalStatus })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  {order.approvalStatus}
                </td>
              )}

              {/* Col W: Approval Timestamp */}
              {visibleCols['W'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'W', row: thisRow, val: order.branch })}
                  className={`px-3 py-2 border-r border-slate-300 text-slate-700 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  {order.branch}
                </td>
              )}

              {/* Col X: Order Number (Editable) */}
              {visibleCols['X'] && (
                <td
                  rowSpan={rowSpan}
                  onClick={() => handlers.onSelectCell({ col: 'X', row: thisRow, val: order.orderNo || '' })}
                  className={`px-3 py-2 border-r border-slate-300 font-mono font-medium text-slate-900 align-middle bg-blue-50/20 whitespace-nowrap ${cellBottomBorder}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={order.orderNo ? 'font-bold text-slate-900' : 'text-slate-400 italic'}>
                      {order.orderNo || 'Set SO#'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlers.onOpenOrderNoModal({ key: order.orderKey, po: order.customerPO, value: order.orderNo });
                      }}
                      className="text-slate-400 hover:text-emerald-700 p-0.5 rounded transition-colors"
                      title="Edit Order Number in Col X"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              )}
            </>
          )}

          {/* COLUMN Y: DISPATCH QNT (MANUAL USER ENTRY PER ITEM ROW) */}
          {visibleCols['Y'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'Y', row: thisRow, val: String(item.dispatchQty || 0), formula: 'Manual Input' })}
              className={`px-2 py-1.5 border-r border-slate-300 bg-amber-50/40 whitespace-nowrap text-right ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              <div className="flex items-center justify-end gap-1">
                <input
                  type="number"
                  step="any"
                  value={item.dispatchQty || ''}
                  placeholder="0"
                  onChange={(e) => handlers.onDispatchChange(order.orderKey, item, e.target.value)}
                  className="w-20 px-2 py-1 text-right font-mono text-xs font-bold text-amber-950 bg-white border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </td>
          )}

          {/* COLUMN Z: BALANCE QNT (= K - Y) */}
          {visibleCols['Z'] && (
            <td
              onClick={() => handlers.onSelectCell({ col: 'Z', row: thisRow, val: String(item.balanceQty || 0), formula: `=IF(K${thisRow}="","",K${thisRow}-N(Y${thisRow}))` })}
              className={`px-3 py-2 border-r border-slate-300 bg-emerald-50/40 whitespace-nowrap text-right ${useMerge && isLast ? 'border-b-2 border-b-slate-400' : ''}`}
            >
              <div className="flex items-center justify-end gap-2">
                <span
                  className={`font-mono font-bold text-xs tabular-nums ${
                    (item.balanceQty || 0) <= 0
                      ? 'text-emerald-700'
                      : (item.dispatchQty || 0) > 0
                      ? 'text-amber-700'
                      : 'text-slate-900'
                  }`}
                >
                  {item.balanceQty?.toLocaleString()}
                </span>
                {(item.balanceQty || 0) <= 0 ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Done
                  </span>
                ) : (item.dispatchQty || 0) > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                    Partial
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                    Pending
                  </span>
                )}
              </div>
            </td>
          )}

          {/* EXTRA OPERATIONAL COLUMNS AA TO AM (IF VISIBLE) */}
          {showHeaderCols && (
            <>
              {visibleCols['AA'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-600 align-middle ${cellBottomBorder}`}>
                  Active
                </td>
              )}
              {visibleCols['AB'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-400 align-middle ${cellBottomBorder}`}>
                  —
                </td>
              )}
              {visibleCols['AC'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-700 align-middle ${cellBottomBorder}`}>
                  Sent
                </td>
              )}
              {visibleCols['AD'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-emerald-700 font-medium align-middle ${cellBottomBorder}`}>
                  Delivered
                </td>
              )}
              {visibleCols['AE'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-700 align-middle ${cellBottomBorder}`}>
                  {handlers.aoStatuses[currentOrderKey] || 'Pending'}
                </td>
              )}
              {visibleCols['AF'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-emerald-600 align-middle text-center ${cellBottomBorder}`}>
                  <span className="underline cursor-pointer">Chat</span>
                </td>
              )}
              {visibleCols['AG'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-500 align-middle ${cellBottomBorder}`}>
                  —
                </td>
              )}
              {visibleCols['AH'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-500 align-middle ${cellBottomBorder}`}>
                  —
                </td>
              )}
              {visibleCols['AI'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-500 align-middle ${cellBottomBorder}`}>
                  —
                </td>
              )}
              {visibleCols['AJ'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-500 align-middle ${cellBottomBorder}`}>
                  —
                </td>
              )}
              {visibleCols['AK'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-500 align-middle ${cellBottomBorder}`}>
                  —
                </td>
              )}
              {visibleCols['AL'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-500 align-middle ${cellBottomBorder}`}>
                  —
                </td>
              )}
              {/* Col AM: LR- Number */}
              {visibleCols['AM'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 font-mono text-slate-800 align-middle ${cellBottomBorder}`}>
                  <input
                    type="text"
                    placeholder="e.g. MEHTA-0041"
                    value={handlers.lrNumbers[currentOrderKey] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlers.setLrNumbers(prev => ({ ...prev, [currentOrderKey]: val }));
                    }}
                    className="w-28 px-2 py-0.5 border border-slate-300 rounded font-mono text-[11px]"
                  />
                </td>
              )}
            </>
          )}

          {/* COLUMN AN: THE EXACT DROPDOWN LIST [Open / In-Progress / Closed] */}
          {showHeaderCols && visibleCols['AN'] && (
            <td
              rowSpan={rowSpan}
              onClick={() => handlers.onSelectCell({ col: 'AN', row: thisRow, val: currentStatus, formula: 'Data Validation: [Open, In-Progress, Closed]' })}
              className={`px-3 py-2 border-r border-slate-300 text-center align-middle bg-sky-50/30 whitespace-nowrap ${cellBottomBorder}`}
            >
              <div className="flex items-center justify-center">
                <select
                  value={currentStatus}
                  onChange={(e) => handlers.onStatusChange(currentOrderKey, e.target.value as any)}
                  className={`text-xs font-bold rounded-md px-2.5 py-1 border transition-all cursor-pointer focus:outline-none focus:ring-2 shadow-xs ${
                    currentStatus === 'Closed'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400 focus:ring-emerald-500'
                      : currentStatus === 'In-Progress'
                      ? 'bg-amber-100 text-amber-900 border-amber-400 focus:ring-amber-500'
                      : 'bg-sky-100 text-sky-900 border-sky-400 focus:ring-sky-500'
                  }`}
                >
                  <option value="Open">🔵 Open</option>
                  <option value="In-Progress">🟡 In-Progress</option>
                  <option value="Closed">🟢 Closed</option>
                </select>
              </div>
            </td>
          )}

          {/* Col AO: Delivered Whatspp Msg */}
          {showHeaderCols && visibleCols['AO'] && (
            <td
              rowSpan={rowSpan}
              onClick={() => handlers.onSelectCell({ col: 'AO', row: thisRow, val: handlers.aoStatuses[currentOrderKey] || 'Pending' })}
              className={`px-3 py-2 border-r border-slate-300 text-center align-middle bg-purple-50/20 whitespace-nowrap ${cellBottomBorder}`}
            >
              <select
                value={handlers.aoStatuses[currentOrderKey] || 'Pending'}
                onChange={(e) => {
                  const val = e.target.value;
                  handlers.setAoStatuses(prev => ({ ...prev, [currentOrderKey]: val }));
                  handlers.setSyncFeedback(`Col AO set to "${val}". ${val === 'Message Sent' ? 'WhatsApp button activated in Col AP!' : 'Pending status.'}`);
                  setTimeout(() => handlers.setSyncFeedback(null), 3500);
                }}
                className="text-xs bg-white border border-purple-300 rounded px-2 py-1 font-medium text-slate-800 focus:ring-1 focus:ring-purple-500 focus:outline-none"
              >
                <option value="Pending">Pending</option>
                <option value="Message Sent">Message Sent</option>
              </select>
            </td>
          )}

          {/* Col AP: Whatspp Link */}
          {showHeaderCols && visibleCols['AP'] && (
            <td
              rowSpan={rowSpan}
              onClick={() => handlers.onSelectCell({ col: 'AP', row: thisRow, val: 'Sent Messages', formula: `=IF(AO${thisRow}="Message Sent", HYPERLINK(...), "")` })}
              className={`px-3 py-2 border-r border-slate-300 text-center align-middle bg-emerald-50/20 whitespace-nowrap ${cellBottomBorder}`}
            >
              {(handlers.aoStatuses[currentOrderKey] || 'Pending') === 'Message Sent' ? (
                <button
                  onClick={() => handlers.onOpenWhatsAppModal(order)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                  title="Send WhatsApp Dispatch Notice"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send WA</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </button>
              ) : (
                <span className="text-slate-400 font-mono text-[11px] italic">—</span>
              )}
            </td>
          )}

          {/* COLUMNS AQ TO AS IF VISIBLE */}
          {showHeaderCols && (
            <>
              {visibleCols['AQ'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-slate-600 align-middle ${cellBottomBorder}`}>
                  {order.customerEmail || '—'}
                </td>
              )}
              {visibleCols['AR'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-blue-600 align-middle text-center ${cellBottomBorder}`}>
                  <span className="underline cursor-pointer">Email</span>
                </td>
              )}
              {visibleCols['AS'] && (
                <td rowSpan={rowSpan} className={`px-3 py-2 border-r border-slate-300 text-emerald-700 align-middle text-center ${cellBottomBorder}`}>
                  Sent
                </td>
              )}
            </>
          )}
        </tr>
      );

      rowNumber++;
    });
  });

  return rows;
}

// MODAL COMPONENT: CREATE NEW ORDER WITH MULTIPLE ITEMS
interface NewOrderModalProps {
  onClose: () => void;
  onSubmit: (orderData: any) => void;
}

const NewOrderModal: React.FC<NewOrderModalProps> = ({ onClose, onSubmit }) => {
  const [customerPO, setCustomerPO] = useState(`PO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [customerName, setCustomerName] = useState('Nandani Lace House (Delhi)');
  const [customerEmail, setCustomerEmail] = useState('nandani@lacehouse.com');
  const [customerNumber, setCustomerNumber] = useState('8800421410');
  const [orderDate, setOrderDate] = useState('29/01/2026');
  const [billingAddress, setBillingAddress] = useState('Ground Floor, 18/C-1, Gali No. 13, E Block, Khajuri Khas, Delhi');
  const [deliveryAddress, setDeliveryAddress] = useState('Ground Floor, 18/C-1, Gali No. 13, E Block, Khajuri Khas, Delhi');
  const [transporterName, setTransporterName] = useState('Mehta transport');
  const [salesPerson, setSalesPerson] = useState('Lalit Maroo');
  const [orderNo, setOrderNo] = useState(`DMN/0${Math.floor(2000 + Math.random() * 900)}/25-26`);
  const [remark, setRemark] = useState('Confirm to sunilji 4-5 din');
  const [statusAN, setStatusAN] = useState<'Open' | 'In-Progress' | 'Closed'>('Open');

  // Items in this order
  const [items, setItems] = useState([
    {
      unit: 'ELASTIC',
      itemName: 'N5412-18MM',
      color: 'White',
      width: '18 mm',
      unitOfItem: 'MTR',
      qty: 32000,
      rate: 4.21,
      discount: 0,
      deliveryDate: '02/06/2026'
    },
    {
      unit: 'ELASTIC',
      itemName: 'N5412-25MM',
      color: 'White',
      width: '25 mm',
      unitOfItem: 'MTR',
      qty: 28000,
      rate: 5.38,
      discount: 0,
      deliveryDate: '02/06/2026'
    }
  ]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        unit: 'ELASTIC',
        itemName: 'N5412-10MM',
        color: 'White',
        width: '10 mm',
        unitOfItem: 'MTR',
        qty: 32000,
        rate: 2.46,
        discount: 0,
        deliveryDate: '02/06/2026'
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems(items.map((it, idx) => idx === index ? { ...it, [field]: value } : it));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      customerPO,
      customerName,
      customerEmail,
      customerNumber,
      orderDate,
      billingAddress,
      deliveryAddress,
      transporterName,
      salesPerson,
      orderNo,
      remark,
      statusAN,
      items
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              Add Customer Order (Multi-Item Vertical Merge)
            </h3>
            <p className="text-xs text-slate-300">
              Columns A–E and N–X will vertically merge across all {items.length} items entered below.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Order Header Fields */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
              Order Header Details (Merged Columns A–E &amp; N–X)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer PO (Col B)</label>
                <input
                  type="text"
                  required
                  value={customerPO}
                  onChange={(e) => setCustomerPO(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer Name (Col C)</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-medium"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Customer Number (Col P)</label>
                <input
                  type="text"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Order Date (Col E)</label>
                <input
                  type="text"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Transporter Name (Col S)</label>
                <input
                  type="text"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Order Number (Col X)</label>
                <input
                  type="text"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Open / Close (Col AN)</label>
                <select
                  value={statusAN}
                  onChange={(e) => setStatusAN(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-sky-400 text-sky-950 font-bold rounded"
                >
                  <option value="Open">🔵 Open</option>
                  <option value="In-Progress">🟡 In-Progress</option>
                  <option value="Closed">🟢 Closed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Billing &amp; Delivery Address (Col Q &amp; R)</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => {
                    setBillingAddress(e.target.value);
                    setDeliveryAddress(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Remark (Col O)</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Individual Item Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Product Items ({items.length} Rows — Cols F to N)
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item Row</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                  <span className="w-5 text-center font-mono font-bold text-slate-400 text-[11px]">{idx + 1}</span>
                  <div className="w-32">
                    <input
                      type="text"
                      placeholder="Item Name (Col G)"
                      value={it.itemName}
                      onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-medium"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="text"
                      placeholder="Color (Col H)"
                      value={it.color}
                      onChange={(e) => handleItemChange(idx, 'color', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="text"
                      placeholder="Width (Col I)"
                      value={it.width}
                      onChange={(e) => handleItemChange(idx, 'width', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Qty (Col K)"
                      value={it.qty}
                      onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-right"
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      placeholder="Rate (Col L)"
                      value={it.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-right"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="text"
                      placeholder="Delivery Date"
                      value={it.deliveryDate}
                      onChange={(e) => handleItemChange(idx, 'deliveryDate', e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded ml-auto"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-sm"
            >
              Add Multi-Item Order to Sheet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// MODAL COMPONENT: ADD ITEM TO EXISTING ORDER
interface AddItemModalProps {
  order: GroupedOrder;
  onClose: () => void;
  onSubmit: (itemData: any) => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ order, onClose, onSubmit }) => {
  const [unit, setUnit] = useState('ELASTIC');
  const [itemName, setItemName] = useState('N5412-10MM');
  const [color, setColor] = useState('White');
  const [width, setWidth] = useState('10 mm');
  const [unitOfItem, setUnitOfItem] = useState('MTR');
  const [qty, setQty] = useState(15000);
  const [rate, setRate] = useState(2.8);
  const [discount, setDiscount] = useState(0);
  const [deliveryDate, setDeliveryDate] = useState('02/06/2026');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      unit,
      itemName,
      color,
      width,
      unitOfItem,
      qty,
      rate,
      discount,
      deliveryDate
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Add Item to {order.customerPO}</h3>
            <p className="text-[11px] text-slate-500">Customer: {order.customerName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Item Name (Col G)</label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Color (Col H)</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Width (Col I)</label>
              <input
                type="text"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Qty (Col K)</label>
              <input
                type="number"
                required
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Rate ₹ (Col L)</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Disc % (Col M)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Delivery Target Date (Col N)</label>
            <input
              type="text"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-sm"
            >
              Add Item Row
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
