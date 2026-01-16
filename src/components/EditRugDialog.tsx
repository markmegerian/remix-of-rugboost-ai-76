import React, { useState } from 'react';
import { Hash, Ruler, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const RUG_TYPES = [
  'Persian',
  'Oriental',
  'Turkish',
  'Moroccan',
  'Afghan',
  'Indian',
  'Chinese',
  'Tibetan',
  'Kilim',
  'Navajo',
  'Aubusson',
  'Savonnerie',
  'Antique',
  'Hand-knotted',
  'Hand-tufted',
  'Machine-made',
  'Other',
];

interface Rug {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  notes: string | null;
}

interface EditRugDialogProps {
  rug: Rug | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rugId: string, data: { rugNumber: string; rugType: string; length: string; width: string; notes: string }) => Promise<void>;
  isLoading: boolean;
}

const EditRugDialog: React.FC<EditRugDialogProps> = ({
  rug,
  open,
  onOpenChange,
  onSave,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    rugNumber: rug?.rug_number || '',
    rugType: rug?.rug_type || '',
    length: rug?.length?.toString() || '',
    width: rug?.width?.toString() || '',
    notes: rug?.notes || '',
  });

  React.useEffect(() => {
    if (rug) {
      setFormData({
        rugNumber: rug.rug_number,
        rugType: rug.rug_type,
        length: rug.length?.toString() || '',
        width: rug.width?.toString() || '',
        notes: rug.notes || '',
      });
    }
  }, [rug]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rug) return;
    
    if (!formData.rugNumber || !formData.rugType) {
      toast.error('Please fill in all required fields');
      return;
    }

    await onSave(rug.id, formData);
  };

  if (!rug) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Rug</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rugNumber">Rug Number *</Label>
              <Input
                id="rugNumber"
                name="rugNumber"
                value={formData.rugNumber}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rugType">Rug Type *</Label>
              <Select 
                value={formData.rugType} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, rugType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {RUG_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="length" className="flex items-center gap-1">
                <Ruler className="h-3 w-3" /> Length (ft)
              </Label>
              <Input
                id="length"
                name="length"
                type="number"
                step="0.1"
                value={formData.length}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="width" className="flex items-center gap-1">
                <Ruler className="h-3 w-3" /> Width (ft)
              </Label>
              <Input
                id="width"
                name="width"
                type="number"
                step="0.1"
                value={formData.width}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRugDialog;
