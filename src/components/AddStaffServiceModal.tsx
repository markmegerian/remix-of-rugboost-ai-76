// Staff/Admin Modal for Adding Services to AI-Generated Estimates
// Appends services with source='staff' tracking

import { useState, useMemo } from 'react';
import { DEFAULT_VARIABLE_SERVICES } from '@/lib/defaultServices';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Plus, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export interface StaffAddedService {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority: 'high' | 'medium' | 'low';
  // Staff addition metadata
  source: 'ai' | 'staff';
  addedBy?: string;
  addedByName?: string;
  addedAt?: string;
  reasonNote?: string;
}

interface AddStaffServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (service: StaffAddedService) => void;
  availableServices: { name: string; unitPrice: number }[];
  isAdmin: boolean;
  userId: string;
  userName?: string;
}

export default function AddStaffServiceModal({
  open,
  onOpenChange,
  onAdd,
  availableServices,
  isAdmin,
  userId,
  userName,
}: AddStaffServiceModalProps) {
  const [selectedService, setSelectedService] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [reasonNote, setReasonNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const variableServiceNames = new Set(DEFAULT_VARIABLE_SERVICES as readonly string[]);

  // Get unique service names from catalog
  const serviceOptions = useMemo(() => {
    const uniqueNames = [...new Set(availableServices.map(s => s.name))];
    return uniqueNames.sort((a, b) => a.localeCompare(b));
  }, [availableServices]);

  const isVariablePrice = variableServiceNames.has(selectedService);

  // When service selection changes, prefill price
  const handleServiceChange = (serviceName: string) => {
    setSelectedService(serviceName);
    const isVariable = variableServiceNames.has(serviceName);
    if (isVariable) {
      setUnitPrice(0); // Variable services always require manual entry
    } else {
      const catalogService = availableServices.find(s => s.name === serviceName);
      if (catalogService) {
        setUnitPrice(catalogService.unitPrice);
      }
    }
    setError(null);
  };

  const handleSubmit = () => {
    // Validation
    if (!selectedService) {
      setError('Please select a service');
      return;
    }
    if (!reasonNote.trim()) {
      setError('A reason note is required to explain why this service was added');
      return;
    }
    if (quantity < 1) {
      setError('Quantity must be at least 1');
      return;
    }
    if (unitPrice < 0) {
      setError('Price cannot be negative');
      return;
    }
    if (isVariablePrice && unitPrice === 0) {
      setError('Please enter a price for this variable-price service');
      return;
    }

    const newService: StaffAddedService = {
      id: crypto.randomUUID(),
      name: selectedService,
      quantity,
      unitPrice,
      priority: 'medium',
      source: 'staff',
      addedBy: userId,
      addedByName: userName || undefined,
      addedAt: new Date().toISOString(),
      reasonNote: reasonNote.trim(),
    };

    onAdd(newService);
    
    // Reset form
    setSelectedService('');
    setQuantity(1);
    setUnitPrice(0);
    setReasonNote('');
    setError(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedService('');
    setQuantity(1);
    setUnitPrice(0);
    setReasonNote('');
    setError(null);
    onOpenChange(false);
  };

  const total = quantity * unitPrice;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Service
          </DialogTitle>
          <DialogDescription>
            Add a service that was missed by the AI analysis. This will be tracked as a staff addition.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Service *</Label>
            <Select value={selectedService} onValueChange={handleServiceChange}>
              <SelectTrigger id="service">
                <SelectValue placeholder="Select a service from catalog..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {serviceOptions.map(name => (
                  <SelectItem key={name} value={name}>
                    <span className="flex items-center gap-2">
                      {name}
                      {variableServiceNames.has(name) && (
                        <Badge variant="outline" className="text-[10px] h-4 ml-1">
                          Variable
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variable price hint */}
          {isVariablePrice && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This is a variable-price service. Enter the price based on the specific rug's needs.
              </AlertDescription>
            </Alert>
          )}

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-price">
                Unit Price ($) {isVariablePrice 
                  ? <span className="text-xs text-amber-600">(required)</span>
                  : !isAdmin && <span className="text-xs text-muted-foreground">(catalog rate)</span>
                }
              </Label>
              <Input
                id="unit-price"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                disabled={!isAdmin && !isVariablePrice}
                className={isVariablePrice ? 'border-amber-300 focus-visible:ring-amber-400' : ''}
              />
              {!isAdmin && !isVariablePrice && (
                <p className="text-[10px] text-muted-foreground">
                  Only admins can modify pricing
                </p>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
            <span className="text-sm font-medium">Total</span>
            <span className="text-sm font-semibold">${total.toFixed(2)}</span>
          </div>

          {/* Reason Note (Required) */}
          <div className="space-y-2">
            <Label htmlFor="reason-note">
              Reason for Addition *
            </Label>
            <Textarea
              id="reason-note"
              value={reasonNote}
              onChange={(e) => {
                setReasonNote(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Explain why this service is needed (e.g., 'AI missed visible fringe damage on left edge')"
              rows={3}
            />
            <p className="text-[10px] text-muted-foreground">
              This note will be visible to the client and recorded for audit purposes.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="gap-1">
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
