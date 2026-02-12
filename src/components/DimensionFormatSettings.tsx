import { memo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Ruler } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/hooks/useCompany";
import type { DimensionFormat } from "@/lib/rugDimensions";

const DimensionFormatSettingsComponent = () => {
  const { company, companyId, isCompanyAdmin, refetchCompany } = useCompany();

  const settings = (company?.settings ?? {}) as Record<string, unknown>;
  const currentFormat = (settings.dimension_format as DimensionFormat) || "ft_in";

  const handleChange = useCallback(
    async (value: string) => {
      try {
        const updatedSettings = { ...settings, dimension_format: value };
        const { error } = await supabase
          .from("companies")
          .update({ settings: updatedSettings })
          .eq("id", companyId!);

        if (error) throw error;
        await refetchCompany();
        toast.success("Dimension format updated");
      } catch (err) {
        console.error("Error updating dimension format:", err);
        toast.error("Failed to update dimension format");
      }
    },
    [companyId, settings, refetchCompany],
  );

  if (!isCompanyAdmin || !companyId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Dimension Format
        </CardTitle>
        <CardDescription>
          Choose how rug dimensions are entered and displayed across your company.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={currentFormat} onValueChange={handleChange} className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="ft_in" id="ft_in" className="mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="ft_in" className="font-medium cursor-pointer">
                Feet &amp; Inches (ft.in)
              </Label>
              <p className="text-xs text-muted-foreground">
                Industry standard notation. Example: <span className="font-mono">9.06</span> = 9 ft 6 in,{" "}
                <span className="font-mono">6.08</span> = 6 ft 8 in.
                Always use two digits for inches (e.g. <span className="font-mono">.06</span> not{" "}
                <span className="font-mono">.6</span>), except for 10 and 11.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="decimal_ft" id="decimal_ft" className="mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="decimal_ft" className="font-medium cursor-pointer">
                Decimal Feet
              </Label>
              <p className="text-xs text-muted-foreground">
                Standard decimal notation. Example: <span className="font-mono">9.50</span> = 9½ feet,{" "}
                <span className="font-mono">6.67</span> = 6 ft 8 in.
              </p>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

const DimensionFormatSettings = memo(DimensionFormatSettingsComponent);
DimensionFormatSettings.displayName = "DimensionFormatSettings";

export default DimensionFormatSettings;
