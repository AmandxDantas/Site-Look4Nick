import React from 'react';
import { Search, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { signInWithGoogle, logout } from '../../firebase';
import { Button } from '@/components/ui/button';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * MainLayout - O componente de estrutura principal.
 */
export default function MainLayout({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#121212] text-[#C0C0C0]">
      {/* Navbar: Fundo escuro, borda sutil e título em prata/roxo */}
      <header className="bg-[#121212] border-b border-[#311432] py-4 px-6 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-[#602080] p-1.5 rounded-lg shadow-inner">
              <Search className="text-[#C0C0C0]" size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#C0C0C0]">
              Look4Nick <span className="text-[#602080] font-light">app</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex space-x-6 text-sm font-medium text-[#C0C0C0]/60 mr-4">
              <a href="#" className="hover:text-[#602080] transition-colors">Sobre</a>
              <a href="#" className="hover:text-[#602080] transition-colors">Privacidade</a>
            </nav>

            {!loading && (
              user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-bold text-[#C0C0C0]">{user.displayName}</span>
                    <span className="text-[10px] text-[#C0C0C0]/40">{user.email}</span>
                  </div>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-[#602080]/30" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#311432] flex items-center justify-center border border-[#602080]/30">
                      <UserIcon size={16} className="text-[#C0C0C0]" />
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={logout}
                    className="text-[#C0C0C0]/60 hover:text-red-400 hover:bg-red-400/10"
                  >
                    <LogOut size={18} />
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={signInWithGoogle}
                  className="bg-[#602080] hover:bg-[#7a29a3] text-white gap-2 rounded-full px-6"
                >
                  <LogIn size={18} />
                  Login
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Área de Conteúdo com o Degradê Dark */}
      <main className="flex-1 bg-main-gradient flex flex-col items-center justify-start pt-12 pb-20 px-4">
        <div className="w-full max-w-5xl">
          {children}
        </div>
      </main>

      {/* Rodapé Minimalista */}
      <footer className="bg-[#121212] border-t border-[#311432] py-6 text-center text-[#C0C0C0]/40 text-xs">
        <p>© 2026 Look4Nick - Inteligência OSINT Privada</p>
      </footer>
    </div>
  );
}
