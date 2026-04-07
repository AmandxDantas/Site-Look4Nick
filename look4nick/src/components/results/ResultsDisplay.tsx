import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResultItem {
  id: string;
  site: string;
  status: 'found' | 'not_found';
  url?: string;
}

interface ResultsDisplayProps {
  title: string;
  results: ResultItem[];
  loading?: boolean;
}

/**
 * ResultsDisplay - Componente para mostrar os resultados (Dark Mode).
 * Agora com filtro de inexistência e botão de copiar URLs.
 */
export default function ResultsDisplay({ title, results, loading }: ResultsDisplayProps) {
  const [showNotFound, setShowNotFound] = useState(true);

  if (loading) {
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

  if (results.length === 0) return null;

  const filteredResults = showNotFound ? results : results.filter(r => r.status === 'found');
  const foundUrls = results.filter(r => r.status === 'found' && r.url).map(r => r.url).join('\n');

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
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResults.map((result) => (
            <div 
              key={result.id}
              className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 hover:border-purple-100 hover:bg-purple-50/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${result.status === 'found' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                  {result.status === 'found' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
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
              
              {result.status === 'not_found' && (
                <span className="text-xs text-gray-300 font-medium italic">Não encontrado</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
