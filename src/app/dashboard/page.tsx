'use client';

import { useEffect, useState } from 'react';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Currency } from '@/components/ui/currency';
import { Euro, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getStatoCassaCompleto, getStatisticheMensili } from '@/lib/services/cassa';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [incassiOggi, setIncassiOggi] = useState(0);
  const [incassiMese, setIncassiMese] = useState(0);

  const today = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  async function loadData() {
    try {
      setLoading(true);
      const [stato, mensili] = await Promise.all([
        getStatoCassaCompleto(today),
        getStatisticheMensili(year, month)
      ]);

      const oggi = (stato.vendite_contanti || 0) + (stato.vendite_carta || 0) + (stato.altre_entrate || 0);
      setIncassiOggi(oggi);
      setIncassiMese(mensili.totale_incassi || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamenti_pos' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimenti_contanti' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fondo_cassa' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <ResponsiveLayout title="Home">
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <Card className="card-elevated animate-scale-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <div className="w-6 h-6 gradient-green rounded-lg flex items-center justify-center mr-2">
                  <Euro className="h-4 w-4 text-white" />
                </div>
                Incassi Oggi
                <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">{new Date().toLocaleDateString('it-IT')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl lg:text-4xl font-bold text-success">
                {loading ? '...' : <Currency amount={incassiOggi} />}
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated animate-scale-in" style={{animationDelay: '0.1s'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <div className="w-6 h-6 gradient-warm rounded-lg flex items-center justify-center mr-2">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                Incassi Mensili
                <Badge className="ml-2 bg-orange-100 text-orange-800 border-orange-200">{new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl lg:text-4xl font-bold text-warm">
                {loading ? '...' : <Currency amount={incassiMese} />}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResponsiveLayout>
  );
}