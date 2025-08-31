
import React from 'react';
import type { Receipt } from '../types';

interface ReceiptDetailsProps {
  receipt: Receipt;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="flex justify-between text-sm py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">{label}</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 text-right">{value}</span>
        </div>
    );
};

const ReceiptDetails: React.FC<ReceiptDetailsProps> = ({ receipt }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-md">
      <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">{receipt.merchant || 'Receipt Details'}</h2>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">{receipt.location}</p>

      <div className="space-y-2">
        <DetailItem label="Date" value={receipt.date} />
        <DetailItem label="Card" value={receipt.card_number ? `**** **** **** ${receipt.card_number}` : null} />
      </div>

      {receipt.items && receipt.items.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Items</h3>
          <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {receipt.items.map((item, index) => (
              <li key={index} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                <div className="flex-1 mr-2">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{item.name}</p>
                    {item.quantity && <p className="text-xs text-slate-500 dark:text-slate-400">Qty: {item.quantity}</p>}
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">${item.price.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300 dark:border-slate-600 flex justify-between items-center">
        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">Total</span>
        <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">${(receipt.total_amount || 0).toFixed(2)}</span>
      </div>
    </div>
  );
};

export default ReceiptDetails;
