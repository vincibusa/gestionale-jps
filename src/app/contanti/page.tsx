'use client';

import { useState, useEffect } from 'react';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CreditCard
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
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMovimentoForm, setShowMovimentoForm] = useState(false);
  const [showChiusuraForm, setShowChiusuraForm] = useState(false);
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
      setShowMovimentoForm(false);
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
        setShowChiusuraForm(false);
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
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <ResponsiveLayout title="Gestione Cassa">
      <div className="p-4 lg:p-8 space-y-6">
        {/* Navigazione Date */}
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
                className="h-10"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Precedente
              </Button>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div className="text-center">
                  <div className="font-bold text-lg">{formatDate(selectedDate)}</div>
                  {isToday && <Badge className="text-xs">Oggi</Badge>}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
                className="h-10"
                disabled={selectedDate >= new Date().toISOString().split('T')[0]}
              >
                Successivo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="oggi" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
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
                {/* Status Cassa */}
                <Card className="card-elevated animate-scale-in">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Euro className="h-5 w-5 mr-2 text-yellow-600" />
                        Stato Cassa - {formatDate(selectedDate)}
                      </span>
                      <Badge variant={cassaStatus?.aperta ? "default" : "secondary"}>
                        <div className="flex items-center">
                          {cassaStatus?.aperta ? (
                            <Unlock className="h-3 w-3 mr-1" />
                          ) : (
                            <Lock className="h-3 w-3 mr-1" />
                          )}
                          {cassaStatus?.aperta ? 'Aperta' : 'Chiusa'}
                        </div>
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-3xl font-bold text-blue-600">
                          <Currency amount={cassaStatus?.fondo_teorico || 0} />
                        </div>
                        <p className="text-sm text-gray-500">Fondo teorico</p>
                      </div>
                      {cassaStatus?.fondo_effettivo !== undefined && (
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            <Currency amount={cassaStatus.fondo_effettivo} />
                          </div>
                          <p className="text-sm text-gray-500">Fondo effettivo</p>
                          {cassaStatus.differenza !== undefined && cassaStatus.differenza !== 0 && (
                            <div className={`text-sm font-medium ${cassaStatus.differenza > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {cassaStatus.differenza > 0 ? '+' : ''}<Currency amount={cassaStatus.differenza} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Dettagli Movimento */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className="card-elevated animate-scale-in">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Fondo Iniziale
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">
                        <Currency amount={cassaStatus?.fondo_iniziale || 0} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-elevated animate-scale-in">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Vendite Contanti
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-green-600">
                        +<Currency amount={cassaStatus?.vendite_contanti || 0} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-elevated animate-scale-in">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                        <CreditCard className="h-3 w-3 mr-1" />
                        Vendite Carta
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-blue-600">
                        +<Currency amount={cassaStatus?.vendite_carta || 0} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-elevated animate-scale-in">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Altre Entrate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-green-600">
                        +<Currency amount={cassaStatus?.altre_entrate || 0} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-elevated animate-scale-in">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Uscite
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-red-600">
                        -<Currency amount={cassaStatus?.uscite || 0} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Azioni */}
                {isToday && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {cassaStatus?.aperta ? (
                      <>
                        <Button 
                          className="h-12 btn-success"
                          onClick={() => {
                            setMovimentoForm(prev => ({...prev, tipo: 'entrata'}));
                            setShowMovimentoForm(true);
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
                            setShowMovimentoForm(true);
                          }}
                        >
                          <TrendingDown className="h-5 w-5 mr-2" />
                          Registra Uscita
                        </Button>
                        
                        <Button 
                          variant="destructive" 
                          className="h-12"
                          onClick={() => setShowChiusuraForm(true)}
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
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded-lg skeleton"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fondiStorici.map((fondo) => (
                      <div key={fondo.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-bold">{formatDate(fondo.data)}</span>
                            <Badge variant={fondo.chiuso ? "default" : "secondary"}>
                              {fondo.chiuso ? 'Chiusa' : 'Aperta'}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              <Currency amount={parseFloat(fondo.fondo_teorico.toString())} />
                            </div>
                            {fondo.differenza && parseFloat(fondo.differenza.toString()) !== 0 && (
                              <div className={`text-sm ${parseFloat(fondo.differenza.toString()) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {parseFloat(fondo.differenza.toString()) > 0 ? '+' : ''}
                                <Currency amount={parseFloat(fondo.differenza.toString())} />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>Contanti: <Currency amount={parseFloat(fondo.vendite_contanti.toString())} /></div>
                          <div>Carta: <Currency amount={parseFloat(fondo.vendite_carta.toString())} /></div>
                          <div>Uscite: <Currency amount={parseFloat(fondo.uscite.toString())} /></div>
                        </div>
                        {fondo.note && (
                          <p className="text-sm text-gray-500 mt-2 italic">{fondo.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Form Movimento */}
        {showMovimentoForm && (
          <Card className="card-elevated animate-scale-in">
            <CardHeader>
              <CardTitle>
                {movimentoForm.tipo === 'entrata' ? 'Registra Entrata' : 'Registra Uscita'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMovimento} className="space-y-4">
                <div>
                  <Label htmlFor="importo">Importo (€)</Label>
                  <Input
                    id="importo"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={movimentoForm.importo}
                    onChange={(e) => setMovimentoForm(prev => ({...prev, importo: e.target.value}))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="descrizione">Descrizione</Label>
                  <Input
                    id="descrizione"
                    placeholder="Descrizione del movimento..."
                    value={movimentoForm.descrizione}
                    onChange={(e) => setMovimentoForm(prev => ({...prev, descrizione: e.target.value}))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="operatore">Operatore</Label>
                  <Input
                    id="operatore"
                    value={movimentoForm.operatore}
                    onChange={(e) => setMovimentoForm(prev => ({...prev, operatore: e.target.value}))}
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 btn-success" disabled={submitting}>
                    {submitting ? 'Salvando...' : 'Salva Movimento'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowMovimentoForm(false)}
                    disabled={submitting}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Form Chiusura */}
        {showChiusuraForm && (
          <Card className="card-elevated animate-scale-in">
            <CardHeader>
              <CardTitle>Chiusura Cassa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChiusura} className="space-y-4">
                <div>
                  <Label htmlFor="fondo_effettivo">Fondo Effettivo (€)</Label>
                  <Input
                    id="fondo_effettivo"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={chiusuraForm.fondo_effettivo}
                    onChange={(e) => setChiusuraForm(prev => ({...prev, fondo_effettivo: e.target.value}))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="note">Note (opzionale)</Label>
                  <Textarea
                    id="note"
                    placeholder="Note sulla chiusura..."
                    value={chiusuraForm.note}
                    onChange={(e) => setChiusuraForm(prev => ({...prev, note: e.target.value}))}
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" variant="destructive" className="flex-1" disabled={submitting}>
                    {submitting ? 'Chiudendo...' : 'Chiudi Cassa'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowChiusuraForm(false)}
                    disabled={submitting}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </ResponsiveLayout>
  );
}