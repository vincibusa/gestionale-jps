import { supabase } from '@/lib/supabase';

export interface PagamentoPOS {
  id: string;
  data_pagamento: string;
  importo: number;
  descrizione: string;
  note?: string;
  created_at?: string;
}

export async function getPagamentiPOS(): Promise<PagamentoPOS[]> {
  try {
    const { data, error } = await supabase
      .from('pagamenti_pos')
      .select('*')
      .order('data_pagamento', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Errore nel caricamento pagamenti POS:', error);
    return [];
  }
}

export async function getPagamentiPOSByDate(data: string): Promise<PagamentoPOS[]> {
  try {
    const { data: pagamenti, error } = await supabase
      .from('pagamenti_pos')
      .select('*')
      .eq('data_pagamento', data)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return pagamenti || [];
  } catch (error) {
    console.error('Errore nel caricamento pagamenti per data:', error);
    return [];
  }
}

export async function getDatesPagamentiPOS(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('pagamenti_pos')
      .select('data_pagamento')
      .order('data_pagamento', { ascending: false });

    if (error) throw error;

    // Rimuovi duplicati e restituisci array di date
    const dates = [...new Set(data?.map(p => p.data_pagamento) || [])];
    return dates;
  } catch (error) {
    console.error('Errore nel caricamento date pagamenti:', error);
    return [];
  }
}

export async function getTotalePagamentiOggi(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('pagamenti_pos')
      .select('importo')
      .eq('data_pagamento', new Date().toISOString().split('T')[0]);

    if (error) throw error;

    return data?.reduce((sum, p) => sum + Number(p.importo), 0) || 0;
  } catch (error) {
    console.error('Errore nel calcolo totale pagamenti oggi:', error);
    return 0;
  }
}

export async function addPagamentoPOS(pagamento: Omit<PagamentoPOS, 'id' | 'created_at'>): Promise<PagamentoPOS | null> {
  try {
    const { data, error } = await supabase
      .from('pagamenti_pos')
      .insert([pagamento])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Errore nell\'aggiunta pagamento POS:', error);
    throw error;
  }
}

export async function updatePagamentoPOS(id: string, pagamento: Partial<Omit<PagamentoPOS, 'id' | 'created_at'>>): Promise<PagamentoPOS | null> {
  try {
    const { data, error } = await supabase
      .from('pagamenti_pos')
      .update(pagamento)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Errore nell\'aggiornamento pagamento POS:', error);
    throw error;
  }
}

export async function deletePagamentoPOS(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pagamenti_pos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Errore nell\'eliminazione pagamento POS:', error);
    return false;
  }
}

export async function getPagamentoPOSById(id: string): Promise<PagamentoPOS | null> {
  try {
    const { data, error } = await supabase
      .from('pagamenti_pos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Errore nel caricamento pagamento POS:', error);
    return null;
  }
}