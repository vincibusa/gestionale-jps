export interface Prodotto {
  id: string;
  nome: string;
  descrizione?: string;
  prezzo: number;
  categoria: string;
  unita_misura?: string;
  peso_medio?: number;
  allergeni?: string;
  codice_iva?: string;
  attivo?: boolean;
  created_at?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  partita_iva?: string;
  codice_fiscale?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  pec?: string;
  codice_destinatario?: string;
  split_payment?: boolean;
  cliente_abituale?: boolean;
  note_preferenze?: string;
  created_at?: string;
}

export interface Fattura {
  id: string;
  numero_fattura: number;
  anno_fattura: number;
  cliente_id?: string;
  cliente?: Cliente;
  data_fattura: string;
  subtotale: number;
  iva: number;
  totale: number;
  ritenuta_acconto?: number;
  cassa_previdenziale?: number;
  tipo_documento?: string;
  regime_fiscale?: string;
  causale?: string;
  note?: string;
  stato?: 'bozza' | 'emessa' | 'pagata' | 'annullata';
  data_pagamento?: string;
  metodo_pagamento?: string;
  created_at?: string;
  righe?: RigaFattura[];
}

export interface RigaFattura {
  id: string;
  fattura_id: string;
  prodotto_id?: string;
  prodotto?: Prodotto;
  descrizione: string;
  quantita: number;
  unita_misura?: string;
  prezzo_unitario: number;
  sconto_percentuale?: number;
  totale_riga: number;
  aliquota_iva: number;
  codice_iva: string;
}

export interface PagamentoPOS {
  id: string;
  data_pagamento: string;
  importo: number;
  descrizione?: string;
  note?: string;
  created_at?: string;
}

export interface MovimentoContanti {
  id: string;
  tipo: 'entrata' | 'uscita' | 'fondo_iniziale' | 'fondo_finale';
  importo: number;
  descrizione: string;
  data_movimento?: string;
  operatore?: string;
}

export interface FondoCassa {
  id: string;
  data: string;
  fondo_iniziale: number;
  vendite_contanti?: number;
  vendite_carta?: number;
  altre_entrate?: number;
  uscite?: number;
  fondo_teorico: number;
  fondo_effettivo?: number;
  differenza?: number;
  chiuso?: boolean;
  note?: string;
  created_at?: string;
}

export interface Movimento {
  id: string;
  tipo: 'entrata' | 'uscita';
  categoria: string;
  sottocategoria?: string;
  importo: number;
  descrizione: string;
  data_movimento: string;
  metodo_pagamento?: string;
  fornitore?: string;
  numero_documento?: string;
  deducibile?: boolean;
  created_at?: string;
}