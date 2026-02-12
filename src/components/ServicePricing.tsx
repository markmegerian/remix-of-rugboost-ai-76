import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, Loader2, Save, Wrench } from "lucide-react";
import { DEFAULT_SERVICES, DEFAULT_VARIABLE_SERVICES } from "@/lib/defaultServices";
import { getServiceUnit } from "@/lib/serviceUnits";
import { useCompany } from "@/hooks/useCompany";

interface ServicePricingProps {
  userId: string;
}

const ServicePricingComponent = ({ userId }: ServicePricingProps) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [enabledVariableServices, setEnabledVariableServices] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { companyId } = useCompany();

  const fetchPrices = useCallback(async () => {
    try {
      let data;
      let error;

      if (companyId) {
        const result = await supabase
          .from("company_service_prices")
          .select("service_name, unit_price, is_additional")
          .eq("company_id", companyId);
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from("service_prices")
          .select("service_name, unit_price, is_additional")
          .eq("user_id", userId);
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Fixed-price services
      const priceMap: Record<string, number> = {};
      DEFAULT_SERVICES.forEach((service) => {
        priceMap[service] = 0;
      });

      // Variable services - check which are enabled (saved in DB with is_additional=true)
      const variableMap: Record<string, boolean> = {};
      DEFAULT_VARIABLE_SERVICES.forEach((service) => {
        variableMap[service] = false;
      });

      data?.forEach((item) => {
        if (item.is_additional) {
          variableMap[item.service_name] = true;
        } else {
          priceMap[item.service_name] = item.unit_price;
        }
      });

      setPrices(priceMap);
      setEnabledVariableServices(variableMap);
    } catch (error) {
      console.error("Error fetching service prices:", error);
      toast.error("Failed to load service prices");
    } finally {
      setLoading(false);
    }
  }, [userId, companyId]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const handlePriceChange = useCallback((serviceName: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setPrices((prev) => ({ ...prev, [serviceName]: numericValue }));
  }, []);

  const toggleVariableService = useCallback((serviceName: string) => {
    setEnabledVariableServices((prev) => ({
      ...prev,
      [serviceName]: !prev[serviceName],
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Build fixed-price entries
      const fixedEntries = Object.entries(prices).map(([service_name, unit_price]) => ({
        service_name,
        unit_price,
        is_additional: false,
      }));

      // Build variable-price entries (only enabled ones, with unit_price=0)
      const variableEntries = Object.entries(enabledVariableServices)
        .filter(([, enabled]) => enabled)
        .map(([service_name]) => ({
          service_name,
          unit_price: 0,
          is_additional: true,
        }));

      const allEntries = [...fixedEntries, ...variableEntries];

      if (companyId) {
        const upsertData = allEntries.map((entry) => ({
          company_id: companyId,
          ...entry,
        }));

        const { error } = await supabase
          .from("company_service_prices")
          .upsert(upsertData, { onConflict: "company_id,service_name" });

        if (error) throw error;

        // Remove disabled variable services
        const disabledVariables = Object.entries(enabledVariableServices)
          .filter(([, enabled]) => !enabled)
          .map(([name]) => name);

        if (disabledVariables.length > 0) {
          await supabase
            .from("company_service_prices")
            .delete()
            .eq("company_id", companyId)
            .eq("is_additional", true)
            .in("service_name", disabledVariables);
        }
      } else {
        const upsertData = allEntries.map((entry) => ({
          user_id: userId,
          ...entry,
        }));

        const { error } = await supabase
          .from("service_prices")
          .upsert(upsertData, { onConflict: "user_id,service_name" });

        if (error) throw error;

        // Remove disabled variable services
        const disabledVariables = Object.entries(enabledVariableServices)
          .filter(([, enabled]) => !enabled)
          .map(([name]) => name);

        if (disabledVariables.length > 0) {
          await supabase
            .from("service_prices")
            .delete()
            .eq("user_id", userId)
            .eq("is_additional", true)
            .in("service_name", disabledVariables);
        }
      }

      toast.success("Service prices saved successfully");
    } catch (error) {
      console.error("Error saving service prices:", error);
      toast.error("Failed to save service prices");
    } finally {
      setSaving(false);
    }
  }, [prices, enabledVariableServices, userId, companyId]);

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
      {/* Fixed Price Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fixed Price Services
          </CardTitle>
          <CardDescription>
            Set your standard unit prices. These rates auto-fill when adding services to estimates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFAULT_SERVICES.map((service) => {
              const unit = getServiceUnit(service);
              return (
                <div key={service} className="space-y-1">
                  <Label htmlFor={service} className="text-sm flex items-center gap-2">
                    {service}
                    <Badge variant="outline" className="text-[9px] h-4">
                      {unit.label}
                    </Badge>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id={service}
                      type="number"
                      min="0"
                      step="0.01"
                      value={prices[service] || ""}
                      onChange={(e) => handlePriceChange(service, e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Variable Price Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Variable Price Services
          </CardTitle>
          <CardDescription>
            Enable services where pricing varies per rug. Staff will enter the price each time these are added to an estimate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DEFAULT_VARIABLE_SERVICES.map((service) => (
            <div
              key={service}
              className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={enabledVariableServices[service] || false}
                  onCheckedChange={() => toggleVariableService(service)}
                />
                <span className="text-sm font-medium">{service}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                Price per rug
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save All Prices
        </Button>
      </div>
    </div>
  );
};

const ServicePricing = memo(ServicePricingComponent);
ServicePricing.displayName = 'ServicePricing';

export default ServicePricing;
