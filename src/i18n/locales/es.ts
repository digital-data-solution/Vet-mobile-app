/** Spanish (Español) — mirrors en keys; gaps fall back to English. */
const es = {
  common: {
    cancel: 'Cancelar', save: 'Guardar', close: 'Cerrar', back: 'Atrás', done: 'Listo',
    share: 'Compartir', print: 'Imprimir', email: 'Correo', copy: 'Copiar', copied: 'Copiado',
    loading: 'Cargando…', error: 'Error', success: 'Éxito', search: 'Buscar…',
    total: 'Total', subtotal: 'Subtotal', discount: 'Descuento', payment: 'Pago',
    customer: 'Cliente', phone: 'Teléfono', name: 'Nombre', note: 'Nota', optional: 'opcional',
    today: 'Hoy', thisMonth: 'Este mes', profit: 'ganancia', language: 'Idioma',
  },
  biz: {
    title: 'Suite de Negocio', recordSale: 'Registrar una venta', recordSaleDesc: 'Cobra — el stock se actualiza al instante',
    inventory: 'Inventario', inventoryDesc: 'Productos, niveles de stock, reposición',
    reports: 'Ventas e Informes', reportsDesc: 'Ingresos, ganancias, desglose por vendedor',
    dayClose: 'Cierre e Informes', dayCloseDesc: 'Cuadra la caja, cierra cada día, CSV mensual',
    reps: 'Vendedores', repsDesc: 'Añade personal, accesos y permisos',
    receiptSettings: 'Ajustes del recibo', receiptSettingsDesc: 'Tu logo y datos en cada recibo',
    auditLog: 'Registro de auditoría', auditLogDesc: 'Cada movimiento de stock, quién y cuándo',
    upgrade: 'Mejorar / Renovar', scan: 'Escanear', scanDesc: 'Escanea un producto o un QR de recibo',
    sellingAs: 'Vendiendo como', owner: 'Propietario', signedInAs: 'Conectado como', logout: 'Cerrar sesión', switch: 'Cambiar',
    salesToday: '{{count}} venta hoy', salesToday_other: '{{count}} ventas hoy',
    products: '{{count}} productos', low: '{{count}} bajo',
  },
  receipt: {
    title: 'Recibo', receiptNo: 'Recibo', servedBy: 'Atendido por', thankYou: '¡Gracias por su preferencia!',
    printSave: 'Imprimir / PDF', sharePdf: 'Compartir', sendToCustomer: 'Enviar al cliente', emailInvoice: 'Factura por correo',
    notAvailable: 'Recibo no disponible.', item: 'Artículo', qty: 'Cant.', price: 'Precio',
  },
  day: {
    day: 'Día', month: 'Mes', closeDay: 'Cerrar día', reCloseDay: 'Reabrir cierre',
    exportCsv: 'Exportar CSV', exportMonthlyCsv: 'Exportar CSV mensual',
    openingFloat: 'Fondo inicial', cashCounted: 'Efectivo contado', expectedCash: 'Efectivo esperado',
    variance: 'Diferencia', balanced: 'Cuadrado', over: 'Sobra {{amount}}', short: 'Falta {{amount}}',
    signOffClose: 'Firmar y Cerrar', transactions: 'Transacciones', byRep: 'Por vendedor', dayByDay: 'Día a día',
    noSales: 'Sin ventas este día.', noSalesMonth: 'Sin ventas este mes.', closedBy: 'Cerrado por {{name}}',
    open: 'abierto', closed: 'cerrado', countHint: 'Cuenta la caja y firma. Efectivo de hoy: {{amount}}.',
    dayClosedMsg: '{{date}} firmado. Neto {{amount}}.',
  },
  settings: {
    intro: 'Esto aparece en cada recibo que imprimes o compartes.',
    businessName: 'Nombre del negocio (encabezado)', address: 'Dirección', receiptPrefix: 'Prefijo de número de recibo',
    footerNote: 'Nota de pie', uploadLogo: 'Subir logo', changeLogo: 'Cambiar logo', noLogo: 'Sin logo',
    currency: 'Moneda', timezone: 'Zona horaria', saveSettings: 'Guardar ajustes', saved: 'Tus ajustes se han actualizado.',
  },
  sale: {
    reviewPay: 'Revisar y Pagar →', complete: 'Completar venta', recordSale: 'Registrar venta',
    paymentMethod: 'Método de pago', outOfStock: 'Sin stock', onlyLeft: 'Solo quedan {{count}} de {{name}}.',
    saleRecorded: 'Venta registrada', stockUpdated: '{{amount}} — stock actualizado.', viewPrintReceipt: 'Ver / Imprimir recibo',
    fromContacts: 'Desde contactos', scanToAdd: 'Escanear', noProducts: 'Sin productos. Añade stock primero.',
    items: '{{count}} artículo', items_other: '{{count}} artículos',
  },
  scan: {
    title: 'Escanear', permission: 'Se necesita permiso de cámara.', grant: 'Permitir cámara',
    pointProduct: 'Apunta a un código de barras o un QR de recibo.', notFound: 'Ningún producto coincide.',
  },
  methods: { cash: 'efectivo', transfer: 'transferencia', card: 'tarjeta', wallet: 'billetera', credit: 'crédito' },
};
export default es;
