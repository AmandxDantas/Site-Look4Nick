import React, { useState, useEffect } from 'react';
import { Search, User, Mail, Lightbulb, History, Eye, Shield, Plus, Trash2, Upload, FileText, Loader2 } from 'lucide-react';
import MainLayout from './components/layout/MainLayout';
import SearchBox from './components/search/SearchBox';
import ResultsDisplay from './components/results/ResultsDisplay';
import VisualGraph from './components/results/VisualGraph';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthProvider, useAuth } from './context/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { searchUsername, searchEmail, searchSingleUsernameSite } from './services/osintService';
import sitesData from './data/sites.json';

interface ResultItem {
  id: string;
  site: string;
  status: 'found' | 'not_found' | 'uncertain';
  url?: string;
  details?: string;
}

interface HistoryItem {
  id: string;
  query: string;
  type: 'username' | 'email';
  timestamp: any;
  resultsCount: number;
}

interface WatchlistItem {
  id: string;
  username: string;
  status: 'active' | 'paused';
  platformsFound: string[];
}

function AppContent() {
  const { user } = useAuth();
  const [usernameResults, setUsernameResults] = useState<ResultItem[]>([]);
  const [emailResults, setEmailResults] = useState<ResultItem[]>([]);
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  
  const [searchProgress, setSearchProgress] = useState(0);
  const [currentCheckingSite, setCurrentCheckingSite] = useState('');
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [uploading, setUploading] = useState(false);

  // Listen for History
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }
    const q = query(
      collection(db, 'history'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryItem));
      setHistory(items);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'history'));
    return () => unsubscribe();
  }, [user]);

  // Listen for Watchlist
  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      return;
    }
    const q = query(
      collection(db, 'watchlist'),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WatchlistItem));
      setWatchlist(items);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'watchlist'));
    return () => unsubscribe();
  }, [user]);

  const saveToHistory = async (q: string, type: 'username' | 'email', count: number) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'history'), {
        userId: user.uid,
        query: q,
        type,
        resultsCount: count,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'history');
    }
  };

  const addToWatchlist = async (username: string, platforms: string[]) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'watchlist'), {
        userId: user.uid,
        username,
        platformsFound: platforms,
        status: 'active',
        lastChecked: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'watchlist');
    }
  };

  const removeFromWatchlist = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'watchlist', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `watchlist/${id}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, 'files'), {
        userId: user.uid,
        fileName: file.name,
        fileUrl: url,
        uploadDate: serverTimestamp()
      });
      alert('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error("Upload error:", error);
      alert('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleUsernameSearch = async (username: string) => {
    setLoadingUsername(true);
    setCurrentUsername(username);
    setEmailResults([]);
    setUsernameResults([]);
    setSearchProgress(0);
    
    const allResults: ResultItem[] = [];
    const totalSites = sitesData.length;
    
    // Process in small parallel chunks for speed but with progress tracking
    const chunkSize = 3;
    for (let i = 0; i < totalSites; i += chunkSize) {
      const chunk = sitesData.slice(i, i + chunkSize);
      setCurrentCheckingSite(chunk.map(s => s.name).join(', '));
      
      const chunkPromises = chunk.map(site => searchSingleUsernameSite(username, site));
      const chunkResults = await Promise.all(chunkPromises);
      
      allResults.push(...chunkResults);
      setUsernameResults([...allResults]); // Update UI incrementally
      setSearchProgress(Math.round(((i + chunk.length) / totalSites) * 100));
    }

    setLoadingUsername(false);
    setCurrentCheckingSite('');
    saveToHistory(username, 'username', allResults.filter(r => r.status === 'found').length);
  };

  const handleEmailSearch = async (email: string) => {
    setLoadingEmail(true);
    setCurrentEmail(email);
    setUsernameResults([]);
    setEmailResults([]);
    
    const results = await searchEmail(email);
    setEmailResults(results);
    setLoadingEmail(false);
    saveToHistory(email, 'email', results.filter(r => r.status === 'found').length);
  };

  return (
    <MainLayout>
      <div className="text-center text-[#C0C0C0] space-y-10">
        <div className="space-y-6">
          <p className="text-base md:text-lg text-[#C0C0C0]/80 max-w-3xl mx-auto font-medium">
            Pesquisa OSINT avançada em e-mails para verificar se seu e-mail foi comprometido em violações de dados.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div className="bg-[#311432]/80 border border-[#602080]/30 p-3 rounded-md text-[#C0C0C0] text-xs font-semibold flex items-center gap-3 text-left max-w-2xl mx-auto backdrop-blur-sm">
            <div className="bg-[#602080] p-1.5 rounded-full text-white shrink-0">
              <Lightbulb size={14} />
            </div>
            <p>
              Nosso verificador de vazamento de e-mails protege sua privacidade. Todas as verificações de vazamento são realizadas de forma segura e anônima.
            </p>
          </div>

          <Tabs defaultValue="search" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-[#311432]/50 backdrop-blur-md p-0 rounded-md border border-[#602080]/20 h-16 overflow-hidden">
              <TabsTrigger value="search" className="h-full data-[state=active]:bg-[#602080] data-[state=active]:text-white text-[#C0C0C0] font-bold transition-all flex items-center gap-2">
                <Search size={18} />
                Busca
              </TabsTrigger>
              <TabsTrigger value="history" className="h-full data-[state=active]:bg-[#602080] data-[state=active]:text-white text-[#C0C0C0] font-bold transition-all flex items-center gap-2">
                <History size={18} />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="h-full data-[state=active]:bg-[#602080] data-[state=active]:text-white text-[#C0C0C0] font-bold transition-all flex items-center gap-2">
                <Eye size={18} />
                Monitoramento
              </TabsTrigger>
              <TabsTrigger value="storage" className="h-full data-[state=active]:bg-[#602080] data-[state=active]:text-white text-[#C0C0C0] font-bold transition-all flex items-center gap-2">
                <Upload size={18} />
                Arquivos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6 outline-none">
              <Tabs defaultValue="username" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-[#311432]/30 p-0 rounded-md border border-[#602080]/10 h-14 overflow-hidden">
                  <TabsTrigger value="username" className="h-full data-[state=active]:bg-[#602080]/50 data-[state=active]:text-white text-[#C0C0C0] font-medium transition-all">
                    Username
                  </TabsTrigger>
                  <TabsTrigger value="email" className="h-full data-[state=active]:bg-[#602080]/50 data-[state=active]:text-white text-[#C0C0C0] font-medium transition-all">
                    E-mail
                  </TabsTrigger>
                </TabsList>

                <div className="bg-[#121212]/50 backdrop-blur-2xl p-8 rounded-md border border-[#311432] shadow-2xl">
                  <TabsContent value="username" className="mt-0 outline-none">
                    <SearchBox type="username" placeholder="Ex: joaosilva_99" onSearch={handleUsernameSearch} loading={loadingUsername} />
                  </TabsContent>
                  <TabsContent value="email" className="mt-0 outline-none">
                    <SearchBox type="email" placeholder="Ex: contato@exemplo.com" onSearch={handleEmailSearch} loading={loadingEmail} />
                  </TabsContent>
                </div>
              </Tabs>
            </TabsContent>

            <TabsContent value="history" className="outline-none">
              <div className="bg-[#121212]/50 backdrop-blur-2xl p-6 rounded-md border border-[#311432] shadow-2xl space-y-4">
                <h3 className="text-left font-bold text-[#C0C0C0] flex items-center gap-2">
                  <History size={18} className="text-[#602080]" />
                  Histórico de Buscas
                </h3>
                {!user ? (
                  <p className="text-sm text-[#C0C0C0]/40 py-10">Faça login para ver seu histórico.</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-[#C0C0C0]/40 py-10">Nenhuma busca realizada ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-[#311432]/20 rounded-lg border border-[#602080]/10">
                        <div className="flex items-center gap-3">
                          {item.type === 'username' ? <User size={16} className="text-[#602080]" /> : <Mail size={16} className="text-[#602080]" />}
                          <div className="text-left">
                            <p className="text-sm font-bold text-[#C0C0C0]">{item.query}</p>
                            <p className="text-[10px] text-[#C0C0C0]/40">{item.timestamp?.toDate().toLocaleString()}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#602080]">{item.resultsCount} resultados</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="watchlist" className="outline-none">
              <div className="bg-[#121212]/50 backdrop-blur-2xl p-6 rounded-md border border-[#311432] shadow-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[#C0C0C0] flex items-center gap-2">
                    <Eye size={18} className="text-[#602080]" />
                    Lista de Monitoramento
                  </h3>
                </div>
                {!user ? (
                  <p className="text-sm text-[#C0C0C0]/40 py-10">Faça login para monitorar perfis.</p>
                ) : watchlist.length === 0 ? (
                  <p className="text-sm text-[#C0C0C0]/40 py-10">Nenhum perfil sendo monitorado.</p>
                ) : (
                  <div className="space-y-2">
                    {watchlist.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-[#311432]/20 rounded-xl border border-[#602080]/10">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#602080]/20 flex items-center justify-center text-[#602080]">
                            <User size={20} />
                          </div>
                          <div className="text-left">
                            <p className="text-base font-bold text-[#C0C0C0]">{item.username}</p>
                            <p className="text-xs text-[#602080]">{item.platformsFound.length} plataformas detectadas</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFromWatchlist(item.id)} className="text-red-400 hover:bg-red-400/10">
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="storage" className="outline-none">
              <div className="bg-[#121212]/50 backdrop-blur-2xl p-6 rounded-md border border-[#311432] shadow-2xl space-y-6">
                <h3 className="font-bold text-[#C0C0C0] flex items-center gap-2">
                  <Shield size={18} className="text-[#602080]" />
                  Armazenamento Seguro de Evidências
                </h3>
                
                {!user ? (
                  <p className="text-sm text-[#C0C0C0]/40 py-10">Faça login para gerenciar seus arquivos.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="border-2 border-dashed border-[#602080]/20 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-[#602080]/40 transition-all">
                      <div className="p-4 rounded-full bg-[#602080]/10 text-[#602080]">
                        <Upload size={32} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#C0C0C0]">Arraste arquivos ou clique para upload</p>
                        <p className="text-xs text-[#C0C0C0]/40 mt-1">PDF, Imagens, Documentos (Máx 5MB)</p>
                      </div>
                      <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" id="file-upload" />
                      <label htmlFor="file-upload" className="cursor-pointer bg-[#602080] hover:bg-[#7a29a3] text-white px-6 py-2 rounded-full font-bold text-sm transition-all">
                        {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-16 space-y-12 pb-20">
          {loadingUsername && (
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 border border-purple-100">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <h4 className="text-[#311432] font-bold text-lg flex items-center gap-2">
                    <Loader2 className="animate-spin text-[#602080]" size={20} />
                    Varredura em Progresso...
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    Procurando em: <span className="text-[#602080]">{currentCheckingSite}</span>
                  </p>
                </div>
                <span className="text-2xl font-black text-[#602080]">{searchProgress}%</span>
              </div>
              
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                <div 
                  className="h-full bg-gradient-to-r from-[#602080] to-[#7a29a3] transition-all duration-500 ease-out shadow-[0_0_15px_rgba(96,32,128,0.3)]"
                  style={{ width: `${searchProgress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                <span>Início</span>
                <span>{usernameResults.filter(r => r.status === 'found').length} Perfis Encontrados</span>
                <span>Conclusão</span>
              </div>
            </div>
          )}

          {(loadingUsername || usernameResults.length > 0) && (
            <div className="space-y-12">
              <div className="bg-white rounded-[2.5rem] p-2 shadow-2xl">
                <ResultsDisplay title={currentUsername} results={usernameResults} loading={loadingUsername} />
              </div>
              {!loadingUsername && usernameResults.length > 0 && (
                <>
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => addToWatchlist(currentUsername, usernameResults.filter(r => r.status === 'found').map(r => r.site))}
                      className="bg-[#311432] hover:bg-[#4a1e4c] text-[#C0C0C0] border border-[#602080]/30 gap-2 rounded-full px-8 py-6 text-lg font-bold shadow-xl"
                    >
                      <Eye size={20} className="text-[#602080]" />
                      Monitorar este Username
                    </Button>
                  </div>
                  {usernameResults.some(r => r.status === 'found') && (
                    <VisualGraph centralNode={currentUsername} platforms={usernameResults} />
                  )}
                </>
              )}
            </div>
          )}

          {(loadingEmail || emailResults.length > 0) && (
            <div className="space-y-12">
              <div className="bg-white rounded-[2.5rem] p-2 shadow-2xl">
                <ResultsDisplay title={currentEmail} results={emailResults} loading={loadingEmail} />
              </div>
              {!loadingEmail && emailResults.some(r => r.status === 'found') && (
                <VisualGraph centralNode={currentEmail} platforms={emailResults} />
              )}
            </div>
          )}
          
          {!loadingUsername && !loadingEmail && usernameResults.length === 0 && emailResults.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-[#C0C0C0]/20 space-y-4">
              <div className="p-8 rounded-full bg-[#311432]/20 border border-[#602080]/10 animate-pulse">
                <Search size={64} strokeWidth={1} />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.3em]">Pronto para iniciar a varredura</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
