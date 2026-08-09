/** Arabic (العربية) — RTL. Mirrors en keys; gaps fall back to English. */
const ar = {
  common: {
    cancel: 'إلغاء', save: 'حفظ', close: 'إغلاق', back: 'رجوع', done: 'تم',
    share: 'مشاركة', print: 'طباعة', email: 'بريد', copy: 'نسخ', copied: 'تم النسخ',
    loading: 'جارٍ التحميل…', error: 'خطأ', success: 'تم', search: 'بحث…',
    total: 'الإجمالي', subtotal: 'المجموع الفرعي', discount: 'خصم', payment: 'الدفع',
    customer: 'العميل', phone: 'الهاتف', name: 'الاسم', note: 'ملاحظة', optional: 'اختياري',
    today: 'اليوم', thisMonth: 'هذا الشهر', profit: 'ربح', language: 'اللغة',
  },
  biz: {
    title: 'جناح الأعمال', recordSale: 'تسجيل عملية بيع', recordSaleDesc: 'سجّل الأصناف — يُحدَّث المخزون فورًا',
    inventory: 'المخزون', inventoryDesc: 'المنتجات ومستويات المخزون وإعادة التخزين',
    reports: 'المبيعات والتقارير', reportsDesc: 'الإيرادات والأرباح وتفصيل كل مندوب',
    dayClose: 'إغلاق اليوم والتقارير', dayCloseDesc: 'موازنة الصندوق وإغلاق كل يوم وتقرير شهري CSV',
    reps: 'مندوبو المبيعات', repsDesc: 'إضافة موظفين وتحديد الدخول والصلاحيات',
    receiptSettings: 'إعدادات الإيصال', receiptSettingsDesc: 'شعارك وبياناتك على كل إيصال',
    auditLog: 'سجل التدقيق', auditLogDesc: 'كل حركة مخزون ومن قام بها ومتى',
    upgrade: 'ترقية / تجديد', scan: 'مسح', scanDesc: 'امسح منتجًا أو رمز إيصال QR',
    sellingAs: 'البيع باسم', owner: 'المالك', signedInAs: 'مسجّل الدخول كـ', logout: 'تسجيل الخروج', switch: 'تبديل',
    salesToday: '{{count}} عملية بيع اليوم', salesToday_other: '{{count}} عمليات بيع اليوم',
    products: '{{count}} منتج', low: '{{count}} منخفض',
  },
  receipt: {
    title: 'إيصال', receiptNo: 'إيصال', servedBy: 'قدّمه', thankYou: 'شكرًا لتعاملكم معنا!',
    printSave: 'طباعة / حفظ PDF', sharePdf: 'مشاركة', sendToCustomer: 'إرسال للعميل', emailInvoice: 'إرسال الفاتورة بالبريد',
    notAvailable: 'الإيصال غير متوفر.', item: 'الصنف', qty: 'الكمية', price: 'السعر',
  },
  day: {
    day: 'يوم', month: 'شهر', closeDay: 'إغلاق اليوم', reCloseDay: 'إعادة إغلاق اليوم',
    exportCsv: 'تصدير CSV', exportMonthlyCsv: 'تصدير CSV شهري',
    openingFloat: 'الرصيد الافتتاحي', cashCounted: 'النقد المعدود في الدرج', expectedCash: 'النقد المتوقع',
    variance: 'الفرق', balanced: 'متوازن', over: 'زيادة {{amount}}', short: 'نقص {{amount}}',
    signOffClose: 'اعتماد وإغلاق', transactions: 'المعاملات', byRep: 'حسب المندوب', dayByDay: 'يومًا بيوم',
    noSales: 'لا مبيعات في هذا اليوم.', noSalesMonth: 'لا مبيعات هذا الشهر.', closedBy: 'أغلقه {{name}}',
    open: 'مفتوح', closed: 'مغلق', countHint: 'اعدد الصندوق واعتمد. مبيعات النقد اليوم: {{amount}}.',
    dayClosedMsg: 'تم اعتماد {{date}}. الصافي {{amount}}.',
  },
  settings: {
    intro: 'يظهر هذا على كل إيصال تطبعه أو تشاركه.',
    businessName: 'اسم النشاط (الترويسة)', address: 'العنوان', receiptPrefix: 'بادئة رقم الإيصال',
    footerNote: 'ملاحظة التذييل', uploadLogo: 'رفع الشعار', changeLogo: 'تغيير الشعار', noLogo: 'لا شعار',
    currency: 'العملة', timezone: 'المنطقة الزمنية', saveSettings: 'حفظ إعدادات الإيصال', saved: 'تم تحديث إعداداتك.',
  },
  sale: {
    reviewPay: 'المراجعة والدفع ←', complete: 'إتمام البيع', recordSale: 'تسجيل البيع',
    paymentMethod: 'طريقة الدفع', outOfStock: 'نفد المخزون', onlyLeft: 'متبقٍ {{count}} فقط من {{name}}.',
    saleRecorded: 'تم تسجيل البيع', stockUpdated: '{{amount}} — تم تحديث المخزون.', viewPrintReceipt: 'عرض / طباعة الإيصال',
    fromContacts: 'من جهات الاتصال', scanToAdd: 'مسح', noProducts: 'لا منتجات. أضف المخزون أولًا.',
    items: '{{count}} صنف', items_other: '{{count}} أصناف',
  },
  scan: {
    title: 'مسح', permission: 'يلزم إذن الكاميرا للمسح.', grant: 'السماح بالكاميرا',
    pointProduct: 'وجّه نحو باركود المنتج أو رمز إيصال QR.', notFound: 'لا يوجد منتج مطابق لهذا الرمز.',
  },
  methods: { cash: 'نقدًا', transfer: 'تحويل', card: 'بطاقة', wallet: 'محفظة', credit: 'آجل' },
};
export default ar;
