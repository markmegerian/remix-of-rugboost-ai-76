import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PlatformFeeSettings } from '@/components/admin/PlatformFeeSettings';
import { AdminNotificationSettings } from '@/components/admin/AdminNotificationSettings';
import { AdminEmailTemplates } from '@/components/admin/AdminEmailTemplates';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2 } from 'lucide-react';

const AdminSettings = () => {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <main className="container max-w-4xl py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-display font-bold">Platform Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage platform-wide configurations, fees, and notification preferences.
          </p>
        </div>

        <Tabs defaultValue="fees" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fees">Platform Fees</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="emails">Email Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="fees" className="space-y-6">
            <PlatformFeeSettings />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <AdminNotificationSettings />
          </TabsContent>

          <TabsContent value="emails" className="space-y-6">
            <AdminEmailTemplates />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminSettings;
