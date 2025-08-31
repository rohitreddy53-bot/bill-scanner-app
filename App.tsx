import React, { useState, useCallback, useMemo, useRef } from 'react';
import { analyzeReceipt } from './services/geminiService';
import type { Receipt } from './types';
import { CameraIcon, UploadIcon, DocumentTextIcon, ArrowPathIcon, PlusIcon, XMarkIcon } from './components/icons';
import CameraCapture from './components/CameraCapture';
import ReceiptDetails from './components/ReceiptDetails';
import ReceiptHistory from './components/ReceiptHistory';

enum View {
  Home,
  Camera,
  Analyzing,
  Results,
}

declare const pdfjsLib: any;
declare const XLSX: any;

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.Home);
  const [error, setError] = useState<string | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [receiptHistory, setReceiptHistory] = useState<Receipt[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalysis = useCallback(async (base64Data: string, mimeType: string) => {
    setView(View.Analyzing);
    setError(null);
    try {
      // The base64 string might include a data URL prefix (e.g., "data:image/jpeg;base64,").
      // We need to strip it before sending to the API.
      const pureBase64 = base64Data.split(',')[1] || base64Data;
      const result = await analyzeReceipt(pureBase64, mimeType);
      setCurrentReceipt(result);
      setView(View.Results);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
      setView(View.Home);
    }
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // Reset file input
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        handleAnalysis(base64String, file.type);
      };
      reader.onerror = () => {
        setError('Failed to read the image file.');
        setView(View.Home);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      try {
        setView(View.Analyzing);
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Could not get canvas context");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        const base64String = canvas.toDataURL('image/jpeg');
        handleAnalysis(base64String, 'image/jpeg');
      } catch (err) {
        console.error(err);
        setError('Failed to process the PDF file. Only single-page PDFs are fully supported.');
        setView(View.Home);
      }
    } else {
      setError('Unsupported file type. Please upload an image (JPG, PNG) or a PDF.');
      setView(View.Home);
    }
  }, [handleAnalysis]);

  const handleAddNextReceipt = useCallback(() => {
    if (currentReceipt) {
      setReceiptHistory(prev => [...prev, currentReceipt]);
      setCurrentReceipt(null);
      setView(View.Home);
    }
  }, [currentReceipt]);

  const handleTryAgain = () => {
    setCurrentReceipt(null);
    setError(null);
    setView(View.Home);
  };

  const handleExport = useCallback(() => {
    if (receiptHistory.length === 0) return;

    // Sheet 1: Data for the "Receipts Summary" sheet
    const summaryData = receiptHistory.map(receipt => ({
      'Merchant': receipt.merchant || 'N/A',
      'Date': receipt.date || 'N/A',
      'Total Amount': receipt.total_amount,
      'Location': receipt.location || 'N/A',
      'Card (Last 4)': receipt.card_number || 'N/A',
    }));

    // Sheet 2: Data for the "Itemized Details" sheet
    const itemizedData = receiptHistory.flatMap(receipt => {
      if (receipt.items.length === 0) {
        return [{
          'Merchant': receipt.merchant || 'N/A',
          'Date': receipt.date || 'N/A',
          'Item Name': 'N/A',
          'Item Quantity': null,
          'Item Price': receipt.total_amount,
        }];
      }
      return receipt.items.map(item => ({
        'Merchant': receipt.merchant || 'N/A',
        'Date': receipt.date || 'N/A',
        'Item Name': item.name,
        'Item Quantity': item.quantity,
        'Item Price': item.price,
      }));
    });

    // Sheet 3: Data for the "All Data Combined" sheet
    const combinedData = receiptHistory.flatMap(receipt => {
      const receiptInfo = {
        'Merchant': receipt.merchant || 'N/A',
        'Date': receipt.date || 'N/A',
        'Location': receipt.location || 'N/A',
        'Card (Last 4)': receipt.card_number || 'N/A',
        'Receipt Total Amount': receipt.total_amount,
      };

      if (receipt.items.length === 0) {
        return [{
          ...receiptInfo,
          'Item Name': 'N/A',
          'Item Quantity': null,
          'Item Price': null,
        }];
      }

      return receipt.items.map(item => ({
        ...receiptInfo,
        'Item Name': item.name,
        'Item Quantity': item.quantity,
        'Item Price': item.price,
      }));
    });


    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create and append the summary sheet
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Receipts Summary');

    // Create and append the itemized details sheet
    const itemizedWorksheet = XLSX.utils.json_to_sheet(itemizedData);
    XLSX.utils.book_append_sheet(workbook, itemizedWorksheet, 'Itemized Details');
    
    // Create and append the combined data sheet
    const combinedWorksheet = XLSX.utils.json_to_sheet(combinedData);
    XLSX.utils.book_append_sheet(workbook, combinedWorksheet, 'All Data Combined');
    
    // Write the workbook and trigger the download
    XLSX.writeFile(workbook, 'receipts.xlsx');
  }, [receiptHistory]);


  const totalAmount = useMemo(() => {
    return receiptHistory.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0);
  }, [receiptHistory]);

  const renderContent = () => {
    switch (view) {
      case View.Camera:
        return <CameraCapture onCapture={(base64) => handleAnalysis(base64, 'image/jpeg')} onCancel={() => setView(View.Home)} />;
      case View.Analyzing:
        return (
          <div className="text-center p-10 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <h2 className="text-xl font-semibold mt-4 text-slate-700 dark:text-slate-300">Analyzing receipt...</h2>
            <p className="text-slate-500 dark:text-slate-400">Please wait while we extract the details.</p>
          </div>
        );
      case View.Results:
        return (
          currentReceipt && (
            <div>
              <ReceiptDetails receipt={currentReceipt} />
              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleTryAgain}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Try Again
                </button>
                <button
                  onClick={handleAddNextReceipt}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Next Receipt
                </button>
              </div>
            </div>
          )
        );
      case View.Home:
      default:
        return (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg w-full max-w-md">
            <div className="text-center">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-primary-500"/>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Bill Scanner</h1>
                <p className="mt-2 text-base text-slate-600 dark:text-slate-300">Scan or upload a receipt to get started.</p>
            </div>
            <div className="mt-8 space-y-4">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg, application/pdf" className="hidden" />
              <button
                onClick={() => setView(View.Camera)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 font-semibold text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
              >
                <CameraIcon className="w-6 h-6" />
                Open Camera & Scan
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 font-semibold text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                <UploadIcon className="w-6 h-6" />
                Upload a File
              </button>
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">Supports: JPG, PNG, PDF</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center mb-8">
            {renderContent()}
        </div>

        {error && (
            <div className="max-w-md mx-auto mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow flex justify-between items-center" role="alert">
                <div>
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
                <button onClick={() => setError(null)} className="p-1 rounded-full hover:bg-red-200">
                    <XMarkIcon className="w-5 h-5"/>
                </button>
            </div>
        )}
        
        {receiptHistory.length > 0 && (
          <div className="mt-12">
            <ReceiptHistory receipts={receiptHistory} onExport={handleExport} />
            <div className="mt-6 flex justify-end items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
                <span className="text-lg font-medium text-slate-600 dark:text-slate-300">Running Total:</span>
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400 ml-4">
                    ${totalAmount.toFixed(2)}
                </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;