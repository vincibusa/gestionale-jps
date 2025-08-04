'use client';

import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus,
  Calendar,
  User,
  Download,
  Edit
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Currency } from '@/components/ui/currency';

interface Fattura {
  id: string;
  numero_fattura: number;
  anno_fattura: number;
  cliente_nome: string;
  data_fattura: string;
  totale: number;
  stato: 'bozza' | 'emessa' | 'pagata' | 'annullata';
}

export default function FatturePage() {
  // Mock data - da sostituire con dati reali
  const fatture: Fattura[] = [
    {
      id: '1',
      numero_fattura: 12,
      anno_fattura: 2024,
      cliente_nome: 'Ristorante Da Mario',
      data_fattura: '2024-12-15',
      totale: 245.50,
      stato: 'emessa'
    },
    {
      id: '2',
      numero_fattura: 11,
      anno_fattura: 2024,
      cliente_nome: 'Hotel Palermo',
      data_fattura: '2024-12-10',
      totale: 387.20,
      stato: 'pagata'
    },
    {
      id: '3',
      numero_fattura: 10,
      anno_fattura: 2024,
      cliente_nome: 'Pizzeria Sicilia',
      data_fattura: '2024-12-08',
      totale: 156.80,
      stato: 'bozza'
    }
  ];

  const getStatusColor = (stato: string) => {
    switch (stato) {
      case 'bozza': return 'bg-gray-100 text-gray-800';
      case 'emessa': return 'bg-blue-100 text-blue-800';
      case 'pagata': return 'bg-green-100 text-green-800';
      case 'annullata': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (stato: string) => {
    switch (stato) {
      case 'bozza': return 'Bozza';
      case 'emessa': return 'Emessa';
      case 'pagata': return 'Pagata';
      case 'annullata': return 'Annullata';
      default: return stato;
    }
  };

  return (
    <ResponsiveLayout title="Fatture">
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Statistiche */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Card className="card-elevated animate-scale-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Fatture Emesse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">12</div>
              <p className="text-xs text-gray-500">Questo mese</p>
            </CardContent>
          </Card>

          <Card className="card-elevated animate-scale-in" style={{animationDelay: '0.1s'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Totale Fatturato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                <Currency amount={2845.30} />
              </div>
              <p className="text-xs text-gray-500">Dicembre 2024</p>
            </CardContent>
          </Card>
        </div>

        {/* Nuova Fattura */}
        <Button className="w-full h-12 lg:h-14 btn-warm" size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nuova Fattura
        </Button>

        {/* Lista Fatture */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-6 h-6 gradient-warm rounded-lg flex items-center justify-center mr-3">
                <FileText className="h-4 w-4 text-white" />
              </div>
              Fatture Recenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fatture.map((fattura, index) => (
                <div key={fattura.id} className="card-elevated p-4 lg:p-6 animate-fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-900">#{fattura.numero_fattura}/{fattura.anno_fattura}</h3>
                        <Badge className={getStatusColor(fattura.stato)}>
                          {getStatusLabel(fattura.stato)}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          <span className="font-medium">{fattura.cliente_nome}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatDate(fattura.data_fattura)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-success">
                        <Currency amount={fattura.totale} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 h-10 hover:bg-blue-50 hover:border-blue-200">
                      <Edit className="h-4 w-4 mr-2" />
                      Modifica
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-10 hover:bg-green-50 hover:border-green-200">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* In Sviluppo */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">Sistema fatturazione completo</p>
              <p className="text-sm">Creazione, modifica e PDF in sviluppo</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
}