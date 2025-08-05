'use client';

import { useState, useEffect } from 'react';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Plus,
  Calendar,
  Download,
  Edit,
  Filter,
  Trash2,
  Building,
  Calculator
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Currency } from '@/components/ui/currency';
import { 
  getFatture, 
  getFattureStats, 
  getPeriodiDisponibili, 
  getClienti,
  createFattura,
  updateFattura,
  deleteFattura,
  calcolaTotaliFattura,
  getFatturaById,
  validateCodiceDestinatario,
  type Fattura, 
  type Cliente, 
  type FattureStats, 
  type RigaFattura 
} from '@/lib/services/fatture';
import { generateFatturaPDF } from '@/lib/services/pdf-generator';

export default function FatturePage() {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [stats, setStats] = useState<FattureStats | null>(null);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [periodi, setPeriodi] = useState<{anno: number, mese: number, count: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Stati per validazione
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Filtri
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  // Form data
  const [formData, setFormData] = useState({
    cliente_id: '',
    data_fattura: new Date().toISOString().split('T')[0],
    causale: '',
    note: '',
    stato: 'bozza' as 'bozza' | 'emessa' | 'inviata' | 'pagata' | 'annullata',
    codice_destinatario: '0000000',
    pec_destinatario: ''
  });
  
  const [righeForm, setRigheForm] = useState<Omit<RigaFattura, 'id' | 'fattura_id'>[]>([{
    descrizione: '',
    quantita: 1,
    prezzo_unitario: 0,
    sconto_percentuale: 0,
    totale_riga: 0,
    aliquota_iva: 10,
    codice_iva: '10V'
  }]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadFatture();
  }, [selectedYear, selectedMonth, selectedStatus]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [statsData, clientiData, periodiData] = await Promise.all([
        getFattureStats(),
        getClienti(),
        getPeriodiDisponibili()
      ]);
      
      setStats(statsData);
      setClienti(clientiData);
      setPeriodi(periodiData);
    } catch (error) {
      console.error('Errore nel caricamento dati iniziali:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFatture = async () => {
    try {
      const filtri = {
        anno: selectedYear,
        mese: selectedMonth || undefined,
        stato: selectedStatus || undefined,
        limit: 50
      };
      
      const fattureData = await getFatture(filtri);
      setFatture(fattureData);
    } catch (error) {
      console.error('Errore nel caricamento fatture:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica errori di validazione
    if (Object.keys(validationErrors).length > 0) {
      alert('Correggi gli errori di validazione prima di salvare');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Calcola i totali dalle righe
      const totali = calcolaTotaliFattura(righeForm);
      
      const fatturaData = {
        ...formData,
        anno_fattura: new Date(formData.data_fattura).getFullYear(),
        subtotale: totali.subtotale,
        iva: totali.iva,
        totale: totali.totale
      };

      if (editingId) {
        await updateFattura(editingId, fatturaData, righeForm);
      } else {
        await createFattura(fatturaData, righeForm);
      }
      
      await loadFatture();
      await loadInitialData();
      resetForm();
    } catch (error) {
      console.error('Errore nel salvataggio fattura:', error);
      alert('Errore nel salvataggio della fattura');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      data_fattura: new Date().toISOString().split('T')[0],
      causale: '',
      note: '',
      stato: 'bozza',
      codice_destinatario: '0000000',
      pec_destinatario: ''
    });
    setRigheForm([{
      descrizione: '',
      quantita: 1,
      prezzo_unitario: 0,
      sconto_percentuale: 0,
      totale_riga: 0,
      aliquota_iva: 10,
      codice_iva: '10V'
    }]);
    setValidationErrors({});
    setShowModal(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa fattura?')) {
      return;
    }

    setDeletingId(id);
    try {
      const success = await deleteFattura(id);
      if (success) {
        await loadFatture();
        await loadInitialData();
      } else {
        alert('Errore nell\'eliminazione della fattura');
      }
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      alert('Errore nell\'eliminazione della fattura');
    } finally {
      setDeletingId(null);
    }
  };

  const handleGeneratePDF = async (fatturaId: string) => {
    try {
      setSubmitting(true);
      
      // Carica la fattura completa con le righe
      const fatturaCompleta = await getFatturaById(fatturaId);
      
      if (!fatturaCompleta) {
        alert('Errore nel caricamento della fattura');
        return;
      }
      
      // Genera e scarica il PDF
      await generateFatturaPDF(fatturaCompleta);
      
    } catch (error) {
      console.error('Errore nella generazione PDF:', error);
      alert('Errore nella generazione del PDF');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (fatturaId: string) => {
    try {
      setSubmitting(true);
      
      // Carica la fattura completa con le righe
      const fatturaCompleta = await getFatturaById(fatturaId);
      
      if (!fatturaCompleta) {
        alert('Errore nel caricamento della fattura');
        return;
      }
      
      // Popola il form con i dati della fattura
      setFormData({
        cliente_id: fatturaCompleta.cliente_id || '',
        data_fattura: fatturaCompleta.data_fattura,
        causale: fatturaCompleta.causale || '',
        note: fatturaCompleta.note || '',
        stato: fatturaCompleta.stato,
        codice_destinatario: fatturaCompleta.codice_destinatario || '0000000',
        pec_destinatario: fatturaCompleta.pec_destinatario || ''
      });
      
      // Popola le righe fattura
      if (fatturaCompleta.righe_fatture && fatturaCompleta.righe_fatture.length > 0) {
        const righe = fatturaCompleta.righe_fatture.map(riga => ({
          descrizione: riga.descrizione,
          quantita: riga.quantita,
          prezzo_unitario: riga.prezzo_unitario,
          sconto_percentuale: riga.sconto_percentuale || 0,
          totale_riga: riga.totale_riga,
          aliquota_iva: riga.aliquota_iva,
          codice_iva: riga.codice_iva
        }));
        setRigheForm(righe);
      }
      
      // Imposta modalità modifica
      setEditingId(fatturaId);
      setShowModal(true);
      
    } catch (error) {
      console.error('Errore nel caricamento fattura per modifica:', error);
      alert('Errore nel caricamento della fattura');
    } finally {
      setSubmitting(false);
    }
  };

  const aggiungiRiga = () => {
    setRigheForm([...righeForm, {
      descrizione: '',
      quantita: 1,
      prezzo_unitario: 0,
      sconto_percentuale: 0,
      totale_riga: 0,
      aliquota_iva: 10,
      codice_iva: '10V'
    }]);
  };

  const rimuoviRiga = (index: number) => {
    if (righeForm.length > 1) {
      setRigheForm(righeForm.filter((_, i) => i !== index));
    }
  };

  const updateRiga = (index: number, field: keyof RigaFattura, value: any) => {
    const nuoveRighe = [...righeForm];
    nuoveRighe[index] = { ...nuoveRighe[index], [field]: value };
    
    // Ricalcola totale riga
    if (['quantita', 'prezzo_unitario', 'sconto_percentuale'].includes(field)) {
      const riga = nuoveRighe[index];
      riga.totale_riga = riga.quantita * riga.prezzo_unitario * (1 - (riga.sconto_percentuale || 0) / 100);
    }
    
    setRigheForm(nuoveRighe);
  };

  const getStatusColor = (stato: string) => {
    switch (stato) {
      case 'bozza': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'emessa': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inviata': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'pagata': return 'bg-green-100 text-green-800 border-green-200';
      case 'annullata': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (stato: string) => {
    switch (stato) {
      case 'bozza': return 'Bozza';
      case 'emessa': return 'Emessa';
      case 'inviata': return 'Inviata SDI';
      case 'pagata': return 'Pagata';
      case 'annullata': return 'Annullata';
      default: return stato;
    }
  };

  const formatPeriodo = (anno: number, mese: number) => {
    const mesi = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${mesi[mese - 1]} ${anno}`;
  };

  const totaliCalcolati = calcolaTotaliFattura(righeForm);

  // Funzione di validazione in tempo reale
  const validateField = (field: string, value: string) => {
    const errors = { ...validationErrors };
    
    switch (field) {
      case 'codice_destinatario':
        if (value && !validateCodiceDestinatario(value)) {
          errors[field] = 'Deve essere esattamente 7 caratteri alfanumerici';
        } else {
          delete errors[field];
        }
        break;
      case 'pec_destinatario':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[field] = 'Formato email non valido';
        } else {
          delete errors[field];
        }
        break;
      default:
        break;
    }
    
    setValidationErrors(errors);
  };

  return (
    <ResponsiveLayout title="Fatture">
      <div className="p-3 lg:p-8 space-y-4 lg:space-y-6">
        {/* Filtri e Navigazione - Mobile First */}
        <Card className="card-elevated border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Filter className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-700">Filtro Fatture</span>
            </div>
            
            <div className="flex md:flex-row flex-col items-center space-x-3 space-y-3 lg:space-y-0">
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="h-10 text-base font-medium w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {Array.from(new Set(periodi.map(p => p.anno))).map(anno => (
                    <SelectItem key={anno} value={anno.toString()}>
                      {anno}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedMonth?.toString() || 'all'} onValueChange={(value) => setSelectedMonth(value === 'all' ? null : parseInt(value))}>
                <SelectTrigger className="h-10 text-base font-medium w-34">
                  <SelectValue placeholder="Tutti i mesi" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Tutti i mesi</SelectItem>
                  {periodi
                    .filter(p => p.anno === selectedYear)
                    .map(periodo => (
                      <SelectItem key={periodo.mese} value={periodo.mese.toString()}>
                        {formatPeriodo(periodo.anno, periodo.mese).split(' ')[0]} ({periodo.count})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus || 'all'} onValueChange={(value) => setSelectedStatus(value === 'all' ? '' : value)}>
                <SelectTrigger className="h-10 text-base font-medium w-32">
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="bozza">Bozza</SelectItem>
                  <SelectItem value="emessa">Emessa</SelectItem>
                  <SelectItem value="inviata">Inviata SDI</SelectItem>
                  <SelectItem value="pagata">Pagata</SelectItem>
                  <SelectItem value="annullata">Annullata</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Header Statistics - Mobile Optimized */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="card-elevated bg-gradient-to-br from-green-50 via-blue-50 to-green-50 border-green-200">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Sistema Fatturazione
                    </p>
                    <p className="text-xs text-gray-500">
                      {loading ? 'Caricamento...' : `${fatture.length} fatture visualizzate`}
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1">
                  Attivo
                </Badge>
              </div>
              
              {loading ? (
                <div className="h-10 bg-gray-200 rounded-lg skeleton"></div>
              ) : (
                <div className="text-2xl lg:text-3xl font-bold text-green-700">
                  <Currency amount={stats?.fatturato_mese_corrente || 0} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Row */}
        {!loading && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card className="card-elevated bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-blue-700">
                  {stats.fatture_mese_corrente}
                </div>
                <p className="text-xs text-blue-600">Questo Mese</p>
              </CardContent>
            </Card>
            
            <Card className="card-elevated bg-green-50 border-green-200">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-green-700">
                  {stats.fatture_pagate}
                </div>
                <p className="text-xs text-green-600">Pagate</p>
              </CardContent>
            </Card>
            
            <Card className="card-elevated bg-orange-50 border-orange-200">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-orange-700">
                  {stats.fatture_da_pagare}
                </div>
                <p className="text-xs text-orange-600">Da Pagare</p>
              </CardContent>
            </Card>
            
            <Card className="card-elevated bg-purple-50 border-purple-200">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-purple-700">
                  <Currency amount={stats.importo_da_pagare} />
                </div>
                <p className="text-xs text-purple-600">Importo</p>
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
            Nuova Fattura
          </Button>
        </div>

        {/* Lista Fatture */}
        <Card className="card-elevated border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <div className="w-8 h-8 gradient-blue rounded-xl flex items-center justify-center mr-3 shadow-lg">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span>Fatture</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs px-2">
                {loading ? '...' : fatture.length} totali
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
                {fatture.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="font-semibold text-gray-700 mb-2">Nessuna fattura trovata</p>
                    <p className="text-sm text-gray-500 mb-4">Inizia creando la prima fattura</p>
                    <Button 
                      onClick={() => setShowModal(true)}
                      className="btn-warm"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crea Fattura
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fatture.map((fattura, index) => (
                      <div 
                        key={fattura.id} 
                        className="group relative p-4 bg-gradient-to-r from-white via-blue-50 to-green-50 rounded-xl border border-blue-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                        style={{animationDelay: `${index * 0.1}s`}}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                              <h3 className="font-bold text-lg text-slate-800">
                                #{fattura.numero_fattura}/{fattura.anno_fattura}
                              </h3>
                              <Badge className={getStatusColor(fattura.stato)}>
                                {getStatusLabel(fattura.stato)}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Building className="h-4 w-4 mr-2" />
                                <span className="font-medium truncate">{fattura.cliente_nome || 'Cliente non specificato'}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <Calendar className="h-4 w-4 mr-2" />
                                {formatDate(fattura.data_fattura)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end ml-3">
                            <div className="text-xl lg:text-2xl font-bold text-green-700 mb-1">
                              <Currency amount={fattura.totale} />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-200">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            onClick={() => handleEdit(fattura.id)}
                            disabled={submitting || deletingId === fattura.id}
                          >
                            <Edit className="h-3 w-3 mr-2" />
                            Modifica
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 text-sm hover:bg-green-50 hover:border-green-300 transition-colors"
                            onClick={() => handleGeneratePDF(fattura.id)}
                            disabled={submitting || deletingId === fattura.id}
                          >
                            <Download className="h-3 w-3 mr-2" />
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 text-sm hover:bg-red-50 hover:border-red-300 text-red-600 border-red-200 transition-colors"
                            onClick={() => handleDelete(fattura.id)}
                            disabled={submitting || deletingId === fattura.id}
                          >
                            {deletingId === fattura.id ? (
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

        {/* Modal Fattura */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-xl">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  {editingId ? <Edit className="h-4 w-4 text-white" /> : <Plus className="h-4 w-4 text-white" />}
                </div>
                <span>
                  {editingId ? 'Modifica Fattura' : 'Nuova Fattura'}
                </span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Sezione Dati Cliente e Fattura */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Building className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Dati Cliente e Fattura</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cliente_id" className="text-sm font-semibold text-gray-700 mb-2 block">
                      🏢 Cliente
                    </Label>
                    <Select value={formData.cliente_id} onValueChange={(value) => setFormData({...formData, cliente_id: value})}>
                      <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 rounded-lg">
                        <SelectValue placeholder="Seleziona cliente" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {clienti.map(cliente => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="data_fattura" className="text-sm font-semibold text-gray-700 mb-2 block">
                      📅 Data Fattura
                    </Label>
                    <Input
                      id="data_fattura"
                      type="date"
                      className="h-12 text-base border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 rounded-lg"
                      value={formData.data_fattura}
                      onChange={(e) => setFormData({...formData, data_fattura: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <Label htmlFor="causale" className="text-sm font-semibold text-gray-700 mb-2 block">
                      📋 Causale
                    </Label>
                    <Input
                      id="causale"
                      placeholder="Es: Vendita prodotti ittici"
                      className="h-12 text-base border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 rounded-lg"
                      value={formData.causale}
                      onChange={(e) => setFormData({...formData, causale: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Sezione Fatturazione Elettronica */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Fatturazione Elettronica</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="codice_destinatario" className="text-sm font-semibold text-gray-700 mb-2 block">
                      🎯 Codice Destinatario
                    </Label>
                    <Input
                      id="codice_destinatario"
                      placeholder="0000000"
                      maxLength={7}
                      className={`h-12 text-base border-2 focus:ring-2 rounded-lg ${
                        validationErrors.codice_destinatario 
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                          : 'border-gray-200 focus:border-purple-400 focus:ring-purple-200'
                      }`}
                      value={formData.codice_destinatario}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setFormData({...formData, codice_destinatario: value});
                        validateField('codice_destinatario', value);
                      }}
                    />
                    {validationErrors.codice_destinatario ? (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.codice_destinatario}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        7 caratteri alfanumerici o "0000000" per PEC
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pec_destinatario" className="text-sm font-semibold text-gray-700 mb-2 block">
                      📧 PEC Destinatario <span className="text-gray-500 font-normal">(opzionale)</span>
                    </Label>
                    <Input
                      id="pec_destinatario"
                      type="email"
                      placeholder="cliente@pec.esempio.it"
                      className={`h-12 text-base border-2 focus:ring-2 rounded-lg ${
                        validationErrors.pec_destinatario 
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                          : 'border-gray-200 focus:border-purple-400 focus:ring-purple-200'
                      }`}
                      value={formData.pec_destinatario}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({...formData, pec_destinatario: value});
                        validateField('pec_destinatario', value);
                      }}
                    />
                    {validationErrors.pec_destinatario && (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.pec_destinatario}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sezione Righe Fattura */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Plus className="h-3 w-3 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Righe Fattura</h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={aggiungiRiga}
                    className="h-9 text-sm border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Riga
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {righeForm.map((riga, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="col-span-12 sm:col-span-4">
                        <Input
                          placeholder="Descrizione"
                          value={riga.descrizione}
                          onChange={(e) => updateRiga(index, 'descrizione', e.target.value)}
                          className="h-10 text-sm"
                          required
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Qtà"
                          value={riga.quantita}
                          onChange={(e) => updateRiga(index, 'quantita', parseFloat(e.target.value) || 0)}
                          className="h-10 text-sm"
                          required
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Prezzo"
                          value={riga.prezzo_unitario}
                          onChange={(e) => updateRiga(index, 'prezzo_unitario', parseFloat(e.target.value) || 0)}
                          className="h-10 text-sm"
                          required
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="IVA%"
                          value={riga.aliquota_iva}
                          onChange={(e) => updateRiga(index, 'aliquota_iva', parseFloat(e.target.value) || 0)}
                          className="h-10 text-sm"
                          required
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => rimuoviRiga(index)}
                          disabled={righeForm.length === 1}
                          className="h-10 w-full text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="col-span-12 text-right text-sm font-semibold text-gray-600">
                        Totale riga: <Currency amount={riga.totale_riga} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sezione Totali */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Calculator className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Riepilogo Importi</h3>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-green-50 p-6 rounded-xl border border-blue-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center sm:text-left">
                      <div className="text-sm text-gray-600 mb-1">Subtotale</div>
                      <div className="text-xl font-bold text-blue-700">
                        <Currency amount={totaliCalcolati.subtotale} />
                      </div>
                    </div>
                    <div className="text-center sm:text-left">
                      <div className="text-sm text-gray-600 mb-1">IVA</div>
                      <div className="text-xl font-bold text-blue-700">
                        <Currency amount={totaliCalcolati.iva} />
                      </div>
                    </div>
                    <div className="text-center sm:text-left">
                      <div className="text-sm text-gray-600 mb-1">Totale Generale</div>
                      <div className="text-2xl font-bold text-green-700 border-t border-green-300 pt-2">
                        <Currency amount={totaliCalcolati.totale} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sezione Stato e Note */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                  <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                    <Edit className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Stato e Note</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stato" className="text-sm font-semibold text-gray-700 mb-2 block">
                      📊 Stato Fattura
                    </Label>
                    <Select value={formData.stato} onValueChange={(value) => setFormData({...formData, stato: value as any})}>
                      <SelectTrigger className="h-12 text-base border-2 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="bozza">🔄 Bozza</SelectItem>
                        <SelectItem value="emessa">📤 Emessa</SelectItem>
                        <SelectItem value="inviata">🌐 Inviata al SDI</SelectItem>
                        <SelectItem value="pagata">✅ Pagata</SelectItem>
                        <SelectItem value="annullata">❌ Annullata</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="sm:col-span-1">
                    <Label htmlFor="note" className="text-sm font-semibold text-gray-700 mb-2 block">
                      💭 Note <span className="text-gray-500 font-normal text-xs">(opzionale)</span>
                    </Label>
                    <Textarea
                      id="note"
                      placeholder="Note aggiuntive sulla fattura..."
                      className="text-base border-2 border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 resize-none rounded-lg"
                      value={formData.note}
                      onChange={(e) => setFormData({...formData, note: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
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
                      <span>{editingId ? 'Aggiorna Fattura' : 'Salva Fattura'}</span>
                    </div>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-12 text-base font-medium border-2 hover:bg-gray-50"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Padding bottom per floating button mobile */}
        <div className="h-24 lg:h-0"></div>
      </div>
    </ResponsiveLayout>
  );
}