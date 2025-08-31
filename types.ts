
export interface ReceiptItem {
  name: string;
  quantity: number | null;
  price: number;
}

export interface Receipt {
  merchant: string | null;
  date: string | null; // YYYY-MM-DD
  total_amount: number | null;
  location: string | null;
  card_number: string | null; // Last 4 digits
  items: ReceiptItem[];
}
