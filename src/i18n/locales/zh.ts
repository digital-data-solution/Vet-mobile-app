/** Chinese (中文, Simplified) — mirrors en keys; gaps fall back to English. */
const zh = {
  common: {
    cancel: '取消', save: '保存', close: '关闭', back: '返回', done: '完成',
    share: '分享', print: '打印', email: '邮件', copy: '复制', copied: '已复制',
    loading: '加载中…', error: '错误', success: '成功', search: '搜索…',
    total: '合计', subtotal: '小计', discount: '折扣', payment: '付款',
    customer: '客户', phone: '电话', name: '名称', note: '备注', optional: '可选',
    today: '今天', thisMonth: '本月', profit: '利润', language: '语言',
  },
  biz: {
    title: '商务套件', recordSale: '记录销售', recordSaleDesc: '结账——库存即时更新',
    inventory: '库存', inventoryDesc: '商品、库存量、补货',
    reports: '销售与报表', reportsDesc: '收入、利润、按销售员统计',
    dayClose: '日结与报表', dayCloseDesc: '核对现金、每日结账、月度CSV',
    reps: '销售员', repsDesc: '添加员工，设置登录与权限',
    receiptSettings: '收据设置', receiptSettingsDesc: '每张收据上的您的标志与信息',
    auditLog: '审计日志', auditLogDesc: '每笔库存变动、由谁、何时',
    upgrade: '升级 / 续订', scan: '扫描', scanDesc: '扫描商品或收据二维码',
    sellingAs: '销售身份', owner: '店主', signedInAs: '登录身份', logout: '退出登录', switch: '切换',
    salesToday: '今日 {{count}} 笔销售', salesToday_other: '今日 {{count}} 笔销售',
    products: '{{count}} 件商品', low: '{{count}} 件不足',
  },
  receipt: {
    title: '收据', receiptNo: '收据', servedBy: '经手人', thankYou: '感谢惠顾！',
    printSave: '打印 / 存为PDF', sharePdf: '分享', sendToCustomer: '发送给客户', emailInvoice: '邮件发票',
    notAvailable: '收据不可用。', item: '商品', qty: '数量', price: '单价',
  },
  day: {
    day: '日', month: '月', closeDay: '结账', reCloseDay: '重新结账',
    exportCsv: '导出CSV', exportMonthlyCsv: '导出月度CSV',
    openingFloat: '备用金', cashCounted: '实点现金', expectedCash: '应有现金',
    variance: '差额', balanced: '已平账', over: '多 {{amount}}', short: '少 {{amount}}',
    signOffClose: '确认并结账', transactions: '交易', byRep: '按销售员', dayByDay: '逐日',
    noSales: '当日无销售。', noSalesMonth: '本月无销售。', closedBy: '由 {{name}} 结账',
    open: '未结', closed: '已结', countHint: '清点现金并确认。今日现金销售：{{amount}}。',
    dayClosedMsg: '{{date}} 已确认。净额 {{amount}}。',
  },
  settings: {
    intro: '这将显示在您打印或分享的每张收据上。',
    businessName: '商户名称（抬头）', address: '地址', receiptPrefix: '收据编号前缀',
    footerNote: '页脚备注', uploadLogo: '上传标志', changeLogo: '更换标志', noLogo: '无标志',
    currency: '货币', timezone: '时区', saveSettings: '保存收据设置', saved: '设置已更新。',
  },
  sale: {
    reviewPay: '核对并付款 →', complete: '完成销售', recordSale: '记录销售',
    paymentMethod: '付款方式', outOfStock: '缺货', onlyLeft: '{{name}} 仅剩 {{count}} 件。',
    saleRecorded: '销售已记录', stockUpdated: '{{amount}}——库存已更新。', viewPrintReceipt: '查看 / 打印收据',
    fromContacts: '从联系人', scanToAdd: '扫描', noProducts: '暂无商品，请先在库存中添加。',
    items: '{{count}} 件', items_other: '{{count}} 件',
  },
  scan: {
    title: '扫描', permission: '需要相机权限才能扫描。', grant: '允许相机',
    pointProduct: '对准商品条码或收据二维码。', notFound: '没有匹配该编码的商品。',
  },
  methods: { cash: '现金', transfer: '转账', card: '刷卡', wallet: '钱包', credit: '赊账' },
};
export default zh;
