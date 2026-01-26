import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, Loader2, Save, Building, Wallet, Shield } from "lucide-react";

interface PaymentInfo {
  payment_method: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_routing_number: string | null;
  paypal_email: string | null;
  venmo_handle: string | null;
  zelle_email: string | null;
  payment_notes: string | null;
}

// Fields that should be encrypted
const ENCRYPTED_FIELDS = [
  'bank_account_number',
  'bank_routing_number',
  'paypal_email',
  'venmo_handle',
  'zelle_email'
];

const PaymentInfoSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    payment_method: "bank_transfer",
    bank_name: "",
    bank_account_number: "",
    bank_routing_number: "",
    paypal_email: "",
    venmo_handle: "",
    zelle_email: "",
    payment_notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchPaymentInfo();
    }
  }, [user]);

  const decryptFields = async (data: Record<string, string | null>): Promise<Record<string, string>> => {
    const encryptedData: Record<string, string> = {};
    
    for (const field of ENCRYPTED_FIELDS) {
      if (data[field]) {
        encryptedData[field] = data[field] as string;
      }
    }

    if (Object.keys(encryptedData).length === 0) {
      return {};
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return {};

      const response = await supabase.functions.invoke('financial-data', {
        body: { action: 'decrypt', data: encryptedData }
      });

      if (response.error) {
        console.error('Decryption error:', response.error);
        return {};
      }

      return response.data?.data || {};
    } catch (error) {
      console.error('Failed to decrypt fields:', error);
      return {};
    }
  };

  const encryptFields = async (data: Record<string, string | null>): Promise<Record<string, string>> => {
    const toEncrypt: Record<string, string> = {};
    
    for (const field of ENCRYPTED_FIELDS) {
      if (data[field]) {
        toEncrypt[field] = data[field] as string;
      }
    }

    if (Object.keys(toEncrypt).length === 0) {
      return {};
    }

    try {
      const response = await supabase.functions.invoke('financial-data', {
        body: { action: 'encrypt', data: toEncrypt }
      });

      if (response.error) {
        throw response.error;
      }

      return response.data?.data || {};
    } catch (error) {
      console.error('Failed to encrypt fields:', error);
      throw new Error('Failed to secure payment data');
    }
  };

  const fetchPaymentInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("payment_method, bank_name, bank_account_number, bank_routing_number, paypal_email, venmo_handle, zelle_email, payment_notes")
        .eq("user_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        // Decrypt sensitive fields
        const decrypted = await decryptFields(data);
        
        setPaymentInfo({
          payment_method: data.payment_method || "bank_transfer",
          bank_name: data.bank_name || "",
          bank_account_number: decrypted.bank_account_number || data.bank_account_number || "",
          bank_routing_number: decrypted.bank_routing_number || data.bank_routing_number || "",
          paypal_email: decrypted.paypal_email || data.paypal_email || "",
          venmo_handle: decrypted.venmo_handle || data.venmo_handle || "",
          zelle_email: decrypted.zelle_email || data.zelle_email || "",
          payment_notes: data.payment_notes || "",
        });
      }
    } catch (error) {
      console.error("Error fetching payment info:", error);
      toast.error("Failed to load payment information");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPaymentInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleMethodChange = (value: string) => {
    setPaymentInfo((prev) => ({ ...prev, payment_method: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Encrypt sensitive fields before saving
      const dataToEncrypt: Record<string, string | null> = {
        bank_account_number: paymentInfo.bank_account_number || null,
        bank_routing_number: paymentInfo.bank_routing_number || null,
        paypal_email: paymentInfo.paypal_email || null,
        venmo_handle: paymentInfo.venmo_handle || null,
        zelle_email: paymentInfo.zelle_email || null,
      };

      const encrypted = await encryptFields(dataToEncrypt);

      const { error } = await supabase
        .from("profiles")
        .update({
          payment_method: paymentInfo.payment_method,
          bank_name: paymentInfo.bank_name || null,
          bank_account_number: encrypted.bank_account_number || paymentInfo.bank_account_number || null,
          bank_routing_number: encrypted.bank_routing_number || paymentInfo.bank_routing_number || null,
          paypal_email: encrypted.paypal_email || paymentInfo.paypal_email || null,
          venmo_handle: encrypted.venmo_handle || paymentInfo.venmo_handle || null,
          zelle_email: encrypted.zelle_email || paymentInfo.zelle_email || null,
          payment_notes: paymentInfo.payment_notes || null,
        })
        .eq("user_id", user!.id);

      if (error) throw error;

      toast.success("Payment information saved securely");
    } catch (error) {
      console.error("Error saving payment info:", error);
      toast.error("Failed to save payment information");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Information
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Your payment data is encrypted for security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Method Selection */}
        <div className="space-y-2">
          <Label htmlFor="payment_method">Preferred Payment Method</Label>
          <Select
            value={paymentInfo.payment_method || "bank_transfer"}
            onValueChange={handleMethodChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank_transfer">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Bank Transfer (ACH)
                </div>
              </SelectItem>
              <SelectItem value="paypal">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  PayPal
                </div>
              </SelectItem>
              <SelectItem value="venmo">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Venmo
                </div>
              </SelectItem>
              <SelectItem value="zelle">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Zelle
                </div>
              </SelectItem>
              <SelectItem value="check">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Check
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bank Transfer Fields */}
        {paymentInfo.payment_method === "bank_transfer" && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-medium flex items-center gap-2">
              <Building className="h-4 w-4" />
              Bank Account Details
              <Shield className="h-3 w-3 text-green-600" />
            </h4>
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                name="bank_name"
                value={paymentInfo.bank_name || ""}
                onChange={handleInputChange}
                placeholder="e.g., Chase, Bank of America"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_routing_number">Routing Number</Label>
                <Input
                  id="bank_routing_number"
                  name="bank_routing_number"
                  value={paymentInfo.bank_routing_number || ""}
                  onChange={handleInputChange}
                  placeholder="9 digits"
                  maxLength={9}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  name="bank_account_number"
                  value={paymentInfo.bank_account_number || ""}
                  onChange={handleInputChange}
                  placeholder="Account number"
                />
              </div>
            </div>
          </div>
        )}

        {/* PayPal Fields */}
        {paymentInfo.payment_method === "paypal" && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-medium flex items-center gap-2">
              PayPal Details
              <Shield className="h-3 w-3 text-green-600" />
            </h4>
            <div className="space-y-2">
              <Label htmlFor="paypal_email">PayPal Email</Label>
              <Input
                id="paypal_email"
                name="paypal_email"
                type="email"
                value={paymentInfo.paypal_email || ""}
                onChange={handleInputChange}
                placeholder="your@paypal.email"
              />
            </div>
          </div>
        )}

        {/* Venmo Fields */}
        {paymentInfo.payment_method === "venmo" && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-medium flex items-center gap-2">
              Venmo Details
              <Shield className="h-3 w-3 text-green-600" />
            </h4>
            <div className="space-y-2">
              <Label htmlFor="venmo_handle">Venmo Handle</Label>
              <Input
                id="venmo_handle"
                name="venmo_handle"
                value={paymentInfo.venmo_handle || ""}
                onChange={handleInputChange}
                placeholder="@your-venmo-handle"
              />
            </div>
          </div>
        )}

        {/* Zelle Fields */}
        {paymentInfo.payment_method === "zelle" && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-medium flex items-center gap-2">
              Zelle Details
              <Shield className="h-3 w-3 text-green-600" />
            </h4>
            <div className="space-y-2">
              <Label htmlFor="zelle_email">Zelle Email or Phone</Label>
              <Input
                id="zelle_email"
                name="zelle_email"
                value={paymentInfo.zelle_email || ""}
                onChange={handleInputChange}
                placeholder="Email or phone registered with Zelle"
              />
            </div>
          </div>
        )}

        {/* Check - just a note */}
        {paymentInfo.payment_method === "check" && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">
              Checks will be mailed to your business address. Please ensure your business address is up to date in the Business Branding section above.
            </p>
          </div>
        )}

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label htmlFor="payment_notes">Additional Payment Notes</Label>
          <Textarea
            id="payment_notes"
            name="payment_notes"
            value={paymentInfo.payment_notes || ""}
            onChange={handleInputChange}
            placeholder="Any special instructions for receiving payments..."
            rows={3}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Payment Info
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentInfoSettings;
