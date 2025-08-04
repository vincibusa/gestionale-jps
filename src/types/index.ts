export * from './database';

export interface DashboardStats {
  venditeOggi: number;
  incassiSettimana: number;
  fattureEmesse: number;
  saldoCassa: number;
  pagamentiPOS: number;
  topProdotto?: {
    nome: string;
    quantita: number;
  };
}

export interface KPI {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ComponentType;
}

export interface NavItem {
  href: string;
  icon: React.ComponentType;
  label: string;
  color: string;
}