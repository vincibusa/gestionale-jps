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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Euro, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Lock,
  Unlock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
  CreditCard,
  Plus,
  Edit
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Currency } from '@/components/ui/currency';
import { 
  getStatoCassaCompleto, 
  addMovimentoContanti, 
  chiudiCassa, 
  apriCassa,
  getAllFondiCassa,
  type StatoCassa,
  type FondoCassa 
} from '@/lib/services/cassa';

export default function ContantiPage() {
  const [cassaStatus, setCassaStatus] = useState<StatoCassa | null>(null);
  const [fondiStorici, setFondiStorici] = useState<FondoCassa[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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
      altre: number;
      uscite: number;
      giorni_aperti: number;
      differenze_totali: number;
    }> = {};

    for (const f of fondiStorici) {
      const mese = f.data.slice(0, 7); // YYYY-MM
      if (!gruppi[mese]) {
        gruppi[mese] = { contanti: 0, carta: 0, altre: 0, uscite: 0, giorni_aperti: 0, differenze_totali: 0 };
      }
      gruppi[mese].contanti += parseFloat((f.vendite_contanti ?? 0).toString());
      gruppi[mese].carta += parseFloat((f.vendite_carta ?? 0).toString());
      gruppi[mese].altre += parseFloat((f.altre_entrate ?? 0).toString());
      gruppi[mese].uscite += parseFloat((f.uscite ?? 0).toString());
      gruppi[mese].differenze_totali += parseFloat((f.differenza ?? 0).toString());
      if (f.chiuso) gruppi[mese].giorni_aperti += 1;
    }

    return Object.entries(gruppi)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([mese, valori]) => ({ mese, ...valori }));
  }, [fondiStorici]);

  useEffect(() => {
    loadData();
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
      
      // Aggiorna le date disponibili
      const today = new Date().toISOString().split('T')[0];
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

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const totaleIncassi = (cassaStatus?.vendite_contanti ?? 0) + (cassaStatus?.vendite_carta ?? 0) + (cassaStatus?.altre_entrate ?? 0);

  return (
    <ResponsiveLayout title="Gestione Cassa">
      <div className="p-4 lg:p-8 space-y-6">
        {/* Date Navigation - Mobile First */}
        <Card className="card-elevated border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-700">Filtro Data</span>
              </div>
              {isToday && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                  Oggi
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="h-10 text-base font-medium">
                    <SelectValue>
                      {formatDate(selectedDate)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {availableDates.map((date) => (
                      <SelectItem key={date} value={date}>
                        <div className="flex items-center justify-between w-full">
                          <span>{formatDate(date)}</span>
                          {date === new Date().toISOString().split('T')[0] && (
                            <Badge className="ml-2 text-xs bg-green-100 text-green-700">
                              Oggi
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="oggi" className="w-full mt-10">
          <TabsList className="grid w-full grid-cols-2 bg-white">
            <TabsTrigger value="oggi">Gestione Oggi</TabsTrigger>
            <TabsTrigger value="storico">Storico</TabsTrigger>
          </TabsList>

          <TabsContent value="oggi" className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded-xl skeleton"></div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded-xl skeleton"></div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Header Statistics - Mobile Optimized */}
                <div className="grid grid-cols-1 gap-4 ">
                  <Card className="card-elevated bg-gradient-to-br from-green-50 via-blue-50 to-green-50 border-green-200">
                    <CardContent className="p-4 lg:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Euro className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Stato Cassa - {formatDate(selectedDate)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {cassaStatus?.aperta ? 'Cassa aperta' : 'Cassa chiusa'}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          className={`px-3 py-1 ${
                            cassaStatus?.aperta 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-1">
                            {cassaStatus?.aperta ? (
                              <Unlock className="h-3 w-3" />
                            ) : (
                              <Lock className="h-3 w-3" />
                            )}
                            <span>{cassaStatus?.aperta ? 'Aperta' : 'Chiusa'}</span>
                          </div>
                        </Badge>
                      </div>
                      
                      {loading ? (
                        <div className="h-10 bg-gray-200 rounded-lg skeleton"></div>
                      ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <div className="text-2xl lg:text-3xl font-bold text-blue-700">
                              <Currency amount={cassaStatus?.fondo_teorico || 0} />
                            </div>
                            <p className="text-sm text-gray-500">Fondo teorico</p>
                          </div>
                          <div>
                            <div className="text-xl lg:text-2xl font-bold text-indigo-700">
                              <Currency amount={totaleIncassi} />
                            </div>
                            <p className="text-sm text-gray-500">Totale incassi (contanti + POS)</p>
                          </div>
                          {cassaStatus?.fondo_effettivo !== undefined && (
                            <div>
                              <div className="text-xl lg:text-2xl font-bold text-green-700">
                                <Currency amount={cassaStatus.fondo_effettivo} />
                              </div>
                              <p className="text-sm text-gray-500">Fondo effettivo</p>
                              {cassaStatus.differenza !== undefined && cassaStatus.differenza !== 0 && (
                                <div className={`text-sm font-medium ${
                                  cassaStatus.differenza > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {cassaStatus.differenza > 0 ? '+' : ''}<Currency amount={cassaStatus.differenza} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats Row for Selected Date */}
                {!loading && (
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
                    <Card className="card-elevated bg-orange-50 border-orange-200">
                      <CardContent className="p-3 text-center">
                        <div className="text-lg font-bold text-orange-700">
                          <Currency amount={cassaStatus?.fondo_iniziale || 0} />
                        </div>
                        <p className="text-xs text-orange-600">Fondo Iniziale</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevated bg-green-50 border-green-200">
                      <CardContent className="p-3 text-center">
                        <div className="text-lg font-bold text-green-700">
                          <Currency amount={cassaStatus?.vendite_contanti || 0} />
                        </div>
                        <p className="text-xs text-green-600">Contanti</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevated bg-blue-50 border-blue-200">
                      <CardContent className="p-3 text-center">
                        <div className="text-lg font-bold text-blue-700 flex items-center justify-center space-x-1">
                          <CreditCard className="h-3 w-3" />
                          <Currency amount={cassaStatus?.vendite_carta || 0} />
                        </div>
                        <p className="text-xs text-blue-600">Carta</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevated bg-purple-50 border-purple-200">
                      <CardContent className="p-3 text-center">
                        <div className="text-lg font-bold text-purple-700">
                          <Currency amount={cassaStatus?.altre_entrate || 0} />
                        </div>
                        <p className="text-xs text-purple-600">Altre Entrate</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="card-elevated bg-red-50 border-red-200">
                      <CardContent className="p-3 text-center">
                        <div className="text-lg font-bold text-red-700">
                          <Currency amount={cassaStatus?.uscite || 0} />
                        </div>
                        <p className="text-xs text-red-600">Uscite</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Azioni */}
                {isToday && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {cassaStatus?.aperta ? (
                      <>
                        <Button 
                          className="h-12 btn-success"
                          onClick={() => {
                            setMovimentoForm(prev => ({...prev, tipo: 'entrata'}));
                            setShowMovimentoModal(true);
                          }}
                        >
                          <TrendingUp className="h-5 w-5 mr-2" />
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
                          <TrendingDown className="h-5 w-5 mr-2" />
                          Registra Uscita
                        </Button>
                        
                        <Button 
                          variant="destructive" 
                          className="h-12"
                          onClick={() => setShowChiusuraModal(true)}
                        >
                          <Lock className="h-5 w-5 mr-2" />
                          Chiudi Cassa
                        </Button>
                      </>
                    ) : (
                      <Button 
                        className="h-12 btn-warm lg:col-span-3"
                        onClick={handleApertura}
                        disabled={submitting}
                      >
                        <Unlock className="h-5 w-5 mr-2" />
                        Apri Cassa
                      </Button>
                    )}
                  </div>
                )}

                {/* Movimenti Giornata */}
                {cassaStatus?.movimenti_contanti && cassaStatus.movimenti_contanti.length > 0 && (
                  <Card className="card-elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <History className="h-5 w-5 mr-2" />
                        Movimenti della Giornata
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {cassaStatus.movimenti_contanti.map((movimento) => (
                          <div key={movimento.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {movimento.tipo === 'entrata' ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : movimento.tipo === 'uscita' ? (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              ) : (
                                <Euro className="h-4 w-4 text-blue-600" />
                              )}
                              <div>
                                <p className="font-medium">{movimento.descrizione}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(movimento.data_movimento).toLocaleTimeString('it-IT', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                  {movimento.operatore && ` • ${movimento.operatore}`}
                                </p>
                              </div>
                            </div>
                            <div className={`font-bold ${
                              movimento.tipo === 'entrata' ? 'text-green-600' : 
                              movimento.tipo === 'uscita' ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {movimento.tipo === 'entrata' ? '+' : movimento.tipo === 'uscita' ? '-' : ''}
                              <Currency amount={movimento.importo} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Floating Action Buttons - Mobile */}
                {isToday && cassaStatus?.aperta && (
                  <>
                    <div className="lg:hidden fixed bottom-32 right-4 z-40">
                      <Button 
                        onClick={() => {
                          setMovimentoForm(prev => ({...prev, tipo: 'entrata'}));
                          setShowMovimentoModal(true);
                        }}
                        className="w-12 h-12 rounded-full btn-success shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 mb-3"
                        disabled={loading}
                      >
                        <TrendingUp className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    <div className="lg:hidden fixed bottom-20 right-4 z-40">
                      <Button 
                        onClick={() => {
                          setMovimentoForm(prev => ({...prev, tipo: 'uscita'}));
                          setShowMovimentoModal(true);
                        }}
                        variant="outline"
                        className="w-12 h-12 rounded-full border-red-200 text-red-600 hover:bg-red-50 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 mb-3"
                        disabled={loading}
                      >
                        <TrendingDown className="h-5 w-5" />
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="storico" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  Storico Fondi Cassa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-end mb-4">
                  <Select value={storicoView} onValueChange={(v) => setStoricoView(v as 'giorni' | 'mesi')}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Visualizza" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="giorni">Per giorno</SelectItem>
                      <SelectItem value="mesi">Per mese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded-lg skeleton"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {storicoView === 'giorni' ? (
                      fondiStorici.map((fondo) => {
                        const totaleGiorno = parseFloat((fondo.vendite_contanti ?? 0).toString()) +
                          parseFloat((fondo.vendite_carta ?? 0).toString()) +
                          parseFloat((fondo.altre_entrate ?? 0).toString());
                        return (
                          <div key={fondo.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="font-bold">{formatDate(fondo.data)}</span>
                                <Badge variant={fondo.chiuso ? 'default' : 'secondary'}>
                                  {fondo.chiuso ? 'Chiusa' : 'Aperta'}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg">
                                  <Currency amount={totaleGiorno} />
                                </div>
                                {fondo.differenza && parseFloat((fondo.differenza ?? 0).toString()) !== 0 && (
                                  <div className={`text-sm ${parseFloat((fondo.differenza ?? 0).toString()) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {parseFloat((fondo.differenza ?? 0).toString()) > 0 ? '+' : ''}
                                    <Currency amount={parseFloat((fondo.differenza ?? 0).toString())} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                              <div>Contanti: <Currency amount={parseFloat((fondo.vendite_contanti ?? 0).toString())} /></div>
                              <div>Carta: <Currency amount={parseFloat((fondo.vendite_carta ?? 0).toString())} /></div>
                              <div>Uscite: <Currency amount={parseFloat((fondo.uscite ?? 0).toString())} /></div>
                            </div>
                            {fondo.note && (
                              <p className="text-sm text-gray-500 mt-2 italic">{fondo.note}</p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      storicoMensile.map((m) => {
                        const totaleMese = m.contanti + m.carta + m.altre;
                        const dataMese = new Date(`${m.mese}-01`);
                        const labelMese = dataMese.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                        return (
                          <div key={m.mese} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="font-bold capitalize">{labelMese}</span>
                                <Badge variant="secondary">{m.giorni_aperti} giorni</Badge>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg">
                                  <Currency amount={totaleMese} />
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>Contanti: <Currency amount={m.contanti} /></div>
                              <div>Carta: <Currency amount={m.carta} /></div>
                              <div>Uscite: <Currency amount={m.uscite} /></div>
                              <div>Diff.: <Currency amount={m.differenze_totali} /></div>
                            </div>
                          </div>
                        );
                      })
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
    </ResponsiveLayout>
  );
}