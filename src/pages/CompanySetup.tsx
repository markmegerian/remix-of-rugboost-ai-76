import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Loader2, ArrowRight, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import rugboostLogo from '@/assets/rugboost-logo.svg';

const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  businessEmail: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  businessPhone: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const CompanySetup: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { refetchCompany, hasCompany, loading: companyLoading } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect if already has a company
  useEffect(() => {
    if (!companyLoading && hasCompany) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasCompany, companyLoading, navigate]);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      businessEmail: user?.email || '',
      businessPhone: '',
    },
  });

  // Show loading while checking auth
  if (authLoading || companyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render form if not authenticated
  if (!user) {
    return null;
  }

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) + '-' + Date.now().toString(36);
  };

  const onSubmit = async (values: CompanyFormValues) => {
    if (!user) {
      toast.error('You must be logged in to create a company');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: values.name,
          slug: generateSlug(values.name),
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 2. Create company membership (as admin)
      const { error: membershipError } = await supabase
        .from('company_memberships')
        .insert({
          company_id: companyData.id,
          user_id: user.id,
          role: 'company_admin',
        });

      if (membershipError) throw membershipError;

      // 3. Create company branding with initial values
      const { error: brandingError } = await supabase
        .from('company_branding')
        .insert({
          company_id: companyData.id,
          business_name: values.name,
          business_email: values.businessEmail || null,
          business_phone: values.businessPhone || null,
        });

      if (brandingError) throw brandingError;

      toast.success('Company created successfully!');
      
      // Refetch company data to update context
      await refetchCompany();
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(error.message || 'Failed to create company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={rugboostLogo} alt="RugBoost" className="h-12 w-12 mx-auto" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Your Company
          </CardTitle>
          <CardDescription>
            Set up your business to start using RugBoost. You'll be the administrator
            and can invite team members later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Acme Rug Cleaning Co." 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      This will be displayed to your clients
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="contact@acmerugs.com" 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Contact email shown to clients
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Phone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(555) 123-4567" 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Company...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySetup;
