import { supabase } from '@/lib/supabase';
import type { Prodotto } from '@/types/database';

export type { Prodotto };

export async function getProdotti(): Promise<Prodotto[]> {
  try {
    const { data, error } = await supabase
      .from('prodotti')
      .select('*')
      .eq('attivo', true)
      .order('categoria', { ascending: true })
      .order('nome', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Errore nel caricamento prodotti:', error);
    return [];
  }
}

export async function getProdottiByCategoria(): Promise<Record<string, Prodotto[]>> {
  try {
    const prodotti = await getProdotti();
    
    const grouped = prodotti.reduce((acc, prodotto) => {
      const categoria = prodotto.categoria;
      if (!acc[categoria]) {
        acc[categoria] = [];
      }
      acc[categoria].push(prodotto);
      return acc;
    }, {} as Record<string, Prodotto[]>);

    return grouped;
  } catch (error) {
    console.error('Errore nel raggruppamento prodotti:', error);
    return {};
  }
}

export async function addProdotto(prodotto: Omit<Prodotto, 'id' | 'created_at'>): Promise<Prodotto | null> {
  try {
    const { data, error } = await supabase
      .from('prodotti')
      .insert([prodotto])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Errore nell\'aggiunta prodotto:', error);
    throw error;
  }
}

export async function updateProdotto(id: string, prodotto: Partial<Prodotto>): Promise<Prodotto | null> {
  try {
    const { data, error } = await supabase
      .from('prodotti')
      .update(prodotto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Errore nell\'aggiornamento prodotto:', error);
    throw error;
  }
}

export async function deleteProdotto(id: string): Promise<boolean> {
  try {
    // Soft delete - impostiamo attivo = false
    const { error } = await supabase
      .from('prodotti')
      .update({ attivo: false })
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Errore nell\'eliminazione prodotto:', error);
    return false;
  }
}

export const CATEGORIE_PRODOTTI = [
  'Spiedo',
  'Pezzi',
  'Gastronomia',
  'Contorni',
  'Bevande'
] as const;