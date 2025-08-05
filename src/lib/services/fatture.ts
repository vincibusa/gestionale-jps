import { supabase } from '@/lib/supabase';

// Utility per validazione fiscale italiana
export function validatePartitaIva(partitaIva: string): boolean {
  if (!partitaIva || partitaIva.length !== 11) return false;
  
  // Rimuovi spazi e caratteri non numerici
  const cleaned = partitaIva.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  
  // Algoritmo di controllo per P.IVA italiana
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(cleaned[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit = Math.floor(digit / 10) + (digit % 10);
    }
    sum += digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleaned[10]);
}

export function validateCodiceFiscale(codiceFiscale: string): boolean {
  if (!codiceFiscale) return false;
  
  // Rimuovi spazi e converti in maiuscolo
  const cleaned = codiceFiscale.replace(/\s/g, '').toUpperCase();
  
  // Verifica lunghezza
  if (cleaned.length !== 16) return false;
  
  // Verifica formato: 6 lettere + 2 numeri + 1 lettera + 2 numeri + 1 lettera + 3 caratteri
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9A-Z]{3}$/;
  return regex.test(cleaned);
}

export function validateCodiceDestinatario(codice: string): boolean {
  if (!codice) return false;
  
  // Codice destinatario deve essere esattamente 7 caratteri alfanumerici
  // o "0000000" per PEC
  const cleaned = codice.replace(/\s/g, '').toUpperCase();
  return cleaned.length === 7 && /^[A-Z0-9]{7}$/.test(cleaned);
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

export interface RigaFattura {
  id: string;
  fattura_id: string;
  prodotto_id?: string;
  descrizione: string;
  quantita: number;
  unita_misura?: string;
  prezzo_unitario: number;
  sconto_percentuale?: number;
  totale_riga: number;
  aliquota_iva: number;
  codice_iva: string;
}

export interface Fattura {
  id: string;
  numero_fattura: number;
  anno_fattura: number;
  cliente_id?: string;
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
  stato: 'bozza' | 'emessa' | 'inviata' | 'pagata' | 'annullata';
  data_pagamento?: string;
  metodo_pagamento?: string;
  // Campi fatturazione elettronica italiana
  codice_destinatario?: string;
  pec_destinatario?: string;
  progressivo_invio?: number;
  data_invio_sdi?: string;
  identificativo_sdi?: string;
  created_at?: string;
  // Joined data
  cliente_nome?: string;
  righe_fatture?: RigaFattura[];
}

export interface FattureStats {
  totale_fatture: number;
  totale_fatturato: number;
  fatture_pagate: number;
  fatture_da_pagare: number;
  importo_da_pagare: number;
  fatture_mese_corrente: number;
  fatturato_mese_corrente: number;
}

// Ottieni tutte le fatture con filtri
export async function getFatture(filtri?: {
  anno?: number;
  mese?: number;
  stato?: string;
  cliente_id?: string;
  limit?: number;
  offset?: number;
}): Promise<Fattura[]> {
  try {
    let query = supabase
      .from('fatture')
      .select(`
        *,
        clienti!inner(nome)
      `)
      .order('anno_fattura', { ascending: false })
      .order('numero_fattura', { ascending: false });

    if (filtri?.anno) {
      query = query.eq('anno_fattura', filtri.anno);
    }

    if (filtri?.mese) {
      const startDate = `${filtri.anno || new Date().getFullYear()}-${filtri.mese.toString().padStart(2, '0')}-01`;
      const endDate = `${filtri.anno || new Date().getFullYear()}-${filtri.mese.toString().padStart(2, '0')}-31`;
      query = query.gte('data_fattura', startDate).lte('data_fattura', endDate);
    }

    if (filtri?.stato) {
      query = query.eq('stato', filtri.stato);
    }

    if (filtri?.cliente_id) {
      query = query.eq('cliente_id', filtri.cliente_id);
    }

    if (filtri?.limit) {
      query = query.limit(filtri.limit);
    }

    if (filtri?.offset) {
      query = query.range(filtri.offset, filtri.offset + (filtri.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(fattura => ({
      ...fattura,
      cliente_nome: fattura.clienti?.nome
    }));
  } catch (error) {
    console.error('Errore nel caricamento fatture:', error);
    return [];
  }
}

// Ottieni una fattura specifica con righe
export async function getFatturaById(id: string): Promise<Fattura | null> {
  try {
    const { data: fattura, error: fatturaError } = await supabase
      .from('fatture')
      .select(`
        *,
        clienti(*)
      `)
      .eq('id', id)
      .single();

    if (fatturaError) throw fatturaError;

    const { data: righe, error: righeError } = await supabase
      .from('righe_fatture')
      .select('*')
      .eq('fattura_id', id)
      .order('id');

    if (righeError) throw righeError;

    return {
      ...fattura,
      cliente_nome: fattura.clienti?.nome,
      righe_fatture: righe || []
    };
  } catch (error) {
    console.error('Errore nel caricamento fattura:', error);
    return null;
  }
}

// Ottieni tutti i clienti
export async function getClienti(): Promise<Cliente[]> {
  try {
    const { data, error } = await supabase
      .from('clienti')
      .select('*')
      .order('nome');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Errore nel caricamento clienti:', error);
    return [];
  }
}

// Ottieni prossimo numero fattura per l'anno specificato
// Conforme alla legge italiana: numerazione progressiva per anno solare
export async function getNextNumeroFattura(anno: number): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('fatture')
      .select('numero_fattura')
      .eq('anno_fattura', anno)
      .order('numero_fattura', { ascending: false })
      .limit(1);

    if (error) throw error;

    // Se non ci sono fatture per questo anno, inizia da 1
    // Altrimenti prendi il numero più alto e aggiungi 1
    return (data && data.length > 0) ? data[0].numero_fattura + 1 : 1;
  } catch (error) {
    console.error('Errore nel calcolo numero fattura:', error);
    // In caso di errore, prova a ottenere il massimo con una query diversa
    try {
      const { data: maxData, error: maxError } = await supabase
        .from('fatture')
        .select('numero_fattura')
        .eq('anno_fattura', anno)
        .order('numero_fattura', { ascending: false })
        .limit(1);
      
      if (maxError) throw maxError;
      return (maxData && maxData.length > 0) ? maxData[0].numero_fattura + 1 : 1;
    } catch (retryError) {
      console.error('Errore anche nel retry:', retryError);
      return 1;
    }
  }
}

// Crea nuova fattura
export async function createFattura(
  fattura: Omit<Fattura, 'id' | 'numero_fattura' | 'created_at'>,
  righeFatture: Omit<RigaFattura, 'id' | 'fattura_id'>[]
): Promise<Fattura | null> {
  try {
    // Ottieni il prossimo numero fattura
    const numeroFattura = await getNextNumeroFattura(fattura.anno_fattura);

    // Crea la fattura
    const { data: nuovaFattura, error: fatturaError } = await supabase
      .from('fatture')
      .insert([{
        ...fattura,
        numero_fattura: numeroFattura
      }])
      .select()
      .single();

    if (fatturaError) throw fatturaError;

    // Crea le righe fattura
    if (righeFatture.length > 0) {
      const righeConFatturaId = righeFatture.map(riga => ({
        ...riga,
        fattura_id: nuovaFattura.id
      }));

      const { error: righeError } = await supabase
        .from('righe_fatture')
        .insert(righeConFatturaId);

      if (righeError) throw righeError;
    }

    return nuovaFattura;
  } catch (error) {
    console.error('Errore nella creazione fattura:', error);
    throw error;
  }
}

// Aggiorna fattura
export async function updateFattura(
  id: string,
  fattura: Partial<Omit<Fattura, 'id' | 'created_at'>>,
  righeFatture?: Omit<RigaFattura, 'id' | 'fattura_id'>[]
): Promise<Fattura | null> {
  try {
    // Aggiorna la fattura
    const { data: fatturaAggiornata, error: fatturaError } = await supabase
      .from('fatture')
      .update(fattura)
      .eq('id', id)
      .select()
      .single();

    if (fatturaError) throw fatturaError;

    // Se sono fornite le righe, aggiorna anche quelle
    if (righeFatture) {
      // Elimina le righe esistenti
      await supabase
        .from('righe_fatture')
        .delete()
        .eq('fattura_id', id);

      // Inserisci le nuove righe
      if (righeFatture.length > 0) {
        const righeConFatturaId = righeFatture.map(riga => ({
          ...riga,
          fattura_id: id
        }));

        const { error: righeError } = await supabase
          .from('righe_fatture')
          .insert(righeConFatturaId);

        if (righeError) throw righeError;
      }
    }

    return fatturaAggiornata;
  } catch (error) {
    console.error('Errore nell\'aggiornamento fattura:', error);
    throw error;
  }
}

// Elimina fattura
export async function deleteFattura(id: string): Promise<boolean> {
  try {
    // Elimina prima le righe fattura
    await supabase
      .from('righe_fatture')
      .delete()
      .eq('fattura_id', id);

    // Elimina la fattura
    const { error } = await supabase
      .from('fatture')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Errore nell\'eliminazione fattura:', error);
    return false;
  }
}

// Ottieni statistiche fatture
export async function getFattureStats(): Promise<FattureStats> {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const { data, error } = await supabase
      .from('fatture')
      .select('totale, stato, data_fattura')
      .eq('anno_fattura', currentYear);

    if (error) throw error;

    const fatture = data || [];
    
    const totalefatture = fatture.length;
    const totaleFatturato = fatture.reduce((sum, f) => sum + parseFloat(f.totale.toString()), 0);
    const fatturePagate = fatture.filter(f => f.stato === 'pagata').length;
    const fattureDaPagare = fatture.filter(f => f.stato === 'emessa').length;
    const importoDaPagare = fatture
      .filter(f => f.stato === 'emessa')
      .reduce((sum, f) => sum + parseFloat(f.totale.toString()), 0);

    const fattureMeseCorrente = fatture.filter(f => {
      const dataFattura = new Date(f.data_fattura);
      return dataFattura.getMonth() + 1 === currentMonth;
    }).length;

    const fatturatoMeseCorrente = fatture
      .filter(f => {
        const dataFattura = new Date(f.data_fattura);
        return dataFattura.getMonth() + 1 === currentMonth;
      })
      .reduce((sum, f) => sum + parseFloat(f.totale.toString()), 0);

    return {
      totale_fatture: totalefatture,
      totale_fatturato: totaleFatturato,
      fatture_pagate: fatturePagate,
      fatture_da_pagare: fattureDaPagare,
      importo_da_pagare: importoDaPagare,
      fatture_mese_corrente: fattureMeseCorrente,
      fatturato_mese_corrente: fatturatoMeseCorrente
    };
  } catch (error) {
    console.error('Errore nel calcolo statistiche:', error);
    return {
      totale_fatture: 0,
      totale_fatturato: 0,
      fatture_pagate: 0,
      fatture_da_pagare: 0,
      importo_da_pagare: 0,
      fatture_mese_corrente: 0,
      fatturato_mese_corrente: 0
    };
  }
}

// Ottieni periodi disponibili (anni/mesi con fatture)
export async function getPeriodiDisponibili(): Promise<{anno: number, mese: number, count: number}[]> {
  try {
    const { data, error } = await supabase
      .from('fatture')
      .select('data_fattura')
      .order('data_fattura', { ascending: false });

    if (error) throw error;

    const periodi = new Map<string, number>();
    
    (data || []).forEach(fattura => {
      const data = new Date(fattura.data_fattura);
      const key = `${data.getFullYear()}-${data.getMonth() + 1}`;
      periodi.set(key, (periodi.get(key) || 0) + 1);
    });

    return Array.from(periodi.entries()).map(([key, count]) => {
      const [anno, mese] = key.split('-').map(Number);
      return { anno, mese, count };
    }).sort((a, b) => {
      if (a.anno !== b.anno) return b.anno - a.anno;
      return b.mese - a.mese;
    });
  } catch (error) {
    console.error('Errore nel caricamento periodi:', error);
    return [];
  }
}

// Calcola totali fattura dalle righe
export function calcolaTotaliFattura(righe: Omit<RigaFattura, 'id' | 'fattura_id'>[]): {
  subtotale: number;
  iva: number;
  totale: number;
} {
  let subtotale = 0;
  let iva = 0;

  righe.forEach(riga => {
    const totaleRiga = riga.quantita * riga.prezzo_unitario * (1 - (riga.sconto_percentuale || 0) / 100);
    subtotale += totaleRiga;
    iva += totaleRiga * (riga.aliquota_iva / 100);
  });

  return {
    subtotale: Math.round(subtotale * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    totale: Math.round((subtotale + iva) * 100) / 100
  };
}