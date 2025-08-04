'use client';

import { Search, Bell, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <div className="flex items-center hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="nav-item"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Title */}
          <div className="flex-1 lg:flex-none">
            {title && (
              <h1 className="text-xl font-semibold text-gray-900 lg:text-2xl">
                {title}
              </h1>
            )}
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca prodotti, clienti, fatture..."
                className="pl-10 form-input"
              />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Mobile search */}
            <Button variant="ghost" size="sm" className="md:hidden nav-item">
              <Search className="h-5 w-5" />
            </Button>

            {/* Notifications */}
            <div className="relative">
              <Button variant="ghost" size="sm" className="nav-item">
                <Bell className="h-5 w-5" />
              </Button>
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
              >
                3
              </Badge>
            </div>

            {/* User menu */}
            <div className="relative">
              <Button variant="ghost" size="sm" className="nav-item">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 gradient-warm rounded-full flex items-center justify-center shadow-warm">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="hidden md:block text-sm font-medium">
                    Giuseppe
                  </span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}