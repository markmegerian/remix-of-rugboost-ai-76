import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Briefcase, Settings, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import rugboostLogo from '@/assets/rugboost-logo.svg';

interface MobileNavProps {
  isAdmin?: boolean;
  onSignOut: () => void;
}

const MobileNav = memo(({ isAdmin = false, onSignOut }: MobileNavProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
  }, [navigate]);

  const handleSignOut = useCallback(() => {
    setOpen(false);
    onSignOut();
  }, [onSignOut]);

  const handleOpenChange = useCallback((value: boolean) => {
    setOpen(value);
  }, []);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3">
            <img src={rugboostLogo} alt="RugBoost" className="h-8 w-8" />
            <SheetTitle className="font-display">RugBoost</SheetTitle>
          </div>
        </SheetHeader>
        
        <nav className="mt-8 flex flex-col gap-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => handleNavigate('/dashboard')}
          >
            <Briefcase className="h-4 w-4" />
            Jobs
          </Button>
          
          {isAdmin && (
            <>
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground px-3 py-1">Admin</p>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => handleNavigate('/admin/users')}
              >
                <Users className="h-4 w-4" />
                Users & Roles
              </Button>
            </>
          )}
          
          <Separator className="my-4" />
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => handleNavigate('/settings')}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
});

MobileNav.displayName = 'MobileNav';

export default MobileNav;
