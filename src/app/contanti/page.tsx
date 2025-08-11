'use client';

import { useState, useEffect, useMemo } from 'react';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Euro, 
  TrendingUp, 
  TrendingDown,
  Lock,
  Unlock,
  Calendar,
  History,
  Plus,
  ChevronLeft,
  ChevronRight,
  Minus,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getTodayInItalianTimezone, dateToString, stringToDate } from '@/lib/date-utils';
import { Currency } from '@/components/ui/currency';
import { 
  getStatoCassaCompleto, 
  addMovimentoContanti, 
  chiudiCassa, 
  apriCassa,
  getAllFondiCassa,
  getTotalePOSByData,
  type StatoCassa,
  type FondoCassa 
} from '@/lib/services/cassa';
import { supabase } from '@/lib/supabase';

export default function ContantiPage() {
  const [cassaStatus, setCassaStatus] = useState<StatoCassa | null>(null);
  const [fondiStorici, setFondiStorici] = useState<FondoCassa[]>([]);
  const [posDataByDate, setPosDataByDate] = useState<Record<string, number>>({});
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayInItalianTimezone());
  const [showMovimentoModal, setShowMovimentoModal] = useState(false);
  const [showChiusuraModal, setShowChiusuraModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [movimentoForm, setMovimentoForm] = useState({
    tipo: 'entrata' as 'entrata' | 'uscita',
    importo: '',
    descrizione: '',
    operatore: 'Giuseppe'
  });

  const [chiusuraForm, setChiusuraForm] = useState({
    fondo_effettivo: '',
    note: ''
  });

  const [storicoView, setStoricoView] = useState<'giorni' | 'mesi'>('giorni');

  const storicoMensile = useMemo(() => {
    const gruppi: Record<string, {
      contanti: number;
      carta: number;
      uscite: number;
      giorni_aperti: number;
      differenze_totali: number;
    }> = {};

    for (const f of fondiStorici) {
      const mese = f.data.slice(0, 7);
      if (!gruppi[mese]) {
        gruppi[mese] = { contanti: 0, carta: 0, uscite: 0, giorni_aperti: 0, differenze_totali: 0 };
      }
      gruppi[mese].contanti += parseFloat((f.vendite_contanti ?? 0).toString());
      // Use real POS data instead of stored vendite_carta
      gruppi[mese].carta += posDataByDate[f.data] || parseFloat((f.vendite_carta ?? 0).toString());
      gruppi[mese].uscite += parseFloat((f.uscite ?? 0).toString());
      gruppi[mese].differenze_totali += parseFloat((f.differenza ?? 0).toString());
      if (f.chiuso) gruppi[mese].giorni_aperti += 1;
    }

    return Object.entries(gruppi)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([mese, valori]) => ({ mese, ...valori }));
  }, [fondiStorici, posDataByDate]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-cassa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimenti_contanti' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fondo_cassa' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamenti_pos' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statoData, fondiData] = await Promise.all([
        getStatoCassaCompleto(selectedDate),
        getAllFondiCassa()
      ]);
      setCassaStatus(statoData);
      setFondiStorici(fondiData);
      
      // Load real POS data for all historical dates
      const uniqueDates = [...new Set(fondiData.map(f => f.data))];
      const posDataPromises = uniqueDates.map(async (date) => {
        const posTotal = await getTotalePOSByData(date);
        return { date, total: posTotal };
      });
      
      const posResults = await Promise.all(posDataPromises);
      const posDataMap: Record<string, number> = {};
      posResults.forEach(({ date, total }) => {
        posDataMap[date] = total;
      });
      setPosDataByDate(posDataMap);
      
      const today = getTodayInItalianTimezone();
      const dates = [...new Set([today, ...fondiData.map(f => f.data)])].sort((a, b) => b.localeCompare(a));
      setAvailableDates(dates);
    } catch (error) {
      console.error('Errore nel caricamento dati cassa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMovimento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addMovimentoContanti({
        tipo: movimentoForm.tipo,
        importo: parseFloat(movimentoForm.importo),
        descrizione: movimentoForm.descrizione,
        data_movimento: `${selectedDate} ${new Date().toTimeString().split(' ')[0]}`,
        operatore: movimentoForm.operatore
      });
      
      setMovimentoForm({
        tipo: 'entrata',
        importo: '',
        descrizione: '',
        operatore: 'Giuseppe'
      });
      setShowMovimentoModal(false);
      await loadData();
    } catch (error) {
      console.error('Errore nel movimento:', error);
      alert('Errore nel registrare il movimento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChiusura = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const success = await chiudiCassa(
        selectedDate,
        parseFloat(chiusuraForm.fondo_effettivo),
        chiusuraForm.note
      );
      
      if (success) {
        setChiusuraForm({ fondo_effettivo: '', note: '' });
        setShowChiusuraModal(false);
        await loadData();
      } else {
        alert('Errore nella chiusura cassa');
      }
    } catch (error) {
      console.error('Errore nella chiusura:', error);
      alert('Errore nella chiusura cassa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApertura = async () => {
    setSubmitting(true);
    try {
      const success = await apriCassa(selectedDate, 200.00);
      if (success) {
        await loadData();
      } else {
        alert('Errore nell\'apertura cassa');
      }
    } catch (error) {
      console.error('Errore nell\'apertura:', error);
      alert('Errore nell\'apertura cassa');
    } finally {
      setSubmitting(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const currentIndex = availableDates.indexOf(selectedDate);
    if (direction === 'prev' && currentIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentIndex + 1]);
    } else if (direction === 'next' && currentIndex > 0) {
      setSelectedDate(availableDates[currentIndex - 1]);
    }
  };

  const isToday = selectedDate === getTodayInItalianTimezone();

  const totaleEntrate = (cassaStatus?.vendite_contanti ?? 0) + (cassaStatus?.vendite_carta ?? 0);
  const totaleUscite = (cassaStatus?.uscite ?? 0);
  const saldoAttuale = totaleEntrate - totaleUscite;
  return (
    <ResponsiveLayout title="Gestione Cassa">
      <div className="bg-gray-50 min-h-screen">
        <div className="p-4 lg:p-6 space-y-6">
          {/* Header Minimalist */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Gestione Cassa
              </h1>
              <p className="text-sm text-gray-600 mt-1">{formatDate(selectedDate)}</p>
            </div>
            <div className="flex items-center space-x-2">
              {loading ? (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Caricamento...</span>
                </div>
              ) : (
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  cassaStatus?.aperta 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {cassaStatus?.aperta ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>{cassaStatus?.aperta ? 'Aperta' : 'Chiusa'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Filtro Data Semplificato */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span className="font-medium text-gray-700">Data</span>
                  {isToday && (
                    <Badge className="bg-blue-100 text-blue-700 border-0">
                      Oggi
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">

                  <DatePicker
                    date={selectedDate ? stringToDate(selectedDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(dateToString(date));
                      }
                    }}
                    placeholder="Seleziona data"
                    className="h-10 min-w-[200px]"
                    availableDates={availableDates}
                    restrictToAvailable={false}
                  />

                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="oggi" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
              <TabsTrigger 
                value="oggi" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Gestione Oggi
              </TabsTrigger>
              <TabsTrigger 
                value="storico" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Storico
              </TabsTrigger>
            </TabsList>

          <TabsContent value="oggi" className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded-xl skeleton"></div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded-xl skeleton"></div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Stato Cassa Pulito */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className={`text-3xl font-bold mb-2 ${
                          saldoAttuale >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <Currency amount={saldoAttuale} />
                        </div>
                        <p className="text-sm text-gray-600">Saldo Attuale</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          <Currency amount={totaleEntrate} />
                        </div>
                        <p className="text-sm text-gray-600">Entrate</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 mb-2">
                          <Currency amount={totaleUscite} />
                        </div>
                        <p className="text-sm text-gray-600">Uscite</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Azioni Semplici */}
                {isToday && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {cassaStatus?.aperta ? (
                      <>
                        <Button 
                          className="h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
                          onClick={() => {
                            setMovimentoForm(prev => ({...prev, tipo: 'entrata'}));
                            setShowMovimentoModal(true);
                          }}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Registra Entrata
                        </Button>
                        
                        <Button 
                          variant="outline"
                          className="h-12 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setMovimentoForm(prev => ({...prev, tipo: 'uscita'}));
                            setShowMovimentoModal(true);
                          }}
                        >
                          <TrendingDown className="h-4 w-4 mr-2" />
                          Registra Uscita
                        </Button>
                        
                        <Button 
                          variant="destructive"
                          className="h-12"
                          onClick={() => setShowChiusuraModal(true)}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Chiudi Cassa
                        </Button>
                      </>
                    ) : (
                      <Button 
                        className="h-14 lg:col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-lg"
                        onClick={handleApertura}
                        disabled={submitting}
                      >
                        <Unlock className="h-5 w-5 mr-2" />
                        {submitting ? 'Apertura in corso...' : 'Apri Cassa'}
                      </Button>
                    )}
                  </div>
                )}

                {/* Movimenti Giornata Puliti */}
                {cassaStatus?.movimenti_contanti && cassaStatus.movimenti_contanti.length > 0 && (
                  <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardHeader className="border-b border-gray-100">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <History className="h-5 w-5 mr-2 text-gray-500" />
                          Movimenti della Giornata
                        </div>
                        <Badge variant="secondary">
                          {cassaStatus.movimenti_contanti.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-100">
                        {cassaStatus.movimenti_contanti.map((movimento) => (
                          <div key={movimento.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  movimento.tipo === 'entrata' 
                                    ? 'bg-green-100 text-green-600' 
                                    : 'bg-red-100 text-red-600'
                                }`}>
                                  {movimento.tipo === 'entrata' ? (
                                    <TrendingUp className="h-4 w-4" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{movimento.descrizione}</p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(movimento.data_movimento).toLocaleTimeString('it-IT', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                    {movimento.operatore && ` • ${movimento.operatore}`}
                                  </p>
                                </div>
                              </div>
                              <div className={`text-lg font-semibold ${
                                movimento.tipo === 'entrata' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {movimento.tipo === 'entrata' ? '+' : '-'}
                                <Currency amount={movimento.importo} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Floating Action Buttons - Mobile Semplici */}
                {isToday && cassaStatus?.aperta && (
                  <div className="lg:hidden fixed bottom-20 right-4 z-40 flex flex-col space-y-3">
                    <Button 
                      onClick={() => {
                        setMovimentoForm(prev => ({...prev, tipo: 'entrata'}));
                        setShowMovimentoModal(true);
                      }}
                      className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg"
                      disabled={loading}
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                    <Button 
                      onClick={() => {
                        setMovimentoForm(prev => ({...prev, tipo: 'uscita'}));
                        setShowMovimentoModal(true);
                      }}
                      className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg"
                      disabled={loading}
                    >
                      <Minus className="h-6 w-6" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

            <TabsContent value="storico" className="space-y-6">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <History className="h-5 w-5 mr-2 text-gray-500" />
                      Storico Fondi Cassa
                    </CardTitle>
                    <Select value={storicoView} onValueChange={(v) => setStoricoView(v as 'giorni' | 'mesi')}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Visualizza" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="giorni">Per giorno</SelectItem>
                        <SelectItem value="mesi">Per mese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded-lg skeleton"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {storicoView === 'giorni' ? (
                      <div className="space-y-4">
                        {fondiStorici.map((fondo) => {
                          const realPosData = posDataByDate[fondo.data] || parseFloat((fondo.vendite_carta ?? 0).toString());
                          const contanti = parseFloat((fondo.vendite_contanti ?? 0).toString());
                          const uscite = parseFloat((fondo.uscite ?? 0).toString());
                          
                          const totaleEntrate = contanti + realPosData;
                          const saldoGiorno = totaleEntrate - uscite;
                          
                          return (
                            <div key={fondo.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{formatDate(fondo.data)}</h3>
                                    {fondo.chiuso ? (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        Chiusa
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                        Aperta
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-xl font-bold ${
                                    saldoGiorno >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    <Currency amount={saldoGiorno} />
                                  </div>
                                  <div className="text-sm text-gray-600">Saldo</div>
                                  {fondo.differenza && parseFloat((fondo.differenza ?? 0).toString()) !== 0 && (
                                    <div className={`text-sm mt-1 ${
                                      parseFloat((fondo.differenza ?? 0).toString()) > 0 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                    }`}>
                                      Diff: {parseFloat((fondo.differenza ?? 0).toString()) > 0 ? '+' : ''}
                                      <Currency amount={parseFloat((fondo.differenza ?? 0).toString())} />
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                <div className="bg-green-50 p-3 rounded border border-green-200">
                                  <div className="font-medium text-green-800 mb-1">Contanti</div>
                                  <div className="font-semibold text-green-700">
                                    <Currency amount={contanti} />
                                  </div>
                                </div>
                                
                                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                  <div className="font-medium text-blue-800 mb-1">Carta</div>
                                  <div className="font-semibold text-blue-700">
                                    <Currency amount={realPosData} />
                                  </div>
                                </div>
                                
                                <div className="bg-red-50 p-3 rounded border border-red-200">
                                  <div className="font-medium text-red-800 mb-1">Uscite</div>
                                  <div className="font-semibold text-red-700">
                                    <Currency amount={uscite} />
                                  </div>
                                </div>
                              </div>
                              
                              {fondo.note && (
                                <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                                  <p className="text-sm text-gray-700 italic">{fondo.note}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {storicoMensile.map((m) => {
                          const totaleMese = m.contanti + m.carta;
                          const saldoMese = totaleMese - m.uscite;
                          const dataMese = new Date(`${m.mese}-01`);
                          const labelMese = dataMese.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                          return (
                            <div key={m.mese} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <h3 className="font-semibold text-gray-900 capitalize">{labelMese}</h3>
                                    <Badge variant="secondary">{m.giorni_aperti} giorni</Badge>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-gray-700 mb-1">
                                    Entrate: <Currency amount={totaleMese} />
                                  </div>
                                  <div className={`text-xl font-bold ${
                                    saldoMese >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    <Currency amount={saldoMese} />
                                  </div>
                                  <div className="text-sm text-gray-600">Saldo</div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                <div className="bg-green-50 p-3 rounded border border-green-200">
                                  <div className="font-medium text-green-800 mb-1">Contanti</div>
                                  <div className="font-semibold text-green-700">
                                    <Currency amount={m.contanti} />
                                  </div>
                                </div>
                                
                                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                  <div className="font-medium text-blue-800 mb-1">Carta</div>
                                  <div className="font-semibold text-blue-700">
                                    <Currency amount={m.carta} />
                                  </div>
                                </div>
                                
                                <div className="bg-red-50 p-3 rounded border border-red-200">
                                  <div className="font-medium text-red-800 mb-1">Uscite</div>
                                  <div className="font-semibold text-red-700">
                                    <Currency amount={m.uscite} />
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                  <div className="font-medium text-gray-800 mb-1">Diff.</div>
                                  <div className={`font-semibold ${
                                    m.differenze_totali >= 0 ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    <Currency amount={m.differenze_totali} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            </TabsContent>
          </Tabs>

        {/* Modal Movimento Contanti */}
        <Dialog open={showMovimentoModal} onOpenChange={setShowMovimentoModal}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-xl">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  movimentoForm.tipo === 'entrata' 
                    ? 'bg-gradient-to-br from-green-500 to-green-600' 
                    : 'bg-gradient-to-br from-red-500 to-red-600'
                }`}>
                  {movimentoForm.tipo === 'entrata' ? (
                    <TrendingUp className="h-4 w-4 text-white" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-white" />
                  )}
                </div>
                <span>
                  {movimentoForm.tipo === 'entrata' ? 'Registra Entrata Contanti' : 'Registra Uscita Contanti'}
                </span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleMovimento} className="space-y-5">
              <div>
                <Label htmlFor="importo" className="text-sm font-semibold text-gray-700 mb-2 block">
                  💰 Importo (€)
                </Label>
                <Input
                  id="importo"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="h-12 text-base text-right font-bold border-2 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 rounded-lg"
                  value={movimentoForm.importo}
                  onChange={(e) => setMovimentoForm(prev => ({...prev, importo: e.target.value}))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="descrizione" className="text-sm font-semibold text-gray-700 mb-2 block">
                  📝 Descrizione
                </Label>
                <Input
                  id="descrizione"
                  placeholder="Es: Spese varie, Acquisto prodotti, Pagamento fornitore..."
                  className="h-12 text-base border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 rounded-lg"
                  value={movimentoForm.descrizione}
                  onChange={(e) => setMovimentoForm(prev => ({...prev, descrizione: e.target.value}))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="operatore" className="text-sm font-semibold text-gray-700 mb-2 block">
                  👤 Operatore
                </Label>
                <Input
                  id="operatore"
                  placeholder="Nome operatore"
                  className="h-12 text-base border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 rounded-lg"
                  value={movimentoForm.operatore}
                  onChange={(e) => setMovimentoForm(prev => ({...prev, operatore: e.target.value}))}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <Button 
                  type="submit" 
                  className={`flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${
                    movimentoForm.tipo === 'entrata' ? 'btn-success' : 'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      {movimentoForm.tipo === 'entrata' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span>Salva {movimentoForm.tipo === 'entrata' ? 'Entrata' : 'Uscita'}</span>
                    </div>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-12 text-base font-medium border-2 hover:bg-gray-50"
                  onClick={() => setShowMovimentoModal(false)}
                  disabled={submitting}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Chiusura Cassa */}
        <Dialog open={showChiusuraModal} onOpenChange={setShowChiusuraModal}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-xl">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Lock className="h-4 w-4 text-white" />
                </div>
                <span>Chiusura Cassa</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleChiusura} className="space-y-5">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Euro className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700">Fondo Teorico</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  <Currency amount={cassaStatus?.fondo_teorico || 0} />
                </div>
              </div>
              
              <div>
                <Label htmlFor="fondo_effettivo" className="text-sm font-semibold text-gray-700 mb-2 block">
                  💰 Fondo Effettivo (€)
                </Label>
                <Input
                  id="fondo_effettivo"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="h-12 text-base text-right font-bold border-2 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 rounded-lg"
                  value={chiusuraForm.fondo_effettivo}
                  onChange={(e) => setChiusuraForm(prev => ({...prev, fondo_effettivo: e.target.value}))}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Inserisci l'importo effettivamente presente in cassa
                </p>
              </div>
              
              <div>
                <Label htmlFor="note" className="text-sm font-semibold text-gray-700 mb-2 block">
                  📋 Note <span className="text-gray-500 font-normal text-xs">(opzionale)</span>
                </Label>
                <Textarea
                  id="note"
                  placeholder="Note sulla chiusura, eventuali anomalie, osservazioni..."
                  className="text-base border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 resize-none rounded-lg"
                  value={chiusuraForm.note}
                  onChange={(e) => setChiusuraForm(prev => ({...prev, note: e.target.value}))}
                  rows={3}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <Button 
                  type="submit" 
                  variant="destructive" 
                  className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Chiudendo...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Chiudi Cassa</span>
                    </div>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-12 text-base font-medium border-2 hover:bg-gray-50"
                  onClick={() => setShowChiusuraModal(false)}
                  disabled={submitting}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

          {/* Padding bottom per floating buttons mobile */}
          <div className="h-24 lg:h-0"></div>
        </div>
      </div>
    </ResponsiveLayout>
  );
}