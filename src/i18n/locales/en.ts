/** English — the source of truth. Every other locale mirrors these keys; any
 *  missing key falls back to English automatically. */
const en = {
  common: {
    cancel: 'Cancel', save: 'Save', close: 'Close', back: 'Back', done: 'Done',
    share: 'Share', print: 'Print', email: 'Email', copy: 'Copy', copied: 'Copied',
    loading: 'Loading…', error: 'Error', success: 'Success', search: 'Search…',
    total: 'Total', subtotal: 'Subtotal', discount: 'Discount', payment: 'Payment',
    customer: 'Customer', phone: 'Phone', name: 'Name', note: 'Note', optional: 'optional',
    today: 'Today', thisMonth: 'This month', profit: 'profit', language: 'Language',
  },
  biz: {
    title: 'Business Suite', recordSale: 'Record a Sale', recordSaleDesc: 'Ring up items — stock updates instantly',
    inventory: 'Inventory', inventoryDesc: 'Products, stock levels, restock',
    reports: 'Sales & Reports', reportsDesc: 'Revenue, profit, per-rep breakdown',
    dayClose: 'Day Close & Reports', dayCloseDesc: 'Balance the till, close each day, monthly CSV',
    reps: 'Sales Reps', repsDesc: 'Add staff, set logins & permissions',
    receiptSettings: 'Receipt Settings', receiptSettingsDesc: 'Your logo & details on every receipt',
    auditLog: 'Audit Log', auditLogDesc: 'Every stock move, who did it, when',
    upgrade: 'Upgrade / Renew', scan: 'Scan', scanDesc: 'Scan a product or a receipt QR',
    sellingAs: 'Selling as', owner: 'Owner', signedInAs: 'Signed in as', logout: 'Log out', switch: 'Switch',
    salesToday: '{{count}} sale today', salesToday_other: '{{count}} sales today',
    products: '{{count}} products', low: '{{count}} low',
  },
  receipt: {
    title: 'Receipt', receiptNo: 'Receipt', servedBy: 'Served by', thankYou: 'Thank you for your patronage!',
    printSave: 'Print / Save PDF', sharePdf: 'Share', sendToCustomer: 'Send to customer', emailInvoice: 'Email invoice',
    notAvailable: 'Receipt not available.', item: 'Item', qty: 'Qty', price: 'Price',
  },
  day: {
    day: 'Day', month: 'Month', closeDay: 'Close Day', reCloseDay: 'Re-close Day',
    exportCsv: 'Export CSV', exportMonthlyCsv: 'Export monthly CSV',
    openingFloat: 'Opening float', cashCounted: 'Cash counted in drawer', expectedCash: 'Expected cash',
    variance: 'Variance', balanced: 'Balanced', over: 'Over {{amount}}', short: 'Short {{amount}}',
    signOffClose: 'Sign off & Close', transactions: 'Transactions', byRep: 'By rep', dayByDay: 'Day by day',
    noSales: 'No sales this day.', noSalesMonth: 'No sales this month.', closedBy: 'Closed by {{name}}',
    open: 'open', closed: 'closed', countHint: 'Count the till and sign off. Cash sales today: {{amount}}.',
    dayClosedMsg: '{{date}} signed off. Net {{amount}}.',
  },
  settings: {
    intro: 'This appears on every receipt you print or share.',
    businessName: 'Business name (header)', address: 'Address', receiptPrefix: 'Receipt number prefix',
    footerNote: 'Footer note', uploadLogo: 'Upload logo', changeLogo: 'Change logo', noLogo: 'No logo',
    currency: 'Currency', timezone: 'Timezone', saveSettings: 'Save receipt settings', saved: 'Your settings have been updated.',
  },
  sale: {
    reviewPay: 'Review & Pay →', complete: 'Complete Sale', recordSale: 'Record Sale',
    paymentMethod: 'Payment method', outOfStock: 'Out of stock', onlyLeft: 'Only {{count}} of {{name}} left.',
    saleRecorded: 'Sale recorded', stockUpdated: '{{amount}} — stock updated.', viewPrintReceipt: 'View / Print receipt',
    fromContacts: 'From contacts', scanToAdd: 'Scan', noProducts: 'No products. Add stock in Inventory first.',
    items: '{{count}} item', items_other: '{{count}} items',
  },
  scan: {
    title: 'Scan', permission: 'Camera permission is needed to scan.', grant: 'Allow camera',
    pointProduct: 'Point at a product barcode or a receipt QR code.', notFound: 'No product matches that code.',
  },
  methods: { cash: 'cash', transfer: 'transfer', card: 'card', wallet: 'wallet', credit: 'credit' },
};
export default en;
