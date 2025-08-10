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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CreditCard, Calendar, Edit, Trash2, X, Filter, Table as TableIcon, LayoutList } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Currency } from '@/components/ui/currency';
import { getPagamentiPOSByDate, getDatesPagamentiPOS, addPagamentoPOS, updatePagamentoPOS, deletePagamentoPOS, type PagamentoPOS } from '@/lib/services/pos';
import { supabase } from '@/lib/supabase';

export default function POSPage() {
  const [showModal, setShowModal] = useState(false);
  const [pagamenti, setPagamenti] = useState<PagamentoPOS[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [formData, setFormData] = useState({
    data_pagamento: new Date().toISOString().split('T')[0],
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
      const today = new Date().toISOString().split('T')[0];
      
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
      data_pagamento: new Date().toISOString().split('T')[0],
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

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const totaleGiorno = pagamenti.reduce((sum, p) => sum + p.importo, 0);

  return (
    <ResponsiveLayout title="Pagamenti POS">
      <div className="p-3 lg:p-8 space-y-4 lg:space-y-6">
        {/* Date Navigation - Mobile First */}
        <Card className="card-elevated border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center justify-between ">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Filter className="h-4 w-4 text-white" />
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
              <div className="hidden lg:flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  className={`px-3 py-2 text-sm flex items-center ${viewMode === 'cards' ? 'bg-orange-50 text-orange-700' : 'bg-white text-gray-700'}`}
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutList className="h-4 w-4 mr-1" /> Cards
                </button>
                <button
                  className={`px-3 py-2 text-sm flex items-center border-l border-gray-200 ${viewMode === 'table' ? 'bg-orange-50 text-orange-700' : 'bg-white text-gray-700'}`}
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="h-4 w-4 mr-1" /> Tabella
                </button>
              </div>
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

        {/* Header Statistics - Mobile Optimized */}
        <div className="grid grid-cols-1 gap-4 mt-10">
          <Card className="card-elevated bg-gradient-to-br from-green-50 via-blue-50 to-green-50 border-green-200 ">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Pagamenti del {formatDate(selectedDate)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {loading ? '...' : pagamenti.length} transazioni
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                  POS
                </Badge>
              </div>
              
              {loading ? (
                <div className="h-10 bg-gray-200 rounded-lg skeleton"></div>
              ) : (
                <div className="text-2xl lg:text-3xl font-bold text-green-700">
                  <Currency amount={totaleGiorno} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Row for Selected Date */}
        {!loading && pagamenti.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            <Card className="card-elevated bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-blue-700">
                  {pagamenti.length}
                </div>
                <p className="text-xs text-blue-600">Transazioni</p>
              </CardContent>
            </Card>
            
            <Card className="card-elevated bg-purple-50 border-purple-200">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-purple-700">
                  <Currency amount={totaleGiorno / pagamenti.length} />
                </div>
                <p className="text-xs text-purple-600">Media</p>
              </CardContent>
            </Card>
            
            <Card className="card-elevated bg-indigo-50 border-indigo-200">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-indigo-700">
                  <Currency amount={Math.max(...pagamenti.map(p => p.importo))} />
                </div>
                <p className="text-xs text-indigo-600">Maggiore</p>
              </CardContent>
            </Card>
          </div>
        )}

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

        {/* Toggleable View */}
        {viewMode === 'table' && !loading && (
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <div className="w-8 h-8 gradient-blue rounded-xl flex items-center justify-center mr-3 shadow-lg">
                  <TableIcon className="h-4 w-4 text-white" />
                </div>
                <span>Elenco Pagamenti (Tabella)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
              {pagamenti.length === 0 ? (
                <div className="text-sm text-gray-500 py-6">Nessun pagamento da mostrare</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-3 pr-4">Descrizione</th>
                      <th className="py-3 pr-4">Data</th>
                      <th className="py-3 pr-4 text-right">Importo</th>
                      <th className="py-3 pr-4">Note</th>
                      <th className="py-3 pr-0 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagamenti.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 pr-4 font-medium text-gray-800">{p.descrizione}</td>
                        <td className="py-3 pr-4">{formatDate(p.data_pagamento)}</td>
                        <td className="py-3 pr-4 text-right font-semibold text-green-700"><Currency amount={p.importo} /></td>
                        <td className="py-3 pr-4 text-gray-600">{p.note || '-'}</td>
                        <td className="py-3 pr-0 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista Pagamenti - Cards (default) */}
        {viewMode === 'cards' && (
          <Card className="card-elevated border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg">
                  <div className="w-8 h-8 gradient-blue rounded-xl flex items-center justify-center mr-3 shadow-lg">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <span>Pagamenti</span>
                </CardTitle>
                <Badge variant="outline" className="text-xs px-2">
                  {loading ? '...' : pagamenti.length} totali
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-4 rounded-xl bg-gray-50 animate-pulse">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded-lg skeleton mb-2 w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded skeleton w-1/2"></div>
                        </div>
                        <div className="h-6 bg-gray-200 rounded skeleton w-20"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-gray-200 rounded skeleton flex-1"></div>
                        <div className="h-8 bg-gray-200 rounded skeleton w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {pagamenti.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="font-semibold text-gray-700 mb-2">Nessun pagamento POS</p>
                      <p className="text-sm text-gray-500 mb-4">Inizia registrando il primo pagamento con carta</p>
                      <Button 
                        onClick={() => setShowModal(true)}
                        className="btn-warm"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Pagamento
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pagamenti.map((pagamento, index) => (
                        <div 
                          key={pagamento.id} 
                          className="group relative p-4 bg-gradient-to-r from-white via-blue-50 to-green-50 rounded-xl border border-blue-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                          style={{animationDelay: `${index * 0.1}s`}}
                        >
                          {/* Contenuto principale */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                                <p className="font-semibold text-slate-800 truncate text-base lg:text-lg">
                                  {pagamento.descrizione}
                                </p>
                              </div>
                              
                              {pagamento.note && (
                                <div className="mt-2">
                                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    💡 {pagamento.note}
                                  </span>
                                </div>
                              )}
                              
                              <div className="mt-2 text-xs text-slate-500">
                                🕒 {new Date(pagamento.created_at || '').toLocaleTimeString('it-IT', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end ml-3">
                              <div className="text-xl lg:text-2xl font-bold text-green-700 mb-1">
                                <Currency amount={pagamento.importo} />
                              </div>
                            </div>
                          </div>
                          
                          {/* Azioni */}
                          <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-200">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-4 text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                              onClick={() => handleEdit(pagamento)}
                              disabled={submitting || deletingId === pagamento.id}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Modifica
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-4 text-sm hover:bg-red-50 hover:border-red-300 text-red-600 border-red-200 transition-colors"
                              onClick={() => handleDelete(pagamento.id)}
                              disabled={submitting || deletingId === pagamento.id}
                            >
                              {deletingId === pagamento.id ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Eliminando...</span>
                                </div>
                              ) : (
                                <>
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Elimina
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Padding bottom per floating button mobile */}
        <div className="h-20 lg:h-0"></div>
      </div>
    </ResponsiveLayout>
  );
}