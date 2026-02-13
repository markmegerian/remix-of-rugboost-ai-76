 import React, { useState, useEffect } from 'react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import ResponsiveFormSheet from '@/components/ResponsiveFormSheet';
 import { Loader2 } from 'lucide-react';
 import { z } from 'zod';
 
 // Validation schema for client info
 const clientInfoSchema = z.object({
   clientName: z.string().trim().min(1, 'Client name is required').max(100, 'Name must be less than 100 characters'),
   clientEmail: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters').optional().or(z.literal('')),
   clientPhone: z.string().trim().max(50, 'Phone must be less than 50 characters').optional().or(z.literal('')),
   notes: z.string().trim().max(2000, 'Notes must be less than 2000 characters').optional().or(z.literal('')),
 });
 
 interface ClientInfo {
   clientName: string;
   clientEmail: string;
   clientPhone: string;
   notes: string;
 }
 
 interface EditClientInfoDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   initialData: ClientInfo;
   onSave: (data: ClientInfo) => Promise<void>;
   isLoading?: boolean;
 }
 
 const EditClientInfoDialog: React.FC<EditClientInfoDialogProps> = ({
   open,
   onOpenChange,
   initialData,
   onSave,
   isLoading = false,
 }) => {
   const [formData, setFormData] = useState<ClientInfo>(initialData);
   const [errors, setErrors] = useState<Record<string, string>>({});
 
   // Reset form when dialog opens with new data
   useEffect(() => {
     if (open) {
       setFormData(initialData);
       setErrors({});
     }
   }, [open, initialData]);
 
   const handleInputChange = (
     e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
   ) => {
     const { name, value } = e.target;
     setFormData((prev) => ({ ...prev, [name]: value }));
     // Clear error when user types
     if (errors[name]) {
       setErrors((prev) => ({ ...prev, [name]: '' }));
     }
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setErrors({});
 
     // Validate
     const result = clientInfoSchema.safeParse(formData);
     if (!result.success) {
       const fieldErrors: Record<string, string> = {};
       result.error.errors.forEach((err) => {
         const field = err.path[0] as string;
         fieldErrors[field] = err.message;
       });
       setErrors(fieldErrors);
       return;
     }
 
     await onSave(formData);
   };
 
    return (
      <ResponsiveFormSheet open={open} onOpenChange={onOpenChange} title="Edit Client Information">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              placeholder="John Smith"
              required
            />
            {errors.clientName && (
              <p className="text-sm text-destructive">{errors.clientName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email</Label>
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              value={formData.clientEmail}
              onChange={handleInputChange}
              placeholder="john@example.com"
            />
            {errors.clientEmail && (
              <p className="text-sm text-destructive">{errors.clientEmail}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientPhone">Phone</Label>
            <Input
              id="clientPhone"
              name="clientPhone"
              type="tel"
              value={formData.clientPhone}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
            />
            {errors.clientPhone && (
              <p className="text-sm text-destructive">{errors.clientPhone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Job Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Delivery address, special instructions, etc."
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Include delivery address, special instructions, or other notes here.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </ResponsiveFormSheet>
    );
  };
  
  export default EditClientInfoDialog;