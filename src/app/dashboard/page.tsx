'use client';

import { useEffect, useState } from 'react';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Euro, 
  FileText, 
  CreditCard, 
  TrendingUp,
  Plus,
  Clock
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Currency } from '@/components/ui/currency';
import { getDashboardStats, getRecentActivity, type DashboardStats } from '@/lib/services/dashboard';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    venditeOggi: 0,
    incassiSettimana: 0,
    fattureEmesse: 0,
    saldoCassa: 0,
    pagamentiPOS: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, activityData] = await Promise.all([
          getDashboardStats(),
          getRecentActivity()
        ]);
        setStats(statsData);
        setRecentActivity(activityData);
      } catch (error) {
        console.error('Errore nel caricamento dati:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const quickActions = [
    {
      label: 'Nuovo Pagamento POS',
      href: '/pos',
      icon: CreditCard,
      color: 'bg-green-500'
    },
    {
      label: 'Gestisci Cassa',
      href: '/contanti',
      icon: Euro,
      color: 'bg-yellow-500'
    },
    {
      label: 'Nuova Fattura',
      href: '/fatture/nuova',
      icon: FileText,
      color: 'bg-purple-500'
    }
  ];

  if (loading) {
    return (
      <ResponsiveLayout title="Dashboard">
        <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
          {/* Loading State */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="card-elevated">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded skeleton"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded skeleton mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded skeleton w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout title="Dashboard">
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Card className="card-elevated animate-scale-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Vendite Oggi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-success">
                <Currency amount={stats.venditeOggi} />
              </div>
              <div className="flex items-center text-xs text-gray-500 mt-2">
                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                <span className="text-green-600 font-medium">+12%</span>
                <span className="ml-1">da ieri</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated animate-scale-in" style={{animationDelay: '0.1s'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Saldo Cassa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-warm">
                <Currency amount={stats.saldoCassa} />
              </div>
              <Badge className="text-xs mt-2 bg-green-100 text-green-800 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                Cassa Aperta
              </Badge>
            </CardContent>
          </Card>

          <Card className="card-elevated animate-scale-in" style={{animationDelay: '0.2s'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Incassi Settimana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold text-purple-600">
                <Currency amount={stats.incassiSettimana} />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated animate-scale-in" style={{animationDelay: '0.3s'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pagamenti POS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold text-success">
                <Currency amount={stats.pagamentiPOS} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg lg:text-xl flex items-center">
                <div className="w-6 h-6 gradient-warm rounded-lg flex items-center justify-center mr-3">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                Azioni Rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  className="w-full justify-start h-12 lg:h-14 btn-warm hover:shadow-warm transition-all duration-300"
                  asChild
                >
                  <a href={action.href}>
                    <div className={`p-2 rounded-xl ${action.color} mr-3 shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-medium">{action.label}</span>
                  </a>
                </Button>
              );
            })}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg lg:text-xl flex items-center">
                <div className="w-6 h-6 gradient-green rounded-lg flex items-center justify-center mr-3">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                Attività Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    Nessuna attività recente
                  </div>
                ) : (
                  recentActivity.slice(0, 3).map((activity, index) => {
                    const isPos = activity.tipo === 'pagamento_pos';
                    return (
                      <div 
                        key={activity.id} 
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          isPos 
                            ? 'bg-green-50 border-green-100' 
                            : 'bg-blue-50 border-blue-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isPos ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            {isPos ? (
                              <CreditCard className="h-5 w-5 text-green-600" />
                            ) : (
                              <Euro className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {activity.descrizione}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.data).toLocaleTimeString('it-IT', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${
                          isPos ? 'text-success' : 'text-blue-600'
                        }`}>
                          +<Currency amount={activity.importo} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResponsiveLayout>
  );
}