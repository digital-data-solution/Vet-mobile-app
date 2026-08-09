/**
 * print.ts — cross-platform "print / PDF / share / email" helpers for receipts,
 * invoices and CSV exports.
 *
 *   • Web    → real printing & Save-as-PDF via a hidden iframe + window.print(),
 *              real file downloads via a Blob, and mailto for email.
 *   • Native → expo-print turns the branded HTML into a real PDF that expo-sharing
 *              sends to WhatsApp, email, Google Drive, a print app, anywhere; the
 *              built-in Share sheet sends the plain-text version; and
 *              expo-mail-composer emails the invoice with the PDF attached.
 *
 * Every path degrades gracefully — if a capability is unavailable we fall back to
 * the text Share sheet so the user is never stuck.
 */
import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system/legacy';

const isWeb = Platform.OS === 'web';

// ── web helper: print an HTML document via a hidden iframe ───────────────────
function webPrint(html: string) {
  if (typeof document === 'undefined') return;
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open(); doc.write(html); doc.close();

  const win = iframe.contentWindow!;
  const doPrint = () => {
    try { win.focus(); win.print(); } catch { /* ignore */ }
    setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 1000);
  };
  const imgs = Array.from(doc.images || []);
  if (imgs.length === 0) { setTimeout(doPrint, 150); return; }
  let settled = false;
  const go = () => { if (!settled) { settled = true; doPrint(); } };
  let remaining = imgs.length;
  imgs.forEach((img) => {
    if (img.complete) { if (--remaining === 0) go(); }
    else { img.onload = () => { if (--remaining === 0) go(); }; img.onerror = () => { if (--remaining === 0) go(); }; }
  });
  setTimeout(go, 2000); // hard cap
}

/**
 * Print / Save. Web: opens the print dialog (print or Save-as-PDF). Native:
 * opens the OS print UI via expo-print (print to a paper printer or save PDF).
 */
export async function printHtml(html: string, plainTextFallback: string): Promise<void> {
  if (isWeb) { webPrint(html); return; }
  try { await Print.printAsync({ html }); }
  catch { await shareText(plainTextFallback); }
}

/**
 * Turn the HTML into a real PDF and share it (WhatsApp / email / Drive / etc).
 * Web has no file PDF export, so we fall back to the print dialog (Save-as-PDF).
 */
export async function sharePdf(html: string, filename: string, plainTextFallback: string): Promise<void> {
  if (isWeb) { webPrint(html); return; }
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: filename, UTI: 'com.adobe.pdf' });
    } else {
      await shareText(plainTextFallback);
    }
  } catch {
    await shareText(plainTextFallback);
  }
}

/** Email an invoice/receipt, attaching the PDF on native. */
export async function emailInvoice(opts: {
  to?: string; subject: string; body: string; html: string;
}): Promise<void> {
  const { to, subject, body, html } = opts;
  if (isWeb) {
    if (typeof window !== 'undefined') {
      const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = `mailto:${to ? encodeURIComponent(to) : ''}?${q}`;
    }
    return;
  }
  try {
    if (!(await MailComposer.isAvailableAsync())) { await shareText(body, subject); return; }
    let attachments: string[] = [];
    try { const { uri } = await Print.printToFileAsync({ html }); attachments = [uri]; } catch { /* no attachment */ }
    await MailComposer.composeAsync({ recipients: to ? [to] : [], subject, body, isHtml: false, attachments });
  } catch {
    await shareText(body, subject);
  }
}

/** Share plain text via the native share sheet (WhatsApp/SMS/email), or copy on web. */
export async function shareText(text: string, title?: string): Promise<void> {
  if (isWeb) {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.share) { try { await nav.share({ title, text }); return; } catch { /* fall through */ } }
    if (nav?.clipboard?.writeText) { try { await nav.clipboard.writeText(text); } catch {} }
    return;
  }
  try { await Share.share({ message: text, title }); } catch { /* user cancelled */ }
}

/**
 * "Download" a CSV. Web: real file download. Native: write a real .csv file and
 * open the share sheet so it can be saved to Files/Drive or sent — falling back
 * to sharing the raw text if the filesystem is unavailable.
 */
export async function downloadCsv(filename: string, csv: string): Promise<void> {
  if (isWeb && typeof document !== 'undefined') {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); try { document.body.removeChild(a); } catch {} }, 500);
    return;
  }
  try {
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!dir) { await shareText(csv, filename); return; }
    const path = dir + filename;
    await FileSystem.writeAsStringAsync(path, '﻿' + csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: filename, UTI: 'public.comma-separated-values-text' });
    } else {
      await shareText(csv, filename);
    }
  } catch {
    await shareText(csv, filename);
  }
}

/** Escape a value for safe insertion into HTML. */
export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
