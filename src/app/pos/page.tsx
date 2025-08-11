'use client';

import { useState, useEffect } from 'react';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CreditCard, Calendar, Edit, Trash2, X, History } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getTodayInItalianTimezone, dateToString, stringToDate } from '@/lib/date-utils';
import { Currency } from '@/components/ui/currency';
import { getPagamentiPOSByDate, getDatesPagamentiPOS, addPagamentoPOS, updatePagamentoPOS, deletePagamentoPOS, type PagamentoPOS } from '@/lib/services/pos';
import { supabase } from '@/lib/supabase';

export default function POSPage() {
  const [showModal, setShowModal] = useState(false);
  const [pagamenti, setPagamenti] = useState<PagamentoPOS[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayInItalianTimezone());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    data_pagamento: getTodayInItalianTimezone(),
    importo: '',
    descrizione: '',
    note: ''
  });

  useEffect(() => {
    loadAvailableDates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadPagamentiForDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-pos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamenti_pos' }, async () => {
        await loadAvailableDates();
        if (selectedDate) {
          await loadPagamentiForDate(selectedDate);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const loadAvailableDates = async () => {
    try {
      const dates = await getDatesPagamentiPOS();
      const today = getTodayInItalianTimezone();
      
      const allDates = [...new Set([today, ...dates])].sort((a, b) => b.localeCompare(a));
      setAvailableDates(allDates);
    } catch (error) {
      console.error('Errore nel caricamento date:', error);
    }
  };

  const loadPagamentiForDate = async (date: string) => {
    try {
      setLoading(true);
      const pagamentiData = await getPagamentiPOSByDate(date);
      setPagamenti(pagamentiData);
    } catch (error) {
      console.error('Errore nel caricamento pagamenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (editingId) {
        const pagamentoAggiornato = await updatePagamentoPOS(editingId, {
          data_pagamento: formData.data_pagamento,
          importo: parseFloat(formData.importo),
          descrizione: formData.descrizione,
          note: formData.note || undefined
        });

        if (pagamentoAggiornato) {
          await loadAvailableDates();
          await loadPagamentiForDate(selectedDate);
          resetForm();
        }
      } else {
        const nuovoPagamento = await addPagamentoPOS({
          data_pagamento: formData.data_pagamento,
          importo: parseFloat(formData.importo),
          descrizione: formData.descrizione,
          note: formData.note || undefined
        });

        if (nuovoPagamento) {
          await loadAvailableDates();
          if (formData.data_pagamento === selectedDate) {
            await loadPagamentiForDate(selectedDate);
          } else {
            setSelectedDate(formData.data_pagamento);
          }
          resetForm();
        }
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
      alert('Errore nel salvataggio del pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      data_pagamento: getTodayInItalianTimezone(),
      importo: '',
      descrizione: '',
      note: ''
    });
    setShowModal(false);
    setEditingId(null);
  };

  const handleEdit = (pagamento: PagamentoPOS) => {
    setFormData({
      data_pagamento: pagamento.data_pagamento,
      importo: pagamento.importo.toString(),
      descrizione: pagamento.descrizione,
      note: pagamento.note || ''
    });
    setEditingId(pagamento.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo pagamento?')) {
      return;
    }

    setDeletingId(id);
    try {
      const success = await deletePagamentoPOS(id);
      if (success) {
        await loadAvailableDates();
        await loadPagamentiForDate(selectedDate);
      } else {
        alert('Errore nell\'eliminazione del pagamento');
      }
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      alert('Errore nell\'eliminazione del pagamento');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancel = () => {
    resetForm();
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
  const totaleGiorno = pagamenti.reduce((sum, p) => sum + p.importo, 0);

  return (
    <ResponsiveLayout title="Pagamenti POS">
      <div className="bg-gray-50 min-h-screen">
        <div className="p-4 lg:p-6 space-y-6">
          {/* Header Minimalist */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Pagamenti POS</h1>
              <p className="text-sm text-gray-600 mt-1">{formatDate(selectedDate)}</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                <CreditCard className="h-4 w-4" />
                <span>{loading ? '...' : `${pagamenti.length} transazioni`}</span>
              </div>
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
                    <Badge className="bg-blue-100 text-blue-700 border-0">Oggi</Badge>
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

          {/* Header Statistics - Minimalist (aligned with contanti) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {loading ? '...' : <Currency amount={totaleGiorno} />}
                  </div>
                  <p className="text-sm text-gray-600">Totale Giorno</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {loading ? '...' : pagamenti.length}
                  </div>
                  <p className="text-sm text-gray-600">Transazioni</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {loading || pagamenti.length === 0 ? '...' : <Currency amount={totaleGiorno / pagamenti.length} />}
                  </div>
                  <p className="text-sm text-gray-600">Media</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Floating Action Button - Mobile */}
          <div className="lg:hidden fixed bottom-20 right-4 z-40">
            <Button 
              onClick={() => setShowModal(true)}
              className="w-14 h-14 rounded-full btn-warm shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110"
              disabled={loading}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>

          {/* Desktop Add Button */}
          <div className="hidden lg:block">
            <Button 
              onClick={() => setShowModal(true)}
              className="w-full h-12 text-lg btn-warm"
              size="lg"
              disabled={loading}
            >
              <Plus className="h-5 w-5 mr-2" />
              Nuovo Pagamento POS
            </Button>
          </div>

          {/* Form Nuovo/Modifica Pagamento - Mobile Optimized */}
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2 text-xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    {editingId ? <Edit className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
                  </div>
                  <span>
                    {editingId ? 'Modifica Pagamento POS' : 'Nuovo Pagamento POS'}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="data_pagamento" className="text-sm font-semibold text-gray-700 mb-2 block">
                      📅 Data Pagamento
                    </Label>
                    <Input
                      id="data_pagamento"
                      type="date"
                      className="h-12 text-base border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 rounded-lg"
                      value={formData.data_pagamento}
                      onChange={(e) => setFormData({...formData, data_pagamento: e.target.value})}
                      required
                    />
                  </div>

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
                      value={formData.importo}
                      onChange={(e) => setFormData({...formData, importo: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="descrizione" className="text-sm font-semibold text-gray-700 mb-2 block">
                    📝 Descrizione
                  </Label>
                  <Input
                    id="descrizione"
                    placeholder="Es: Vendita banco, Ordine asporto, Catering..."
                    className="h-12 text-base border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 rounded-lg"
                    value={formData.descrizione}
                    onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="note" className="text-sm font-semibold text-gray-700 mb-2 block">
                    💭 Note <span className="text-gray-500 font-normal text-xs">(opzionale)</span>
                  </Label>
                  <Textarea
                    id="note"
                    placeholder="Note aggiuntive, informazioni cliente..."
                    className="text-base border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 resize-none rounded-lg"
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                  <Button 
                    type="submit" 
                    className="flex-1 h-12 text-base font-semibold btn-success shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{editingId ? 'Aggiornando...' : 'Salvando...'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        {editingId ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        <span>{editingId ? 'Aggiorna Pagamento' : 'Salva Pagamento'}</span>
                      </div>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-12 text-base font-medium border-2 hover:bg-gray-50"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Lista Pagamenti - Cards (refined list) */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-2">
                    <History className="h-4 w-4 text-white" />
                  </div>
                  <span>Pagamenti della Giornata</span>
                </CardTitle>
                <Badge variant="secondary">{loading ? '...' : pagamenti.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg skeleton"></div>
                  ))}
                </div>
              ) : pagamenti.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="font-semibold text-gray-700 mb-2">Nessun pagamento POS</p>
                  <p className="text-sm text-gray-500 mb-4">Inizia registrando il primo pagamento con carta</p>
                  <Button onClick={() => setShowModal(true)} className="btn-warm" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Pagamento
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pagamenti.map((pagamento) => (
                    <div key={pagamento.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{pagamento.descrizione}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(pagamento.created_at || '').toLocaleTimeString('it-IT', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {pagamento.note && ` • ${pagamento.note}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-green-700">
                          <Currency amount={pagamento.importo} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Padding bottom per floating button mobile */}
          <div className="h-20 lg:h-0"></div>
        </div>
      </div>
    </ResponsiveLayout>
  );
}