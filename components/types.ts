export interface TxView {
  id: string;
  occurredAt: string;
  amount: number;
  direction: string;
  bucket: string;
  category: string;
  merchant: string | null;
  account: string | null;
  installment: number;
  status: string;
  source: string;
  rawText: string | null;
  note: string | null;
}
