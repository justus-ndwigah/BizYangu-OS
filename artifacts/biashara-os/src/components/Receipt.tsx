import type { Sale, ShopSettings } from '@workspace/api-client-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n);

interface ReceiptProps {
  sale: Sale;
  settings?: ShopSettings;
}

/**
 * Renders a printable receipt. Intended to be shown inside a component that
 * also has a "Print / Save as PDF" button calling window.print() — the
 * @media print rules below hide everything else on the page (app chrome,
 * buttons, nav) and format just this block for a narrow receipt-style
 * printout. Using the OS print dialog means "Microsoft Print to PDF" (built
 * into Windows) or any real receipt printer both work with zero extra
 * dependencies.
 */
export function Receipt({ sale, settings }: ReceiptProps) {
  const date = new Date(sale.createdAt);

  return (
    <div id="receipt-print-area" className="receipt-print-area mx-auto w-[80mm] bg-white text-black p-4 font-mono text-xs leading-relaxed print:w-full print:p-0">
      <div className="text-center mb-3">
        <p className="font-extrabold text-sm uppercase">{settings?.shopName ?? 'Shop'}</p>
        {settings?.address && <p>{settings.address}</p>}
        {settings?.phone && <p>{settings.phone}</p>}
      </div>

      <div className="border-t border-dashed border-black/40 my-2" />

      <div className="flex justify-between">
        <span>Receipt:</span>
        <span className="font-bold">{sale.receiptNumber}</span>
      </div>
      <div className="flex justify-between">
        <span>Date:</span>
        <span>{date.toLocaleDateString('en-KE')} {date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      {sale.customerName && (
        <div className="flex justify-between">
          <span>Customer:</span>
          <span>{sale.customerName}</span>
        </div>
      )}

      <div className="border-t border-dashed border-black/40 my-2" />

      <table className="w-full">
        <thead>
          <tr className="border-b border-black/40">
            <th className="text-left font-bold pb-1">Item</th>
            <th className="text-center font-bold pb-1">Qty</th>
            <th className="text-right font-bold pb-1">Price</th>
            <th className="text-right font-bold pb-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, i) => (
            <tr key={i}>
              <td className="py-0.5 pr-1">{item.name}</td>
              <td className="text-center py-0.5">{item.qty}</td>
              <td className="text-right py-0.5">{fmt(item.price)}</td>
              <td className="text-right py-0.5">{fmt(item.price * item.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-black/40 my-2" />

      <div className="flex justify-between text-sm font-extrabold">
        <span>TOTAL</span>
        <span>{fmt(sale.total)}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span>Payment:</span>
        <span>{sale.method}{sale.onCredit ? ' (Credit)' : ''}</span>
      </div>
      {sale.mpesaReceipt && (
        <div className="flex justify-between">
          <span>M-PESA Ref:</span>
          <span>{sale.mpesaReceipt}</span>
        </div>
      )}

      <div className="border-t border-dashed border-black/40 my-2" />

      <p className="text-center mt-3">{settings?.receiptFooter || 'Thank you for your business!'}</p>
      <p className="text-center text-[10px] text-black/50 mt-2">Powered by BizYangu OS</p>
    </div>
  );
}
