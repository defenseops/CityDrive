'use client';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { bookingsAPI, finesAPI } from '@/lib/api';

export const FINE_TYPE_LABELS = {
  traffic_gibdd: 'Штраф ГИБДД',
  dirty_car:     'Грязный автомобиль',
  smoking:       'Курение в салоне',
  pet_hair:      'Шерсть животных',
  damage:        'Повреждение',
  late_return:   'Опоздание',
  other:         'Другое',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function Dash() {
  return <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />;
}

function ReceiptWrapper({ onClose, children }) {
  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #fiscal-print-root { display: block !important; position: static !important; background: white !important; }
          #fiscal-print-root .no-print { display: none !important; }
        }
      `}</style>
      <div
        id="fiscal-print-root"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="flex flex-col items-center gap-3 max-h-screen overflow-y-auto py-4">
          <div className="no-print">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
              style={{ background: '#1e1e30' }}>
              Закрыть
            </button>
          </div>
          <div style={{
            background: '#fff', color: '#000',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12px', width: '300px', padding: '16px 14px', lineHeight: '1.6',
          }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

function ReceiptHeader({ receiptNo }) {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>CityDrive</div>
        <div>ИП Иванов Иван</div>
        <div>ИИН/БИН: 123456789012</div>
      </div>
      <Dash />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>КАССА №1</span><span>Смена 1</span>
      </div>
      <div>Порядковый номер чека №{receiptNo}</div>
      <Dash />
      <div style={{ fontWeight: 'bold' }}>Продажа</div>
      <Dash />
    </>
  );
}

function ReceiptFooter({ paidAt, extraInfo, fp, znm, rnm, amount }) {
  const qrValue = `t=${encodeURIComponent(paidAt || '')}&s=${parseFloat(amount || 0).toFixed(2)}&fn=${znm}&i=${znm}&fp=${fp}&n=1`;
  return (
    <>
      <Dash />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
        <span>ИТОГО:</span><span>{fmt(amount)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Безналичные:</span><span>{fmt(amount)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Сумма сдачи:</span><span>0,00</span>
      </div>
      <Dash />
      <div>Время: {fmtDt(paidAt)}</div>
      {extraInfo}
      <Dash />
      <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '4px 0' }}>Фискальный чек</div>
      <div>ФП : {fp}</div>
      <div>ЗНМ: {znm}</div>
      <div>РНМ: {rnm}</div>
      <Dash />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
        <QRCodeSVG value={qrValue} size={120} />
      </div>
      <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '8px', color: '#555' }}>
        Для проверки чека зайдите<br />на сайт citydrive.ru/check
      </div>
    </>
  );
}

function LoadingReceipt() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
      <div style={{ fontSize: '11px' }}>Загрузка чека...</div>
    </div>
  );
}

function ErrorReceipt({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#c00' }}>
      <div style={{ fontSize: '11px' }}>{message}</div>
    </div>
  );
}

export function BookingReceiptModal({ booking, onClose }) {
  const [text, setText] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    bookingsAPI.getBookingPrintReceipt(booking.id)
      .then((res) => setText(res.text))
      .catch((err) => setError(err.message));
  }, [booking.id]);

  return (
    <ReceiptWrapper onClose={onClose}>
      {!text && !error && <LoadingReceipt />}
      {error && <ErrorReceipt message={error} />}
      {text && (
        <pre style={{
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '11px',
          whiteSpace: 'pre',
          margin: 0,
          lineHeight: '1.55',
        }}>
          {text}
        </pre>
      )}
    </ReceiptWrapper>
  );
}

export function FineReceiptModal({ fine, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    finesAPI.getFineFiscal(fine.id)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [fine.id]);

  return (
    <ReceiptWrapper onClose={onClose}>
      {!data && !error && <LoadingReceipt />}
      {error && <ErrorReceipt message={error} />}
      {data && (() => {
        const amount    = parseFloat(data.amount || 0);
        const typeLabel = FINE_TYPE_LABELS[data.fine_type] || data.fine_type || 'Штраф';
        return <>
          <ReceiptHeader receiptNo={data.receipt_no} />
          <div>1. {typeLabel}</div>
          {(data.car_name || data.license_plate) && (
            <div style={{ paddingLeft: '4px', fontSize: '11px', color: '#444' }}>
              {data.car_name}{data.license_plate ? ` (${data.license_plate})` : ''}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
            <span>1 шт.</span><span>{fmt(amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Стоимость</span><span>{fmt(amount)}</span>
          </div>
          <ReceiptFooter
            paidAt={data.paid_at}
            amount={amount}
            fp={data.fp}
            znm={data.znm}
            rnm={data.rnm}
            extraInfo={<>
              {data.client_name && <div>Клиент: {data.client_name}</div>}
              {data.admin_comment && <div>Примечание: {data.admin_comment}</div>}
              <div>Номер штрафа: #{fine.id}</div>
            </>}
          />
        </>;
      })()}
    </ReceiptWrapper>
  );
}
