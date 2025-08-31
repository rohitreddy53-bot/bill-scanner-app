
import React from 'react';
import type { Receipt } from '../types';
import { DocumentArrowDownIcon } from './icons';

interface ReceiptHistoryProps {
  receipts: Receipt[];
  onExport: () => void;
}

const ReceiptHistory: React.FC<ReceiptHistoryProps> = ({ receipts, onExport }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Receipt History</h2>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-100 hover:bg-primary-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
        >
          <DocumentArrowDownIcon className="w-5 h-5"/>
          Download Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-6 py-3">Merchant</th>
              <th scope="col" className="px-6 py-3">Date</th>
              <th scope="col" className="px-6 py-3 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt, index) => (
              <tr key={index} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/50">
                <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                  {receipt.merchant || 'N/A'}
                </td>
                <td className="px-6 py-4">{receipt.date || 'N/A'}</td>
                <td className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-200">
                  ${(receipt.total_amount || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceiptHistory;
