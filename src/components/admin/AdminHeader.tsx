import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Shield, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import rugboostLogo from '@/assets/rugboost-logo.svg';
interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
}
export const AdminHeader = ({
  title = 'Platform Admin',
  subtitle = 'Manage businesses and payouts'
}: AdminHeaderProps) => {
  const navigate = useNavigate();
  const {
    signOut
  } = useAuth();
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  return <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground font-sans">{title}</h1>
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/admin/users')} variant="outline" size="sm" className="gap-2">
            Users
          </Button>
          <Button onClick={() => navigate('/admin/ai-training')} variant="ghost" size="icon" title="AI Training">
            <Brain className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate('/admin/settings')} variant="ghost" size="icon" title="Platform Settings">
            <Settings className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" className="gap-2">
            ← Jobs
          </Button>
          <Button onClick={handleSignOut} variant="ghost" size="icon">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>;
};