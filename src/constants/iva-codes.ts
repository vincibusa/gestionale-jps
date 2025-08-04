export const IVA_CODES = {
  '22V': { rate: 22, description: 'Iva 22% - Ordinaria' },
  '10V': { rate: 10, description: 'Iva 10% - Ridotta alimentari' },
  '4V': { rate: 4, description: 'Iva 4% - Super ridotta' },
  'N1': { rate: 0, description: 'Escluso ex art. 15' },
  'N2.1': { rate: 0, description: 'Non soggetto' },
  'N3.1': { rate: 0, description: 'Non imponibile - esportazioni' },
  'N6.9': { rate: 0, description: 'Reverse charge' }
} as const;

export const REGIMI_FISCALI = {
  'RF01': 'Ordinario',
  'RF02': 'Contribuenti minimi',
  'RF04': 'Agricoltura e attività connesse',
  'RF05': 'Vendita sali e tabacchi',
  'RF19': 'Forfettario'
} as const;

export const TIPI_DOCUMENTO = {
  'TD01': 'Fattura',
  'TD02': 'Acconto/Anticipo su fattura',
  'TD03': 'Acconto/Anticipo su parcella',
  'TD04': 'Nota di credito',
  'TD05': 'Nota di debito',
  'TD06': 'Parcella'
} as const;

export const METODI_PAGAMENTO = [
  'Contanti',
  'Bonifico bancario',
  'Carta di credito/debito',
  'Assegno',
  'PayPal',
  'Altro'
] as const;