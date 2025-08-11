'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, Euro, FileText, Package, Users, BarChart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  {
    href: '/contanti',
    icon: Euro,
    label: 'Gestione Cassa',
    color: 'text-yellow-600'
  },

  {
    href: '/pos',
    icon: CreditCard,
    label: 'Pagamenti POS',
    color: 'text-green-600'
  },

  {
    href: '/fatture',
    icon: FileText,
    label: 'Fatturazione',
    color: 'text-purple-600'
  },

];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 gradient-subtle border-r border-orange-100">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6 pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 gradient-warm rounded-xl flex items-center justify-center shadow-warm">
              <span className="text-white font-bold text-lg">🐔</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Polli Palermo</h1>
              <p className="text-sm text-gray-500">Gestionale</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 nav-item',
                  isActive
                    ? 'bg-white shadow-warm text-orange-600 border border-orange-100'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                )}
              >
                <Icon 
                  className={cn(
                    'mr-3 h-5 w-5 transition-colors',
                    isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'
                  )} 
                />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-orange-500 rounded-full animate-pulse-warm"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 px-3 pb-4">
          <Link
            href="/settings"
            className="group flex items-center px-3 py-3 text-sm font-medium rounded-xl text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all duration-200 nav-item"
          >
            <Settings className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-600" />
            Impostazioni
          </Link>
          
          <div className="mt-4 px-3">
            <div className="text-xs text-gray-500 text-center">
              Versione 1.0.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}