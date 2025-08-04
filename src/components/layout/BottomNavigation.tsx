'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CreditCard, Euro, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'Casa',
    color: 'text-blue-600'
  },
  {
    href: '/pos',
    icon: CreditCard,
    label: 'POS',
    color: 'text-green-600'
  },
  {
    href: '/contanti',
    icon: Euro,
    label: 'Cassa',
    color: 'text-yellow-600'
  },
  {
    href: '/fatture',
    icon: FileText,
    label: 'Fatture',
    color: 'text-purple-600'
  }
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 z-50 shadow-lg">
      <div className="grid grid-cols-4 h-16">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center space-y-1 text-xs transition-all duration-200 nav-item relative',
                isActive 
                  ? 'text-orange-600 font-medium' 
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-orange-500 rounded-full" />
              )}
              <div className={cn(
                'p-2 rounded-xl transition-all duration-200',
                isActive ? 'bg-orange-50' : ''
              )}>
                <Icon 
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-orange-600' : 'text-gray-400'
                  )} 
                />
              </div>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}