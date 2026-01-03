import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  Shield, 
  Terminal,
  User
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'admin';
  onTabChange: (tab: 'dashboard' | 'admin') => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/50">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">DevSecOps Console</h1>
              <p className="text-xs text-muted-foreground font-mono">SECURE ADMIN PANEL</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 ml-8">
            <Button
              variant={activeTab === 'dashboard' ? 'terminal' : 'ghost'}
              size="sm"
              onClick={() => onTabChange('dashboard')}
            >
              <Terminal className="w-4 h-4 mr-2" />
              Commands
            </Button>
            {user?.role === 'admin' && (
              <Button
                variant={activeTab === 'admin' ? 'terminal' : 'ghost'}
                size="sm"
                onClick={() => onTabChange('admin')}
              >
                <User className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium">{user?.username}</div>
            <div className="text-xs text-muted-foreground font-mono uppercase">
              {user?.role}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
