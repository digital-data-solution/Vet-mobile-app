/** Portuguese (Português) — mirrors en keys; gaps fall back to English. */
const pt = {
  common: {
    cancel: 'Cancelar', save: 'Guardar', close: 'Fechar', back: 'Voltar', done: 'Concluído',
    share: 'Partilhar', print: 'Imprimir', email: 'E-mail', copy: 'Copiar', copied: 'Copiado',
    loading: 'A carregar…', error: 'Erro', success: 'Sucesso', search: 'Pesquisar…',
    total: 'Total', subtotal: 'Subtotal', discount: 'Desconto', payment: 'Pagamento',
    customer: 'Cliente', phone: 'Telefone', name: 'Nome', note: 'Nota', optional: 'opcional',
    today: 'Hoje', thisMonth: 'Este mês', profit: 'lucro', language: 'Idioma',
  },
  biz: {
    title: 'Suite de Negócio', recordSale: 'Registar uma venda', recordSaleDesc: 'Cobre — o stock atualiza na hora',
    inventory: 'Inventário', inventoryDesc: 'Produtos, níveis de stock, reposição',
    reports: 'Vendas e Relatórios', reportsDesc: 'Receitas, lucros, detalhe por vendedor',
    dayClose: 'Fecho e Relatórios', dayCloseDesc: 'Equilibre a caixa, feche cada dia, CSV mensal',
    reps: 'Vendedores', repsDesc: 'Adicione pessoal, acessos e permissões',
    receiptSettings: 'Definições do recibo', receiptSettingsDesc: 'O seu logo e dados em cada recibo',
    auditLog: 'Registo de auditoria', auditLogDesc: 'Cada movimento de stock, quem e quando',
    upgrade: 'Atualizar / Renovar', scan: 'Digitalizar', scanDesc: 'Digitalize um produto ou um QR de recibo',
    sellingAs: 'A vender como', owner: 'Proprietário', signedInAs: 'Sessão iniciada como', logout: 'Terminar sessão', switch: 'Mudar',
    salesToday: '{{count}} venda hoje', salesToday_other: '{{count}} vendas hoje',
    products: '{{count}} produtos', low: '{{count}} baixo',
  },
  receipt: {
    title: 'Recibo', receiptNo: 'Recibo', servedBy: 'Atendido por', thankYou: 'Obrigado pela preferência!',
    printSave: 'Imprimir / PDF', sharePdf: 'Partilhar', sendToCustomer: 'Enviar ao cliente', emailInvoice: 'Fatura por e-mail',
    notAvailable: 'Recibo indisponível.', item: 'Artigo', qty: 'Qtd', price: 'Preço',
  },
  day: {
    day: 'Dia', month: 'Mês', closeDay: 'Fechar dia', reCloseDay: 'Reabrir fecho',
    exportCsv: 'Exportar CSV', exportMonthlyCsv: 'Exportar CSV mensal',
    openingFloat: 'Fundo inicial', cashCounted: 'Dinheiro contado', expectedCash: 'Dinheiro esperado',
    variance: 'Diferença', balanced: 'Equilibrado', over: 'Excesso {{amount}}', short: 'Falta {{amount}}',
    signOffClose: 'Assinar e Fechar', transactions: 'Transações', byRep: 'Por vendedor', dayByDay: 'Dia a dia',
    noSales: 'Sem vendas neste dia.', noSalesMonth: 'Sem vendas este mês.', closedBy: 'Fechado por {{name}}',
    open: 'aberto', closed: 'fechado', countHint: 'Conte a caixa e assine. Dinheiro de hoje: {{amount}}.',
    dayClosedMsg: '{{date}} assinado. Líquido {{amount}}.',
  },
  settings: {
    intro: 'Isto aparece em cada recibo que imprime ou partilha.',
    businessName: 'Nome do negócio (cabeçalho)', address: 'Morada', receiptPrefix: 'Prefixo do número de recibo',
    footerNote: 'Nota de rodapé', uploadLogo: 'Carregar logo', changeLogo: 'Mudar logo', noLogo: 'Sem logo',
    currency: 'Moeda', timezone: 'Fuso horário', saveSettings: 'Guardar definições', saved: 'As suas definições foram atualizadas.',
  },
  sale: {
    reviewPay: 'Rever e Pagar →', complete: 'Concluir venda', recordSale: 'Registar venda',
    paymentMethod: 'Método de pagamento', outOfStock: 'Sem stock', onlyLeft: 'Apenas {{count}} de {{name}} restantes.',
    saleRecorded: 'Venda registada', stockUpdated: '{{amount}} — stock atualizado.', viewPrintReceipt: 'Ver / Imprimir recibo',
    fromContacts: 'Dos contactos', scanToAdd: 'Digitalizar', noProducts: 'Sem produtos. Adicione stock primeiro.',
    items: '{{count}} artigo', items_other: '{{count}} artigos',
  },
  scan: {
    title: 'Digitalizar', permission: 'É necessária permissão da câmara.', grant: 'Permitir câmara',
    pointProduct: 'Aponte a um código de barras ou QR de recibo.', notFound: 'Nenhum produto corresponde.',
  },
  methods: { cash: 'dinheiro', transfer: 'transferência', card: 'cartão', wallet: 'carteira', credit: 'crédito' },
};
export default pt;
