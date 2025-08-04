import { supabase } from '@/lib/supabase';

export interface MovimentoContanti {
  id: string;
  tipo: 'entrata' | 'uscita' | 'fondo_iniziale' | 'fondo_finale';
  importo: number;
  descrizione: string;
  data_movimento: string;
  operatore?: string;
}

export interface FondoCassa {
  id: string;
  data: string;
  fondo_iniziale: number;
  vendite_contanti: number;
  vendite_carta: number;
  altre_entrate: number;
  uscite: number;
  fondo_teorico: number;
  fondo_effettivo?: number;
  differenza?: number;
  chiuso: boolean;
  note?: string;
  created_at: string;
}

export interface StatoCassa {
  data: string;
  aperta: boolean;
  fondo_iniziale: number;
  vendite_contanti: number;
  vendite_carta: number;
  altre_entrate: number;
  uscite: number;
  fondo_teorico: number;
  fondo_effettivo?: number;
  differenza?: number;
  movimenti_contanti: MovimentoContanti[];
}

// Ottieni il fondo cassa per una data specifica
export async function getFondoCassaByData(data: string): Promise<FondoCassa | null> {
  try {
    const { data: fondoData, error } = await supabase
      .from('fondo_cassa')
      .select('*')
      .eq('data', data)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    return fondoData;
  } catch (error) {
    console.error('Errore nel caricamento fondo cassa:', error);
    return null;
  }
}

// Ottieni tutti i fondi cassa ordinati per data
export async function getAllFondiCassa(): Promise<FondoCassa[]> {
  try {
    const { data, error } = await supabase
      .from('fondo_cassa')
      .select('*')
      .order('data', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Errore nel caricamento fondi cassa:', error);
    return [];
  }
}

// Ottieni i movimenti contanti per una data
export async function getMovimentiContantiByData(data: string): Promise<MovimentoContanti[]> {
  try {
    const startDate = `${data} 00:00:00`;
    const endDate = `${data} 23:59:59`;

    const { data: movimenti, error } = await supabase
      .from('movimenti_contanti')
      .select('*')
      .gte('data_movimento', startDate)
      .lte('data_movimento', endDate)
      .order('data_movimento', { ascending: true });

    if (error) throw error;

    return movimenti || [];
  } catch (error) {
    console.error('Errore nel caricamento movimenti contanti:', error);
    return [];
  }
}

// Ottieni il totale pagamenti POS per una data
export async function getTotalePOSByData(data: string): Promise<number> {
  try {
    const { data: pagamenti, error } = await supabase
      .from('pagamenti_pos')
      .select('importo')
      .eq('data_pagamento', data);

    if (error) throw error;

    const totale = pagamenti?.reduce((sum, p) => sum + parseFloat(p.importo.toString()), 0) || 0;
    return totale;
  } catch (error) {
    console.error('Errore nel calcolo totale POS:', error);
    return 0;
  }
}

// Calcola stato cassa completo per una data
export async function getStatoCassaCompleto(data: string): Promise<StatoCassa> {
  try {
    const [fondoCassa, movimentiContanti, totalePOS] = await Promise.all([
      getFondoCassaByData(data),
      getMovimentiContantiByData(data),
      getTotalePOSByData(data)
    ]);

    // Calcola totali dai movimenti se il fondo non esiste
    const fondoIniziale = fondoCassa?.fondo_iniziale || 
      movimentiContanti.find(m => m.tipo === 'fondo_iniziale')?.importo || 0;
    
    const venditeContanti = fondoCassa?.vendite_contanti || 
      movimentiContanti
        .filter(m => m.tipo === 'entrata')
        .reduce((sum, m) => sum + m.importo, 0);
    
    const uscite = fondoCassa?.uscite || 
      movimentiContanti
        .filter(m => m.tipo === 'uscita')
        .reduce((sum, m) => sum + m.importo, 0);

    const venditeCarti = fondoCassa?.vendite_carta || totalePOS;
    const altreEntrate = fondoCassa?.altre_entrate || 0;
    const fondoTeorico = fondoIniziale + venditeContanti + altreEntrate - uscite;

    return {
      data,
      aperta: !fondoCassa?.chiuso,
      fondo_iniziale: fondoIniziale,
      vendite_contanti: venditeContanti,
      vendite_carta: venditeCarti,
      altre_entrate: altreEntrate,
      uscite,
      fondo_teorico: fondoTeorico,
      fondo_effettivo: fondoCassa?.fondo_effettivo,
      differenza: fondoCassa?.differenza,
      movimenti_contanti: movimentiContanti
    };
  } catch (error) {
    console.error('Errore nel calcolo stato cassa:', error);
    throw error;
  }
}

// Aggiungi movimento contanti
export async function addMovimentoContanti(movimento: Omit<MovimentoContanti, 'id'>): Promise<MovimentoContanti | null> {
  try {
    const { data, error } = await supabase
      .from('movimenti_contanti')
      .insert([movimento])
      .select()
      .single();

    if (error) throw error;

    // Aggiorna automaticamente il fondo cassa se esiste
    await updateFondoCassaFromMovimenti(movimento.data_movimento.split(' ')[0]);

    return data;
  } catch (error) {
    console.error('Errore nell\'aggiunta movimento:', error);
    throw error;
  }
}

// Aggiorna il fondo cassa basandosi sui movimenti
async function updateFondoCassaFromMovimenti(data: string): Promise<void> {
  try {
    const statoCassa = await getStatoCassaCompleto(data);
    
    const { error } = await supabase
      .from('fondo_cassa')
      .upsert({
        data,
        fondo_iniziale: statoCassa.fondo_iniziale,
        vendite_contanti: statoCassa.vendite_contanti,
        vendite_carta: statoCassa.vendite_carta,
        altre_entrate: statoCassa.altre_entrate,
        uscite: statoCassa.uscite,
        fondo_teorico: statoCassa.fondo_teorico
      });

    if (error) throw error;
  } catch (error) {
    console.error('Errore nell\'aggiornamento fondo cassa:', error);
    throw error;
  }
}

// Chiudi cassa
export async function chiudiCassa(data: string, fondoEffettivo: number, note?: string): Promise<boolean> {
  try {
    const statoCassa = await getStatoCassaCompleto(data);
    const differenza = fondoEffettivo - statoCassa.fondo_teorico;

    const { error } = await supabase
      .from('fondo_cassa')
      .upsert({
        data,
        fondo_iniziale: statoCassa.fondo_iniziale,
        vendite_contanti: statoCassa.vendite_contanti,
        vendite_carta: statoCassa.vendite_carta,
        altre_entrate: statoCassa.altre_entrate,
        uscite: statoCassa.uscite,
        fondo_teorico: statoCassa.fondo_teorico,
        fondo_effettivo: fondoEffettivo,
        differenza,
        chiuso: true,
        note
      });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Errore nella chiusura cassa:', error);
    return false;
  }
}

// Apri cassa
export async function apriCassa(data: string, fondoIniziale: number): Promise<boolean> {
  try {
    // Registra il movimento di fondo iniziale
    await addMovimentoContanti({
      tipo: 'fondo_iniziale',
      importo: fondoIniziale,
      descrizione: 'Fondo cassa apertura giornata',
      data_movimento: `${data} 08:00:00`,
      operatore: 'Sistema'
    });

    return true;
  } catch (error) {
    console.error('Errore nell\'apertura cassa:', error);
    return false;
  }
}

// Statistiche cassa mensili
export async function getStatisticheMensili(anno: number, mese: number) {
  try {
    const startDate = `${anno}-${mese.toString().padStart(2, '0')}-01`;
    const endDate = `${anno}-${mese.toString().padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from('fondo_cassa')
      .select('*')
      .gte('data', startDate)
      .lte('data', endDate)
      .eq('chiuso', true);

    if (error) throw error;

    const fondi = data || [];
    
    return {
      giorni_aperti: fondi.length,
      totale_vendite_contanti: fondi.reduce((sum, f) => sum + parseFloat(f.vendite_contanti.toString()), 0),
      totale_vendite_carta: fondi.reduce((sum, f) => sum + parseFloat(f.vendite_carta.toString()), 0),
      totale_uscite: fondi.reduce((sum, f) => sum + parseFloat(f.uscite.toString()), 0),
      differenze_totali: fondi.reduce((sum, f) => sum + (parseFloat(f.differenza?.toString() || '0')), 0),
      media_giornaliera: fondi.length > 0 ? 
        fondi.reduce((sum, f) => sum + parseFloat(f.vendite_contanti.toString()) + parseFloat(f.vendite_carta.toString()), 0) / fondi.length : 0
    };
  } catch (error) {
    console.error('Errore nel calcolo statistiche mensili:', error);
    throw error;
  }
}