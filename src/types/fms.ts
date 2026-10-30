export interface OrderItem {
  id: string;
  unit: string;          // Col F (6)
  itemName: string;      // Col G (7)
  color: string;         // Col H (8)
  width: string;         // Col I (9)
  unitOfItem: string;    // Col J (10)
  qty: number;           // Col K (11) - Total Order Qty
  rate: number;          // Col L (12)
  discount: number;      // Col M (13)
  deliveryDate: string;  // Col N (14)
  dispatchQty?: number;  // Col Y (25) - Manual user entry
  balanceQty?: number;   // Col Z (26) - K - Y
  statusAN?: 'Open' | 'In-Progress' | 'Closed'; // Col AN (40) - Status Dropdown
}

export interface ProductOrderRow {
  orderId: string;
  timestamp: string;
  customerPO: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  unit: string;
  itemName: string;
  color: string;
  width: string;
  unitOfItem: string;
  qty: number;
  rate: number;
  discount: number;
  deliveryDate: string;
  remark: string;
  customerNumber: string;
  billingAddress: string;
  deliveryAddress: string;
  transporterName: string;
  salesPerson: string;
  accountStatus: string;
  branch: string;
  approvalStatus: string;
  branchHeadName: string;
  orderNo?: string;      // Col AA (27 in sheet, index 26)
  statusAN?: 'Open' | 'In-Progress' | 'Closed'; // Col AN (40)
}

export interface GroupedOrder {
  orderKey: string;
  timestamp: string;
  customerPO: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  items: OrderItem[];
  remark: string;
  customerNumber: string;
  billingAddress: string;
  deliveryAddress: string;
  transporterName: string;
  salesPerson: string;
  accountStatus: string;
  branch: string;
  approvalStatus: string;
  orderNo: string;
  statusAN?: 'Open' | 'In-Progress' | 'Closed';
}

export interface ColumnMapItem {
  sheetCol: string;       // e.g. "A", "F", "K", "Y", "Z"
  colIndex1Based: number; // 1 to 26
  arrayIndex0Based: number;
  name: string;
  category: 'header-merge' | 'item-row' | 'dispatch-balance';
  description: string;
  example: string;
}
