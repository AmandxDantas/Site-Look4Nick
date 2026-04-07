import React, { useState } from 'react';
import { Search, User, Mail, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBoxProps {
  type: 'username' | 'email';
  placeholder: string;
  onSearch: (value: string) => void;
  loading?: boolean;
}

/**
 * SearchBox - Componente de Busca Horizontal e Retangular (Dark Mode).
 */
export default function SearchBox({ type, placeholder, onSearch, loading }: SearchBoxProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !loading) {
      onSearch(value);
    }
  };

  const buttonLabel = type === 'username' ? 'Comece a Descoberta' : 'Verifique se há vazamentos';

  return (
    <form 
      onSubmit={handleSubmit}
      className="flex flex-col md:flex-row w-full gap-3"
    >
      <div className="relative group flex-1">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C0C0C0]/40 group-focus-within:text-[#602080] transition-colors">
          {type === 'username' ? <User size={20} /> : <Mail size={20} />}
        </div>
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
          className="pl-12 pr-4 h-16 bg-[#121212] border border-[#311432] rounded-md shadow-sm text-[#C0C0C0] placeholder:text-[#C0C0C0]/30 text-lg focus-visible:ring-2 focus-visible:ring-[#602080]/50"
        />
      </div>
      
      <Button 
        type="submit"
        disabled={loading}
        className="h-16 bg-[#602080] hover:bg-[#7a29a3] text-white rounded-md px-8 text-lg font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-3 whitespace-nowrap min-w-[200px]"
      >
        {loading ? (
          <Loader2 size={22} className="animate-spin" />
        ) : (
          <Search size={22} />
        )}
        <span>{loading ? 'Buscando...' : buttonLabel}</span>
      </Button>
    </form>
  );
}
