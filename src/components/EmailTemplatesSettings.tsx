import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EmailTemplate {
  id?: string;
  template_type: string;
  subject: string;
  body: string;
}

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string; description: string }> = {
  client_invite: {
    subject: 'Your Rug Inspection Estimate is Ready - {{business_name}}',
    body: `Dear {{client_name}},

Thank you for choosing {{business_name}} for your rug care needs.

We have completed the inspection of your rugs and prepared a detailed estimate for the recommended services. Please click the link below to review your estimate and approve the services you'd like us to proceed with:

{{portal_link}}

Your Job Number: #{{job_number}}

If you have any questions, please don't hesitate to contact us.

Best regards,
{{business_name}}
{{business_phone}}`,
    description: 'Sent when a client portal link is generated',
  },
  payment_confirmation: {
    subject: '✓ Payment Confirmed - Job #{{job_number}}',
    body: `Dear {{client_name}},

Thank you for your payment! We've received your payment of {{amount}} and are excited to begin work on your rugs.

Job Number: #{{job_number}}
Status: In Progress

What happens next:
- Our team will begin working on your rugs immediately
- You'll receive updates as we make progress
- We'll contact you when your rugs are ready

If you have any questions, please don't hesitate to reach out.

Best regards,
{{business_name}}
{{business_phone}}`,
    description: 'Sent to client after successful payment',
  },
  report_email: {
    subject: 'Rug Inspection Report - Job #{{job_number}}',
    body: `Dear {{client_name}},

Please find attached the detailed inspection report for Job #{{job_number}}.

If you have any questions about the report or would like to discuss the recommended services, please don't hesitate to contact us.

Best regards,
{{business_name}}
{{business_phone}}`,
    description: 'Sent when sharing inspection report via email',
  },
};

const TEMPLATE_VARIABLES = [
  { name: '{{client_name}}', description: "Client's full name" },
  { name: '{{business_name}}', description: 'Your business name' },
  { name: '{{business_phone}}', description: 'Your business phone' },
  { name: '{{business_email}}', description: 'Your business email' },
  { name: '{{job_number}}', description: 'Job reference number' },
  { name: '{{portal_link}}', description: 'Client portal URL (invite only)' },
  { name: '{{amount}}', description: 'Payment amount (confirmation only)' },
];

const EmailTemplatesSettings: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const templateMap: Record<string, EmailTemplate> = {};
      (data || []).forEach((t) => {
        templateMap[t.template_type] = t;
      });

      // Merge with defaults
      Object.keys(DEFAULT_TEMPLATES).forEach((type) => {
        if (!templateMap[type]) {
          templateMap[type] = {
            template_type: type,
            subject: DEFAULT_TEMPLATES[type].subject,
            body: DEFAULT_TEMPLATES[type].body,
          };
        }
      });

      setTemplates(templateMap);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type: string) => {
    if (!user) return;

    const template = templates[type];
    if (!template) return;

    setSaving(type);
    try {
      const { error } = await supabase
        .from('email_templates')
        .upsert({
          user_id: user.id,
          template_type: type,
          subject: template.subject,
          body: template.body,
        }, {
          onConflict: 'user_id,template_type',
        });

      if (error) throw error;

      toast.success('Template saved successfully');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async (type: string) => {
    if (!user) return;

    // Delete from database to use default
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('user_id', user.id)
        .eq('template_type', type);

      if (error) throw error;

      // Reset to default in state
      setTemplates(prev => ({
        ...prev,
        [type]: {
          template_type: type,
          subject: DEFAULT_TEMPLATES[type].subject,
          body: DEFAULT_TEMPLATES[type].body,
        },
      }));

      toast.success('Template reset to default');
    } catch (error) {
      console.error('Error resetting template:', error);
      toast.error('Failed to reset template');
    }
  };

  const updateTemplate = (type: string, field: 'subject' | 'body', value: string) => {
    setTemplates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-10 bg-muted rounded" />
      <div className="h-40 bg-muted rounded" />
    </div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Templates</CardTitle>
        <CardDescription>
          Customize the emails sent to your clients. Use variables like {'{{client_name}}'} to personalize messages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Available variables:</strong>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {TEMPLATE_VARIABLES.map(v => (
                <div key={v.name}>
                  <code className="bg-muted px-1 rounded">{v.name}</code> - {v.description}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="client_invite">
          <TabsList className="mb-4">
            <TabsTrigger value="client_invite">Portal Invite</TabsTrigger>
            <TabsTrigger value="payment_confirmation">Payment Confirmation</TabsTrigger>
            <TabsTrigger value="report_email">Report Email</TabsTrigger>
          </TabsList>

          {Object.entries(DEFAULT_TEMPLATES).map(([type, defaults]) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <p className="text-sm text-muted-foreground">{defaults.description}</p>
              
              <div className="space-y-2">
                <Label htmlFor={`${type}-subject`}>Subject Line</Label>
                <Input
                  id={`${type}-subject`}
                  value={templates[type]?.subject || ''}
                  onChange={(e) => updateTemplate(type, 'subject', e.target.value)}
                  placeholder="Email subject..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${type}-body`}>Email Body</Label>
                <Textarea
                  id={`${type}-body`}
                  value={templates[type]?.body || ''}
                  onChange={(e) => updateTemplate(type, 'body', e.target.value)}
                  placeholder="Email content..."
                  className="min-h-[250px] font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave(type)}
                  disabled={saving === type}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving === type ? 'Saving...' : 'Save Template'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReset(type)}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Default
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmailTemplatesSettings;
