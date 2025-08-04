import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  venditeOggi: number;
  incassiSettimana: number;
  fattureEmesse: number;
  saldoCassa: number;
  pagamentiPOS: number;
  topProdotto?: {
    nome: string;
    quantita: number;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Pagamenti POS oggi
    const { data: pagamentiOggi } = await supabase
      .from('pagamenti_pos')
      .select('importo')
      .eq('data_pagamento', new Date().toISOString().split('T')[0]);

    const pagamentiPOSOggi = pagamentiOggi?.reduce((sum, p) => sum + Number(p.importo), 0) || 0;

    // Pagamenti POS ultima settimana
    const dataSettimanaFa = new Date();
    dataSettimanaFa.setDate(dataSettimanaFa.getDate() - 7);

    const { data: pagamentiSettimana } = await supabase
      .from('pagamenti_pos')
      .select('importo')
      .gte('data_pagamento', dataSettimanaFa.toISOString().split('T')[0]);

    const incassiSettimana = pagamentiSettimana?.reduce((sum, p) => sum + Number(p.importo), 0) || 0;

    // Fatture emesse questo mese
    const { count: fattureCount } = await supabase
      .from('fatture')
      .select('*', { count: 'exact', head: true })
      .eq('anno_fattura', new Date().getFullYear())
      .gte('data_fattura', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);

    // Saldo cassa (simulato)
    const saldoCassa = 450.75;

    return {
      venditeOggi: pagamentiPOSOggi,
      incassiSettimana,
      fattureEmesse: fattureCount || 0,
      saldoCassa,
      pagamentiPOS: pagamentiPOSOggi
    };
  } catch (error) {
    console.error('Errore nel caricamento delle statistiche:', error);
    // Fallback ai dati mock
    return {
      venditeOggi: 89.00,
      incassiSettimana: 552.00,
      fattureEmesse: 8,
      saldoCassa: 450.75,
      pagamentiPOS: 89.00
    };
  }
}

export async function getRecentActivity() {
  try {
    const { data: pagamenti } = await supabase
      .from('pagamenti_pos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    return pagamenti?.map(p => ({
      id: p.id,
      tipo: 'pagamento_pos',
      descrizione: p.descrizione,
      importo: Number(p.importo),
      data: p.created_at,
      icon: 'CreditCard'
    })) || [];
  } catch (error) {
    console.error('Errore nel caricamento attività recenti:', error);
    return [
      {
        id: '1',
        tipo: 'pagamento_pos',
        descrizione: 'Pagamento POS',
        importo: 28.50,
        data: new Date().toISOString(),
        icon: 'CreditCard'
      },
      {
        id: '2',
        tipo: 'vendita_contanti',
        descrizione: 'Vendita contanti',
        importo: 15.50,
        data: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        icon: 'Euro'
      }
    ];
  }
}