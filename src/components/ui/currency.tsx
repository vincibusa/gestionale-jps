'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface CurrencyProps {
  amount: number | null | undefined;
  className?: string;
}

export function Currency({ amount, className }: CurrencyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle null/undefined values
  const safeAmount = amount ?? 0;

  if (!isClient) {
    return <span className={className}>{safeAmount.toFixed(2)} €</span>;
  }

  return <span className={className}>{formatCurrency(safeAmount)}</span>;
}