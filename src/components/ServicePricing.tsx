import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DollarSign, Loader2, Save } from "lucide-react";
import { DEFAULT_SERVICES } from "@/lib/defaultServices";
import { useCompany } from "@/hooks/useCompany";

interface ServicePrice {
  id?: string;
  service_name: string;
  unit_price: number;
}

interface ServicePricingProps {
  userId: string;
}

const ServicePricingComponent = ({ userId }: ServicePricingProps) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
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
          .eq("company_id", companyId)
          .eq("is_additional", false);
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from("service_prices")
          .select("*")
          .eq("user_id", userId);
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      const priceMap: Record<string, number> = {};
      DEFAULT_SERVICES.forEach((service) => {
        priceMap[service] = 0;
      });

      data?.forEach((item: ServicePrice) => {
        priceMap[item.service_name] = item.unit_price;
      });

      setPrices(priceMap);
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

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (companyId) {
        const upsertData = Object.entries(prices).map(([service_name, unit_price]) => ({
          company_id: companyId,
          service_name,
          unit_price,
          is_additional: false,
        }));

        const { error } = await supabase
          .from("company_service_prices")
          .upsert(upsertData, { onConflict: "company_id,service_name" });

        if (error) throw error;
      } else {
        const upsertData = Object.entries(prices).map(([service_name, unit_price]) => ({
          user_id: userId,
          service_name,
          unit_price,
        }));

        const { error } = await supabase
          .from("service_prices")
          .upsert(upsertData, { onConflict: "user_id,service_name" });

        if (error) throw error;
      }

      toast.success("Service prices saved successfully");
    } catch (error) {
      console.error("Error saving service prices:", error);
      toast.error("Failed to save service prices");
    } finally {
      setSaving(false);
    }
  }, [prices, userId, companyId]);

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Service Pricing
        </CardTitle>
        <CardDescription>
          Set your unit prices for each service type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_SERVICES.map((service) => (
            <div key={service} className="space-y-1">
              <Label htmlFor={service} className="text-sm">
                {service}
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
          ))}
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Prices
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ServicePricing = memo(ServicePricingComponent);
ServicePricing.displayName = 'ServicePricing';

export default ServicePricing;
