'use client';

import { useState, useEffect } from 'react';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Plus,
  Edit,
  Trash2,
  ChefHat,
  Coffee,
  Utensils
} from 'lucide-react';
import { Currency } from '@/components/ui/currency';
import { getProdottiByCategoria, type Prodotto } from '@/lib/services/prodotti';

const categoryIcons: Record<string, React.ComponentType<any>> = {
  'Spiedo': ChefHat,
  'Pezzi': Utensils,
  'Gastronomia': Coffee,
  'Contorni': Package,
  'Bevande': Coffee
};

const categoryColors: Record<string, string> = {
  'Spiedo': 'bg-orange-100 text-orange-800 border-orange-200',
  'Pezzi': 'bg-red-100 text-red-800 border-red-200',
  'Gastronomia': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Contorni': 'bg-green-100 text-green-800 border-green-200',
  'Bevande': 'bg-blue-100 text-blue-800 border-blue-200'
};

export default function ProdottiPage() {
  const [prodottiByCategoria, setProdottiByCategoria] = useState<Record<string, Prodotto[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadProdotti();
  }, []);

  const loadProdotti = async () => {
    try {
      const data = await getProdottiByCategoria();
      setProdottiByCategoria(data);
    } catch (error) {
      console.error('Errore nel caricamento prodotti:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorie = Object.keys(prodottiByCategoria);
  const tuttiProdotti = Object.values(prodottiByCategoria).flat();

  const getProdottiDaMostrare = () => {
    if (selectedCategory === 'all') {
      return tuttiProdotti;
    }
    return prodottiByCategoria[selectedCategory] || [];
  };

  const prodottiDaMostrare = getProdottiDaMostrare();

  return (
    <ResponsiveLayout title="Gestione Prodotti">
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Statistiche */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Card className="card-elevated animate-scale-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Prodotti Attivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-warm">
                {loading ? '...' : tuttiProdotti.length}
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated animate-scale-in" style={{animationDelay: '0.1s'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Categorie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-success">
                {loading ? '...' : categorie.length}
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated animate-scale-in" style={{animationDelay: '0.2s'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Prezzo Medio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold text-purple-600">
                {loading ? '...' : (
                  <Currency amount={tuttiProdotti.reduce((sum, p) => sum + p.prezzo, 0) / tuttiProdotti.length || 0} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated animate-scale-in" style={{animationDelay: '0.3s'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Top Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-blue-600">
                {loading ? '...' : (categorie.length > 0 ? categorie[0] : 'N/A')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nuovo Prodotto */}
        <Button className="w-full h-12 lg:h-14 btn-warm" size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nuovo Prodotto
        </Button>

        {/* Filtri per Categoria */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-6 h-6 gradient-warm rounded-lg flex items-center justify-center mr-3">
                <Package className="h-4 w-4 text-white" />
              </div>
              Catalogo Prodotti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
                <TabsTrigger value="all" className="text-xs lg:text-sm">
                  Tutti ({tuttiProdotti.length})
                </TabsTrigger>
                {categorie.map((categoria) => {
                  const Icon = categoryIcons[categoria] || Package;
                  return (
                    <TabsTrigger key={categoria} value={categoria} className="text-xs lg:text-sm">
                      <Icon className="h-3 w-3 mr-1 lg:h-4 lg:w-4" />
                      {categoria} ({prodottiByCategoria[categoria]?.length || 0})
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-0">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="p-4">
                        <div className="h-4 bg-gray-200 rounded skeleton mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded skeleton mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded skeleton w-2/3"></div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {prodottiDaMostrare.length === 0 ? (
                      <div className="col-span-full text-center text-gray-500 py-8">
                        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">Nessun prodotto trovato</p>
                        <p className="text-sm">Aggiungi prodotti per questa categoria</p>
                      </div>
                    ) : (
                      prodottiDaMostrare.map((prodotto, index) => (
                        <Card 
                          key={prodotto.id} 
                          className="card-elevated animate-fade-in-up hover:shadow-lg transition-all duration-300" 
                          style={{animationDelay: `${index * 0.1}s`}}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg font-bold text-gray-900 mb-2">
                                  {prodotto.nome}
                                </CardTitle>
                                <Badge className={categoryColors[prodotto.categoria] || 'bg-gray-100 text-gray-800'}>
                                  {prodotto.categoria}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {prodotto.descrizione && (
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {prodotto.descrizione}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <div className="text-2xl font-bold text-success">
                                  <Currency amount={prodotto.prezzo} />
                                </div>
                                <div className="text-sm text-gray-500">
                                  {prodotto.unita_misura}
                                  {prodotto.peso_medio && (
                                    <span className="ml-1">• {prodotto.peso_medio}kg</span>
                                  )}
                                </div>
                              </div>

                              {prodotto.allergeni && (
                                <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                  Allergeni: {prodotto.allergeni}
                                </div>
                              )}

                              <div className="flex gap-2 pt-2">
                                <Button variant="outline" size="sm" className="flex-1 h-9 hover:bg-blue-50">
                                  <Edit className="h-3 w-3 mr-1" />
                                  Modifica
                                </Button>
                                <Button variant="outline" size="sm" className="h-9 hover:bg-red-50 text-red-600 border-red-200">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
}