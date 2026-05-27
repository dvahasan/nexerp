import { forwardRef } from 'react';
import Icon from './Icon';

const InvoicePrint = forwardRef(({ txs = [], showUserPhone = false, showCompanyStamp = true, company, isAR }, ref) => {
  if (!txs || txs.length === 0 || !company) return null;

  const printSettings = company.printSettings || {};
  const isIN = txs[0].type === 'IN';
  const typeColor = isIN ? '#16774A' : '#dc2626';
  const tx = txs[0];

  // Calculate total
  const grandTotal = txs.reduce((acc, curr) => {
    return acc + ((curr.unitCost || 0) * (curr.qty || 0));
  }, 0);
  
  // Invoice title
  const title = isIN 
    ? (isAR ? 'سند استلام (وارد)' : 'Receipt Voucher (IN)')
    : (isAR ? 'سند صرف (صادر)' : 'Dispatch Voucher (OUT)');

  // Contact details
  const compPhone = company.phone || printSettings.companyPhone;
  const compEmail = company.email || printSettings.companyEmail;
  const compAddr = company.address || printSettings.companyAddress;
  
  const locationField = isIN ? tx.sourceId : tx.destId;
  const locationType = isIN ? (isAR ? 'المصدر' : 'Source') : (isAR ? 'الوجهة' : 'Destination');

  const formatDate = (d) => new Date(d).toLocaleDateString(isAR ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div ref={ref} className="invoice-print-container" style={{
      padding: '40px',
      backgroundColor: '#fff',
      color: '#000',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      direction: isAR ? 'rtl' : 'ltr',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      borderTop: `6px solid ${company.primaryColor || '#3b82f6'}`,
      boxSizing: 'border-box'
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {company.logo && (
              <img src={company.logo} alt="Company Logo" style={{ maxHeight: '60px', maxWidth: '140px', objectFit: 'contain' }} />
            )}
            <div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: company.primaryColor || '#000', lineHeight: 1.1 }}>
                {company.name}
              </div>
              {company.slogan && (
                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontStyle: 'italic' }}>
                  {company.slogan}
                </div>
              )}
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#555', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {compPhone && <div>📞 {compPhone}</div>}
                {compEmail && <div>✉️ {compEmail}</div>}
                {compAddr && <div>📍 {compAddr}</div>}
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: isAR ? 'left' : 'right', fontSize: '13px', color: '#444' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '5px', color: '#000' }}>
            {title}
          </div>
          <div style={{ fontWeight: '600', fontSize: '15px' }}>
            <span style={{ fontSize: '12px', color: '#666', fontWeight: '500', marginRight: isAR ? 0 : '6px', marginLeft: isAR ? '6px' : 0 }}>
              {isAR ? 'رقم الفاتورة:' : 'Invoice No:'}
            </span>
            {tx.invoiceNo || `TX-${tx._id?.slice(-6).toUpperCase()}`}
          </div>
          {printSettings.invoiceHeader && (
            <div style={{ fontSize: '12px', color: '#555', marginTop: '10px', whiteSpace: 'pre-wrap' }}>
              {printSettings.invoiceHeader}
            </div>
          )}
        </div>
      </div>

      {/* METADATA GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', fontSize: '13px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '6px' }}>
        <div>
          <div style={{ color: '#6b7280', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px' }}>
            {isAR ? 'معلومات المستند' : 'Document Info'}
          </div>
          <div style={{ marginBottom: '6px' }}><span style={{ color: '#777' }}>{isAR ? 'بواسطة:' : 'Prepared By:'}</span> <strong>{tx.userName || (tx.userId?.name)}</strong></div>
          {showUserPhone && (
            <div style={{ marginBottom: '6px' }}><span style={{ color: '#777' }}>{isAR ? 'رقم التواصل:' : 'Contact No:'}</span> <strong>{tx.userId?.phone || '—'}</strong></div>
          )}
          <div style={{ marginBottom: '6px' }}><span style={{ color: '#777' }}>{isAR ? 'التاريخ:' : 'Date:'}</span> <strong>{formatDate(tx.date)}</strong></div>
        </div>
        <div>
          <div style={{ color: '#6b7280', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px' }}>
            {isAR ? 'معلومات التوجيه' : 'Routing Info'}
          </div>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr><td style={{ padding: '3px 0', fontWeight: 600, width: '90px' }}>{locationType}:</td><td>{locationField?.name || '—'}</td></tr>
              {locationField?.contact && <tr><td style={{ padding: '3px 0', fontWeight: 600 }}>{isAR ? 'للتواصل:' : 'Contact:'}</td><td>{locationField.contact}</td></tr>}
              {company?.features?.projects && !isIN && tx.projectId && <tr><td style={{ padding: '3px 0', fontWeight: 600 }}>{isAR ? 'المشروع:' : 'Project:'}</td><td>{tx.projectId.name}</td></tr>}
              {company?.features?.reasons && tx.reasonId && <tr><td style={{ padding: '3px 0', fontWeight: 600 }}>{isAR ? 'السبب:' : 'Reason:'}</td><td>{tx.reasonId.name}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div style={{ marginBottom: '40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: `${company.primaryColor || '#3b82f6'}12`, borderBottom: `2px solid ${company.primaryColor || '#3b82f6'}44`, color: '#111827' }}>
              <th style={{ padding: '10px', textAlign: 'start' }}>#</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>{isAR ? 'الصنف' : 'Item'}</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>{isAR ? 'باركود / SKU' : 'Barcode / SKU'}</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>{isAR ? 'الكمية' : 'Qty'}</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>{isAR ? 'سعر الوحدة' : 'Unit Price'}</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>{isAR ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t, index) => (
              <tr key={t._id || index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 10px', textAlign: 'start' }}>{index + 1}</td>
                <td style={{ padding: '12px 10px', textAlign: 'start', fontWeight: '600' }}>
                  {isAR ? (t.itemId?.name || '—') : (t.itemId?.nameEn || t.itemId?.name || '—')}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'start', fontFamily: 'monospace', color: '#555' }}>
                  {t.itemId?.sku || '—'}<br/>{t.itemId?.barcode || ''}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold' }}>{t.qty}</td>
                <td style={{ padding: '12px 10px', textAlign: 'right' }}>{t.unitCost > 0 ? t.unitCost.toFixed(2) : '—'}</td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold' }}>
                  {t.unitCost > 0 ? (t.qty * t.unitCost).toFixed(2) : '—'}
                </td>
              </tr>
            ))}
            
            {/* Grand Total Row */}
            <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
              <td colSpan="5" style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                {isAR ? 'الإجمالي الكلي:' : 'Grand Total:'}
              </td>
              <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px', color: typeColor }}>
                {grandTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* NOTES */}
      {tx.notes && (
        <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#fefce8', borderLeft: '4px solid #facc15', borderRadius: '4px', fontSize: '13px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{isAR ? 'الملاحظات:' : 'Notes:'}</div>
          <div>{tx.notes}</div>
        </div>
      )}

      {/* SIGNATURES */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: '60px', marginBottom: '40px', position: 'relative' }}>
        
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ borderBottom: '1px solid #000', width: '200px', height: '40px' }}></div>
          <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '600' }}>{isAR ? 'توقيع أمين المستودع' : 'Storekeeper Signature'}</div>
        </div>

        {/* STAMP */}
        {showCompanyStamp !== false && company.stamp && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', opacity: 0.8, pointerEvents: 'none' }}>
            <img src={company.stamp} alt="Company Stamp" style={{ maxHeight: '120px', maxWidth: '120px', objectFit: 'contain' }} />
          </div>
        )}

        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{ borderBottom: '1px solid #000', width: '200px', height: '40px' }}></div>
          <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '600' }}>{isAR ? 'توقيع المستلم' : 'Receiver Signature'}</div>
        </div>
      </div>

      {/* FOOTER */}
      {printSettings.invoiceFooter && (
        <div style={{ 
          borderTop: '1px solid #eee', 
          paddingTop: '15px', 
          marginTop: 'auto', 
          fontSize: '11px', 
          color: '#777', 
          textAlign: 'center',
          whiteSpace: 'pre-wrap'
        }}>
          {printSettings.invoiceFooter}
        </div>
      )}

      <style>{`
        @media print {
          @page { size: ${printSettings.paperSize || 'A4'}; margin: 10mm; }
          body * { visibility: hidden; }
          .invoice-print-container, .invoice-print-container * { visibility: visible; }
          .invoice-print-container { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
});

export default InvoicePrint;
