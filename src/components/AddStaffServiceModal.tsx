// Staff/Admin Modal for Adding Services to AI-Generated Estimates
// Appends services with source='staff' tracking

import { useState, useMemo, useCallback } from 'react';
import { DEFAULT_VARIABLE_SERVICES } from '@/lib/defaultServices';
import { getServiceUnit } from '@/lib/serviceUnits';
import { calculateLinearFeet, calculateSquareFeet, formatDimension, type RugEdge, type RugDimensions } from '@/lib/rugDimensions';
import { useDimensionFormat } from '@/hooks/useCompany';
import RugEdgeDiagram from './RugEdgeDiagram';
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
  source: 'ai' | 'staff';
  addedBy?: string;
  addedByName?: string;
  addedAt?: string;
  reasonNote?: string;
  /** Selected edges for linear-ft services */
  selectedEdges?: RugEdge[];
  /** The unit type used for this service */
  unitType?: string;
}

interface AddStaffServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (service: StaffAddedService) => void;
  availableServices: { name: string; unitPrice: number }[];
  isAdmin: boolean;
  userId: string;
  userName?: string;
  /** Rug dimensions in mathematical feet (already parsed) */
  rugDimensions?: RugDimensions | null;
}

export default function AddStaffServiceModal({
  open,
  onOpenChange,
  onAdd,
  availableServices,
  isAdmin,
  userId,
  userName,
  rugDimensions,
}: AddStaffServiceModalProps) {
  const [selectedService, setSelectedService] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [reasonNote, setReasonNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedEdges, setSelectedEdges] = useState<RugEdge[]>([]);
  const dimensionFormat = useDimensionFormat();

  const variableServiceNames = new Set(DEFAULT_VARIABLE_SERVICES as readonly string[]);

  const serviceOptions = useMemo(() => {
    const uniqueNames = [...new Set(availableServices.map(s => s.name))];
    return uniqueNames.sort((a, b) => a.localeCompare(b));
  }, [availableServices]);

  const isVariablePrice = variableServiceNames.has(selectedService);
  const serviceUnit = selectedService ? getServiceUnit(selectedService) : null;
  const isEdgeSelectable = serviceUnit?.edgeSelectable ?? false;
  const hasDimensions = rugDimensions && rugDimensions.lengthFt > 0 && rugDimensions.widthFt > 0;

  // Auto-calculate quantity based on unit type + dimensions
  const autoQuantity = useMemo(() => {
    if (!hasDimensions || !serviceUnit) return null;

    if (serviceUnit.unit === 'sqft') {
      return calculateSquareFeet(rugDimensions!);
    }
    if (serviceUnit.unit === 'linear_ft' && selectedEdges.length > 0) {
      return calculateLinearFeet(rugDimensions!, selectedEdges);
    }
    return null;
  }, [serviceUnit, hasDimensions, rugDimensions, selectedEdges]);

  // When service selection changes, prefill price and reset edges
  const handleServiceChange = useCallback((serviceName: string) => {
    setSelectedService(serviceName);
    setSelectedEdges([]);
    const isVariable = variableServiceNames.has(serviceName);
    if (isVariable) {
      setUnitPrice(0);
    } else {
      const catalogService = availableServices.find(s => s.name === serviceName);
      if (catalogService) {
        setUnitPrice(catalogService.unitPrice);
      }
    }
    setError(null);
  }, [availableServices, variableServiceNames]);

  // Update quantity when auto-calculation changes
  const effectiveQuantity = autoQuantity !== null ? Math.round(autoQuantity * 100) / 100 : quantity;

  const handleToggleEdge = useCallback((edge: RugEdge) => {
    setSelectedEdges(prev =>
      prev.includes(edge) ? prev.filter(e => e !== edge) : [...prev, edge],
    );
  }, []);

  const handleSubmit = () => {
    if (!selectedService) {
      setError('Please select a service');
      return;
    }
    if (!reasonNote.trim()) {
      setError('A reason note is required to explain why this service was added');
      return;
    }
    if (effectiveQuantity < 0.01) {
      setError(isEdgeSelectable ? 'Please select at least one edge' : 'Quantity must be at least 1');
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
      quantity: effectiveQuantity,
      unitPrice,
      priority: 'medium',
      source: 'staff',
      addedBy: userId,
      addedByName: userName || undefined,
      addedAt: new Date().toISOString(),
      reasonNote: reasonNote.trim(),
      selectedEdges: isEdgeSelectable ? selectedEdges : undefined,
      unitType: serviceUnit?.unit,
    };

    onAdd(newService);
    
    // Reset form
    setSelectedService('');
    setQuantity(1);
    setUnitPrice(0);
    setReasonNote('');
    setSelectedEdges([]);
    setError(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedService('');
    setQuantity(1);
    setUnitPrice(0);
    setReasonNote('');
    setSelectedEdges([]);
    setError(null);
    onOpenChange(false);
  };

  const total = effectiveQuantity * unitPrice;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                {serviceOptions.map(name => {
                  const unit = getServiceUnit(name);
                  return (
                    <SelectItem key={name} value={name}>
                      <span className="flex items-center gap-2">
                        {name}
                        <Badge variant="outline" className="text-xs h-4 ml-1">
                          {unit.label}
                        </Badge>
                      </span>
                    </SelectItem>
                  );
                })}
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

          {/* Edge selector for linear-ft services */}
          {isEdgeSelectable && hasDimensions && (
            <div className="space-y-2">
              <Label>Select Edges *</Label>
              <RugEdgeDiagram
                dimensions={rugDimensions!}
                selectedEdges={selectedEdges}
                onToggleEdge={handleToggleEdge}
                dimensionFormat={dimensionFormat}
              />
              {selectedEdges.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Total linear feet: <span className="font-semibold">{effectiveQuantity.toFixed(2)} ft</span>
                </p>
              )}
            </div>
          )}

          {isEdgeSelectable && !hasDimensions && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Rug dimensions are not set. Please enter length and width on the rug to auto-calculate linear footage.
              </AlertDescription>
            </Alert>
          )}

          {/* Auto-calculated sqft notice */}
          {serviceUnit?.unit === 'sqft' && hasDimensions && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              Quantity auto-calculated: <span className="font-semibold">{effectiveQuantity.toFixed(2)} sq ft</span> ({formatDimension(rugDimensions!.lengthFt, dimensionFormat)} × {formatDimension(rugDimensions!.widthFt, dimensionFormat)})
            </div>
          )}

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity {serviceUnit ? `(${serviceUnit.label})` : ''}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={autoQuantity !== null ? effectiveQuantity.toFixed(2) : quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                disabled={autoQuantity !== null}
                className={autoQuantity !== null ? 'bg-muted' : ''}
              />
              {autoQuantity !== null && (
                <p className="text-xs text-muted-foreground">Auto-calculated from dimensions</p>
              )}
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
                <p className="text-xs text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">
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
