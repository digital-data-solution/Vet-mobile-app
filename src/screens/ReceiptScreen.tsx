/**
 * ReceiptScreen.tsx — a professional, business-branded receipt for one sale.
 *
 * Shows the shop's own logo + header/footer (from the BusinessProfile the owner
 * sets under Receipt Settings), an itemised list, totals, payment method, the
 * rep who sold it and the customer. "Print / Save" opens the browser print
 * dialog on web (real paper or Save-as-PDF) and the share sheet on phones.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { businessFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { printHtml, sharePdf, emailInvoice, shareText, esc } from '../utils/print';
import { money as fmtMoney, setCurrencySymbol } from '../utils/money';

interface Item { productName: string; quantity: number; unitPrice: number; lineTotal: number; }
interface Sale {
  _id: string; items: Item[]; subtotal: number; discount: number; total: number;
  paymentMethod: string; staffName?: string; customerName?: string; customerPhone?: string;
  note?: string; createdAt: string;
}
interface Business {
  headerName?: string | null; logoUrl?: string | null; addressLine?: string | null;
  phone?: string | null; email?: string | null; footerNote?: string | null;
  currency?: string | null; currencySymbol?: string | null; locale?: string | null;
}
interface Props { route: any; navigation: any; }

const naira = (n: number) => fmtMoney(n);

export default function ReceiptScreen({ route }: Props) {
  const saleId = route?.params?.saleId as string;
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business>({});
  const [receiptNo, setReceiptNo] = useState('');
  const [sale, setSale] = useState<Sale | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await businessFetch(`/api/v1/business/reports/receipt/${saleId}`, { method: 'GET' });
      if (res.ok && res.body?.data) {
        const biz = res.body.data.business || {};
        if (biz.currencySymbol) setCurrencySymbol(biz.currencySymbol);
        setBusiness(biz);
        setReceiptNo(res.body.data.receiptNo || '');
        setSale(res.body.data.sale || null);
      } else {
        showAlert('Not found', res.body?.message || 'This receipt could not be loaded.');
      }
    } finally { setLoading(false); }
  }, [saleId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const buildHtml = (): string => {
    if (!sale) return '';
    const b = business;
    const rows = sale.items.map((i) => `
      <tr>
        <td>${esc(i.productName)}</td>
        <td class="c">${i.quantity}</td>
        <td class="r">${naira(i.unitPrice)}</td>
        <td class="r">${naira(i.lineTotal)}</td>
      </tr>`).join('');
    const when = new Date(sale.createdAt).toLocaleString();
    return `<!doctype html><html><head><meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Receipt ${esc(receiptNo)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111; margin:0; padding:24px; }
        .wrap { max-width: 380px; margin:0 auto; }
        .center { text-align:center; }
        .logo { max-width:120px; max-height:120px; object-fit:contain; margin:0 auto 8px; display:block; }
        h1 { font-size:20px; margin:0 0 2px; }
        .muted { color:#555; font-size:12px; margin:1px 0; }
        .rno { font-size:12px; color:#111; margin-top:8px; font-weight:600; }
        table { width:100%; border-collapse:collapse; margin-top:14px; font-size:13px; }
        th { text-align:left; border-bottom:2px solid #111; padding:6px 4px; font-size:11px; text-transform:uppercase; letter-spacing:.4px; }
        td { padding:6px 4px; border-bottom:1px solid #eee; }
        td.c, th.c { text-align:center; } td.r, th.r { text-align:right; }
        .totals { margin-top:12px; font-size:14px; }
        .totals div { display:flex; justify-content:space-between; padding:3px 4px; }
        .grand { font-size:18px; font-weight:800; border-top:2px solid #111; margin-top:4px; padding-top:8px; }
        .foot { text-align:center; margin-top:20px; font-size:12px; color:#555; }
        .pill { display:inline-block; border:1px solid #ccc; border-radius:12px; padding:2px 10px; font-size:11px; text-transform:uppercase; }
      </style></head><body><div class="wrap">
        <div class="center">
          ${b.logoUrl ? `<img class="logo" src="${esc(b.logoUrl)}"/>` : ''}
          <h1>${esc(b.headerName || 'Sales Receipt')}</h1>
          ${b.addressLine ? `<div class="muted">${esc(b.addressLine)}</div>` : ''}
          ${b.phone ? `<div class="muted">${esc(b.phone)}</div>` : ''}
          ${b.email ? `<div class="muted">${esc(b.email)}</div>` : ''}
          <div class="rno">Receipt: ${esc(receiptNo)}</div>
          <div class="muted">${esc(when)}</div>
        </div>
        <table>
          <thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal</span><span>${naira(sale.subtotal)}</span></div>
          ${sale.discount ? `<div><span>Discount</span><span>-${naira(sale.discount)}</span></div>` : ''}
          <div class="grand"><span>TOTAL</span><span>${naira(sale.total)}</span></div>
          <div style="margin-top:8px"><span>Payment</span><span class="pill">${esc(sale.paymentMethod)}</span></div>
          ${sale.staffName ? `<div><span>Served by</span><span>${esc(sale.staffName)}</span></div>` : ''}
          ${sale.customerName ? `<div><span>Customer</span><span>${esc(sale.customerName)}</span></div>` : ''}
        </div>
        <div class="foot">${esc(b.footerNote || 'Thank you for your patronage!')}</div>
      </div></body></html>`;
  };

  const buildText = (): string => {
    if (!sale) return '';
    const b = business;
    const L: string[] = [];
    L.push((b.headerName || 'SALES RECEIPT').toUpperCase());
    if (b.addressLine) L.push(b.addressLine);
    if (b.phone) L.push(b.phone);
    L.push(`Receipt: ${receiptNo}`);
    L.push(new Date(sale.createdAt).toLocaleString());
    L.push('------------------------------');
    sale.items.forEach((i) => L.push(`${i.quantity} x ${i.productName}  ${naira(i.lineTotal)}`));
    L.push('------------------------------');
    L.push(`Subtotal: ${naira(sale.subtotal)}`);
    if (sale.discount) L.push(`Discount: -${naira(sale.discount)}`);
    L.push(`TOTAL: ${naira(sale.total)}`);
    L.push(`Payment: ${sale.paymentMethod}`);
    if (sale.staffName) L.push(`Served by: ${sale.staffName}`);
    if (sale.customerName) L.push(`Customer: ${sale.customerName}`);
    L.push('');
    L.push(b.footerNote || 'Thank you for your patronage!');
    return L.join('\n');
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>;
  if (!sale) return <View style={styles.center}><Text style={styles.empty}>Receipt not available.</Text></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.paper}>
          {business.logoUrl ? <Image source={{ uri: business.logoUrl }} style={styles.logo} resizeMode="contain" /> : null}
          <Text style={styles.header}>{business.headerName || 'Sales Receipt'}</Text>
          {business.addressLine ? <Text style={styles.muted}>{business.addressLine}</Text> : null}
          {business.phone ? <Text style={styles.muted}>{business.phone}</Text> : null}
          {business.email ? <Text style={styles.muted}>{business.email}</Text> : null}
          <Text style={styles.rno}>Receipt: {receiptNo}</Text>
          <Text style={styles.muted}>{new Date(sale.createdAt).toLocaleString()}</Text>

          <View style={styles.hr} />
          {sale.items.map((i, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName}>{i.quantity} × {i.productName}</Text>
              <Text style={styles.itemTotal}>{naira(i.lineTotal)}</Text>
            </View>
          ))}
          <View style={styles.hr} />

          <View style={styles.totRow}><Text style={styles.totLbl}>Subtotal</Text><Text style={styles.totVal}>{naira(sale.subtotal)}</Text></View>
          {sale.discount ? <View style={styles.totRow}><Text style={styles.totLbl}>Discount</Text><Text style={styles.totVal}>-{naira(sale.discount)}</Text></View> : null}
          <View style={styles.grandRow}><Text style={styles.grandLbl}>TOTAL</Text><Text style={styles.grandVal}>{naira(sale.total)}</Text></View>

          <View style={styles.metaRow}><Text style={styles.metaLbl}>Payment</Text><Text style={styles.pill}>{sale.paymentMethod}</Text></View>
          {sale.staffName ? <View style={styles.metaRow}><Text style={styles.metaLbl}>Served by</Text><Text style={styles.metaVal}>{sale.staffName}</Text></View> : null}
          {sale.customerName ? <View style={styles.metaRow}><Text style={styles.metaLbl}>Customer</Text><Text style={styles.metaVal}>{sale.customerName}</Text></View> : null}

          <Text style={styles.footer}>{business.footerNote || 'Thank you for your patronage!'}</Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => printHtml(buildHtml(), buildText())}>
          <Text style={styles.btnPrimaryText}>🖨️  Print / Save PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost} onPress={() => sharePdf(buildHtml(), `Receipt-${receiptNo}.pdf`, buildText())}>
          <Text style={styles.btnGhostText}>📤 Share</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionsRow2}>
        <TouchableOpacity style={styles.btnText} onPress={() => shareText(buildText(), `Receipt ${receiptNo}`)}>
          <Text style={styles.btnTextLabel}>💬 Send to customer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnText} onPress={() => emailInvoice({ subject: `Invoice ${receiptNo}`, body: buildText(), html: buildHtml() })}>
          <Text style={styles.btnTextLabel}>✉️ Email invoice</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  empty: { color: '#9CA3AF', fontSize: 15 },
  content: { padding: 16, paddingBottom: 24 },

  paper: { backgroundColor: '#fff', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'stretch' },
  logo: { width: 100, height: 100, alignSelf: 'center', marginBottom: 8 },
  header: { fontSize: 20, fontWeight: '900', color: '#111827', textAlign: 'center' },
  muted: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 1 },
  rno: { fontSize: 12.5, color: '#111827', fontWeight: '700', textAlign: 'center', marginTop: 8 },
  hr: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { fontSize: 14, color: '#111827', flex: 1, paddingRight: 8 },
  itemTotal: { fontSize: 14, color: '#111827', fontWeight: '700' },

  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totLbl: { fontSize: 14, color: '#6B7280' },
  totVal: { fontSize: 14, color: '#111827', fontWeight: '600' },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: '#111827', marginTop: 6, paddingTop: 8 },
  grandLbl: { fontSize: 18, fontWeight: '900', color: '#111827' },
  grandVal: { fontSize: 18, fontWeight: '900', color: '#111827' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  metaLbl: { fontSize: 13, color: '#6B7280' },
  metaVal: { fontSize: 13, color: '#111827', fontWeight: '600' },
  pill: { fontSize: 11, color: '#374151', fontWeight: '800', textTransform: 'uppercase', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, overflow: 'hidden' },

  footer: { textAlign: 'center', color: '#6B7280', fontSize: 12.5, marginTop: 20 },

  actions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff' },
  btnPrimary: { flex: 1, backgroundColor: '#4338CA', borderRadius: 12, padding: 15, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  btnGhost: { paddingHorizontal: 22, borderRadius: 12, borderWidth: 1, borderColor: '#4338CA', alignItems: 'center', justifyContent: 'center' },
  btnGhostText: { color: '#4338CA', fontWeight: '900', fontSize: 15 },
  actionsRow2: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff' },
  btnText: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 12, alignItems: 'center' },
  btnTextLabel: { color: '#374151', fontWeight: '800', fontSize: 14 },
});
