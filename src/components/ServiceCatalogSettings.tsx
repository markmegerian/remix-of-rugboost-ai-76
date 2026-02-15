import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ListChecks, Loader2, Save } from "lucide-react";
import { DEFAULT_SERVICES, DEFAULT_VARIABLE_SERVICES } from "@/lib/defaultServices";
import { useCompany } from "@/hooks/useCompany";

interface ServiceCatalogSettingsProps {
  userId: string;
}

const ServiceCatalogSettingsComponent = ({ userId }: ServiceCatalogSettingsProps) => {
  const { companyId, isCompanyAdmin } = useCompany();
  const [enabledFixed, setEnabledFixed] = useState<Record<string, boolean>>({});
  const [enabledVariable, setEnabledVariable] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEnabledServices = useCallback(async () => {
    if (!companyId) {
      // Without a company, all services are enabled by default
      const fixedMap: Record<string, boolean> = {};
      DEFAULT_SERVICES.forEach(s => { fixedMap[s] = true; });
      const varMap: Record<string, boolean> = {};
      DEFAULT_VARIABLE_SERVICES.forEach(s => { varMap[s] = true; });
      setEnabledFixed(fixedMap);
      setEnabledVariable(varMap);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("company_enabled_services")
        .select("service_name, is_enabled")
        .eq("company_id", companyId);

      if (error) throw error;

      const dbMap = new Map(data?.map(d => [d.service_name, d.is_enabled]) || []);

      // If no rows exist yet, default all to enabled
      const hasRows = (data?.length || 0) > 0;

      const fixedMap: Record<string, boolean> = {};
      DEFAULT_SERVICES.forEach(s => {
        fixedMap[s] = hasRows ? (dbMap.get(s) ?? false) : true;
      });

      const varMap: Record<string, boolean> = {};
      DEFAULT_VARIABLE_SERVICES.forEach(s => {
        varMap[s] = hasRows ? (dbMap.get(s) ?? false) : true;
      });

      setEnabledFixed(fixedMap);
      setEnabledVariable(varMap);
    } catch (err) {
      console.error("Error fetching enabled services:", err);
      toast.error("Failed to load service catalog");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchEnabledServices();
  }, [fetchEnabledServices]);

  const handleSave = useCallback(async () => {
    if (!companyId) {
      toast.error("Company context required");
      return;
    }
    setSaving(true);
    try {
      const allEntries = [
        ...Object.entries(enabledFixed).map(([name, enabled]) => ({
          company_id: companyId,
          service_name: name,
          is_enabled: enabled,
        })),
        ...Object.entries(enabledVariable).map(([name, enabled]) => ({
          company_id: companyId,
          service_name: name,
          is_enabled: enabled,
        })),
      ];

      const { error } = await supabase
        .from("company_enabled_services")
        .upsert(allEntries, { onConflict: "company_id,service_name" });

      if (error) throw error;
      toast.success("Service catalog updated");
    } catch (err) {
      console.error("Error saving service catalog:", err);
      toast.error("Failed to save service catalog");
    } finally {
      setSaving(false);
    }
  }, [companyId, enabledFixed, enabledVariable]);

  if (!isCompanyAdmin) return null;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Fixed Price Services
          </CardTitle>
          <CardDescription>
            Toggle which fixed-price services appear in your company's catalog.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DEFAULT_SERVICES.map((service) => (
            <div
              key={service}
              className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={enabledFixed[service] ?? true}
                  onCheckedChange={(checked) =>
                    setEnabledFixed(prev => ({ ...prev, [service]: checked }))
                  }
                />
                <span className="text-sm font-medium">{service}</span>
              </div>
              <Badge variant="secondary" className="text-xs">Fixed</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Variable Price Services
          </CardTitle>
          <CardDescription>
            Toggle which variable-price services (priced per rug) appear in your catalog.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DEFAULT_VARIABLE_SERVICES.map((service) => (
            <div
              key={service}
              className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={enabledVariable[service] ?? true}
                  onCheckedChange={(checked) =>
                    setEnabledVariable(prev => ({ ...prev, [service]: checked }))
                  }
                />
                <span className="text-sm font-medium">{service}</span>
              </div>
              <Badge variant="outline" className="text-xs">Variable</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Catalog
        </Button>
      </div>
    </div>
  );
};

const ServiceCatalogSettings = memo(ServiceCatalogSettingsComponent);
ServiceCatalogSettings.displayName = "ServiceCatalogSettings";

export default ServiceCatalogSettings;
