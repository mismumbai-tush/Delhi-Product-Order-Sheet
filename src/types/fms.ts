export interface OrderItem {
  id: string;
  unit: string;          // Col D (4)
  itemName: string;      // Col E (5)
  color: string;         // Col F (6)
  width: string;         // Col G (7)
  unitOfItem: string;    // Col H (8)
  qty: number;           // Col I (9) - Total Order Qty
  rate: number;          // Col J (10)
  discount: number;      // Col K (11)
  deliveryDate: string;  // Col L (12)
  dispatchQty?: number;  // Col U (21) - Manual user entry
  balanceQty?: number;   // Col V (22) - I - U
  statusAN?: 'Open' | 'In-Progress' | 'Closed'; // Col AM (39) / Col W (23)
}

export interface ProductOrderRow {
  orderId: string;
  referenceNo?: string;        // Optional Reference
  timestamp: string;          // Col A (1): Timestamp
  customerName: string;       // Col B (2): Customer Name
  customerPO?: string;        // Customer PO (if any)
  customerEmail?: string;     // Col T (20): Customer Mail Id
  customerMailId?: string;    // Col T (20): Customer Mail Id
  orderDate: string;          // Col C (3): Order Date
  unit: string;               // Col D (4): Unit
  itemName: string;           // Col E (5): Item Name
  color: string;              // Col F (6): Color
  width: string;              // Col G (7): Width
  unitOfItem: string;         // Col H (8): Unit (of item)
  qty: number;                // Col I (9): Qty
  rate: number;               // Col J (10): Rate
  discount: number;           // Col K (11): Discount
  deliveryDate: string;       // Col L (12): Delivery Date
  remark: string;             // Col M (13): Remark
  customerNumber: string;     // Col N (14): Customer Number
  billingAddress: string;     // Col O (15): Billing Address
  deliveryAddress: string;    // Col P (16): Delivery Address
  salesPerson: string;        // Col Q (17): Sales Person Name
  salesPersonContact?: string;// Col R (18): Sales Person Contact
  orderNo?: string;           // Col S (19): Order Number / Order No
  orderNoTimestamp?: string;  // Col Z (26): Timestamp
  accountStatus?: string;     // Col W (23): Status / Account
  branch?: string;            // Branch
  approvalStatus?: string;    // Col Y (25): Approval
  branchHeadName?: string;
  branchHeadEmail?: string;
  transporterName?: string;   // Col AK (37): Transport Name
  lrNumber?: string;          // Col AL (38): LR- Number
  statusAN?: 'Open' | 'In-Progress' | 'Closed'; // Col AM (39): Open / Close
  dispatchQty?: number;       // Col U (21): Dispatch Qnt
  balanceQty?: number;        // Col V (22): Balance Qnt
}

export interface GroupedOrder {
  orderKey: string;
  referenceNo?: string;
  timestamp: string;
  customerPO?: string;
  customerName: string;
  customerEmail?: string;
  customerMailId?: string;
  orderDate: string;
  items: OrderItem[];
  remark: string;
  customerNumber: string;
  billingAddress: string;
  deliveryAddress: string;
  transporterName?: string;
  lrNumber?: string;
  salesPerson: string;
  salesPersonContact?: string;
  accountStatus?: string;
  branch?: string;
  approvalStatus?: string;
  branchHeadName?: string;
  branchHeadEmail?: string;
  orderNo: string;
  orderNoTimestamp?: string;
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
