export const PRODOTTI_DEFAULT = [
  {
    nome: 'Pollo intero allo spiedo',
    categoria: 'Spiedo',
    descrizione: 'Pollo intero cotto allo spiedo con spezie',
    prezzo: 8.50,
    unita_misura: 'pz',
    peso_medio: 1.200,
    codice_iva: '10V'
  },
  {
    nome: 'Mezzo pollo',
    categoria: 'Spiedo',
    descrizione: 'Mezza porzione di pollo allo spiedo',
    prezzo: 4.50,
    unita_misura: 'pz',
    peso_medio: 0.600,
    codice_iva: '10V'
  },
  {
    nome: 'Cosce di pollo (2 pz)',
    categoria: 'Pezzi',
    descrizione: 'Due cosce di pollo',
    prezzo: 3.00,
    unita_misura: 'pz',
    peso_medio: 0.300,
    codice_iva: '10V'
  },
  {
    nome: 'Ali di pollo (4 pz)',
    categoria: 'Pezzi',
    descrizione: 'Quattro ali di pollo',
    prezzo: 2.50,
    unita_misura: 'pz',
    peso_medio: 0.200,
    codice_iva: '10V'
  },
  {
    nome: 'Petto di pollo',
    categoria: 'Pezzi',
    descrizione: 'Petto di pollo grigliato',
    prezzo: 4.00,
    unita_misura: 'pz',
    peso_medio: 0.250,
    codice_iva: '10V'
  },
  {
    nome: 'Arancini di pollo',
    categoria: 'Gastronomia',
    descrizione: 'Arancini siciliani con pollo',
    prezzo: 1.50,
    unita_misura: 'pz',
    peso_medio: 0.150,
    codice_iva: '10V'
  },
  {
    nome: 'Supplì',
    categoria: 'Gastronomia',
    descrizione: 'Supplì romani al telefono',
    prezzo: 1.00,
    unita_misura: 'pz',
    peso_medio: 0.080,
    codice_iva: '10V'
  },
  {
    nome: 'Panelle (2 pz)',
    categoria: 'Gastronomia',
    descrizione: 'Panelle siciliane fritte',
    prezzo: 0.50,
    unita_misura: 'pz',
    peso_medio: 0.050,
    codice_iva: '10V'
  },
  {
    nome: 'Patatine fritte',
    categoria: 'Contorni',
    descrizione: 'Porzione di patatine fritte',
    prezzo: 2.00,
    unita_misura: 'porzione',
    peso_medio: 0.200,
    codice_iva: '10V'
  }
];

export const CATEGORIE_PRODOTTI = [
  'Spiedo',
  'Pezzi',
  'Gastronomia',
  'Contorni',
  'Bevande'
] as const;

export const CATEGORIE_MOVIMENTI = {
  entrate: [
    'Vendite al banco',
    'Vendite asporto',
    'Catering/Eventi',
    'Altre entrate'
  ],
  uscite: [
    'Acquisto polli',
    'Ingredienti/Condimenti',
    'Utilities (luce/gas/acqua)',
    'Affitto',
    'Stipendi',
    'Carburante',
    'Manutenzioni',
    'Tasse e tributi',
    'Altre spese'
  ]
};