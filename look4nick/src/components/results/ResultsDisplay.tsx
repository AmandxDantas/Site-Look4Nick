import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, ExternalLink, Copy, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResultItem {
  id: string;
  site: string;
  status: 'found' | 'not_found' | 'uncertain';
  url?: string;
  details?: string;
  category?: string;
}

interface ResultsDisplayProps {
  title: string;
  results: ResultItem[];
  loading?: boolean;
}

/**
 * ResultsDisplay - Componente para mostrar os resultados (Dark Mode).
 * Agora com agrupamento por categorias.
 */
export default function ResultsDisplay({ title, results, loading }: ResultsDisplayProps) {
  const [showNotFound, setShowNotFound] = useState(false);

  if (loading && results.length === 0) {
    return (
      <div className="w-full bg-white rounded-3xl p-8 shadow-xl animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0 && !loading) {
    return (
      <Card className="w-full bg-white border-none rounded-3xl shadow-2xl overflow-hidden p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-gray-50 text-gray-300">
            <XCircle size={48} />
          </div>
          <h3 className="text-xl font-bold text-gray-400">Nenhum perfil confirmado encontrado para "{title}"</h3>
          <p className="text-gray-400 text-sm max-w-md">
            A varredura em 100+ sites não detectou registros públicos ativos com este nome de usuário.
          </p>
        </div>
      </Card>
    );
  }

  const filteredResults = showNotFound ? results : results.filter(r => r.status === 'found');
  const foundUrls = results.filter(r => r.status === 'found' && r.url).map(r => r.url).join('\n');

  const categories = [
    "Redes Sociais",
    "Apps de Relacionamento",
    "Profissional/Corporativo",
    "Fóruns e Comunidades",
    "Outros"
  ];

  const groupedResults = categories.reduce((acc, category) => {
    const items = filteredResults.filter(r => r.category === category);
    if (items.length > 0) {
      acc[category] = items;
    }
    return acc;
  }, {} as Record<string, ResultItem[]>);

  // Add items without category to "Outros" if not already there
  const uncategorized = filteredResults.filter(r => !r.category || !categories.includes(r.category));
  if (uncategorized.length > 0) {
    groupedResults["Outros"] = [...(groupedResults["Outros"] || []), ...uncategorized];
  }

  const copyAllUrls = () => {
    if (foundUrls) {
      navigator.clipboard.writeText(foundUrls);
    }
  };

  return (
    <Card className="w-full bg-white border-none rounded-3xl shadow-2xl overflow-hidden">
      <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wider">
          Resultados para: <span className="text-[#602080]">{title}</span>
        </h3>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowNotFound(!showNotFound)}
            className="rounded-full border-gray-200 text-gray-500 hover:bg-gray-100 gap-2"
          >
            {showNotFound ? <EyeOff size={14} /> : <Eye size={14} />}
            {showNotFound ? 'Ocultar Inexistentes' : 'Mostrar Inexistentes'}
          </Button>

          <Button 
            variant="default" 
            size="sm" 
            onClick={copyAllUrls}
            disabled={!foundUrls}
            className="rounded-full bg-[#602080] hover:bg-[#7a29a3] text-white gap-2"
          >
            <Copy size={14} />
            Copiar URLs
          </Button>
        </div>
      </div>
      <CardContent className="p-6 space-y-8">
        {Object.entries(groupedResults).map(([category, items]) => (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-100"></div>
              <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{category}</h4>
              <div className="h-px flex-1 bg-gray-100"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((result) => (
                <div 
                  key={result.id}
                  className="flex flex-col p-4 rounded-2xl border border-gray-50 hover:border-purple-100 hover:bg-purple-50/30 transition-all group"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        result.status === 'found' ? 'bg-green-50 text-green-600' : 
                        result.status === 'uncertain' ? 'bg-amber-50 text-amber-600' : 
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {result.status === 'found' ? <CheckCircle2 size={18} /> : 
                         result.status === 'uncertain' ? <AlertCircle size={18} /> : 
                         <XCircle size={18} />}
                      </div>
                      <span className="font-medium text-[#602080] group-hover:text-[#7a29a3] transition-colors">
                        {result.site}
                      </span>
                    </div>
                    
                    {result.status === 'found' && result.url && (
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[#602080] transition-colors"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>

                  {result.details && (
                    <p className="mt-2 text-xs text-gray-500 pl-11 leading-relaxed">
                      {result.details}
                    </p>
                  )}
                  
                  {result.status === 'not_found' && !result.details && (
                    <span className="text-xs text-gray-300 font-medium italic pl-11">Não encontrado</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
