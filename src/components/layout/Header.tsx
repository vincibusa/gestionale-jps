'use client';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Title */}
          <div className="flex-1 lg:flex-none">
            {title && (
              <h1 className="text-xl font-semibold text-gray-900 lg:text-2xl">
                {title}
              </h1>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}