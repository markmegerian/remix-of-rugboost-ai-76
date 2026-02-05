// Condition-Based Inspection Form
// Staff inputs structured condition data, system determines services

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Droplets, Bug, Scissors, Layers, Palette, 
  AlertTriangle, Home, PawPrint 
} from 'lucide-react';
import { 
  ConditionFlags, 
  RugMaterial, 
  ConditionSeverity,
  getDefaultConditionFlags,
  getDefaultMaterial 
} from '@/lib/serviceRulesEngine';

interface ConditionInspectionFormProps {
  material: RugMaterial;
  conditions: ConditionFlags;
  onMaterialChange: (material: RugMaterial) => void;
  onConditionsChange: (conditions: ConditionFlags) => void;
  disabled?: boolean;
}

const SEVERITY_OPTIONS: { value: ConditionSeverity; label: string; color: string }[] = [
  { value: 'none', label: 'None', color: 'bg-muted text-muted-foreground' },
  { value: 'minor', label: 'Minor', color: 'bg-secondary text-secondary-foreground' },
  { value: 'moderate', label: 'Moderate', color: 'bg-primary/20 text-primary' },
  { value: 'severe', label: 'Severe', color: 'bg-destructive/20 text-destructive' },
];

const SeveritySelect: React.FC<{
  value: ConditionSeverity;
  onChange: (value: ConditionSeverity) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <Select value={value} onValueChange={(v) => onChange(v as ConditionSeverity)} disabled={disabled}>
    <SelectTrigger className="w-[120px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {SEVERITY_OPTIONS.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>
          <Badge variant="outline" className={opt.color}>
            {opt.label}
          </Badge>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const ConditionRow: React.FC<{
  label: string;
  description?: string;
  value: ConditionSeverity;
  onChange: (value: ConditionSeverity) => void;
  disabled?: boolean;
}> = ({ label, description, value, onChange, disabled }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    <SeveritySelect value={value} onChange={onChange} disabled={disabled} />
  </div>
);

const BooleanRow: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ label, description, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

const ConditionInspectionForm: React.FC<ConditionInspectionFormProps> = ({
  material,
  conditions,
  onMaterialChange,
  onConditionsChange,
  disabled = false,
}) => {
  const updateCondition = <K extends keyof ConditionFlags>(
    key: K,
    value: ConditionFlags[K]
  ) => {
    onConditionsChange({ ...conditions, [key]: value });
  };

  const updateMaterial = <K extends keyof RugMaterial>(
    key: K,
    value: RugMaterial[K]
  ) => {
    onMaterialChange({ ...material, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Material & Construction */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Material & Construction</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Rug characteristics that affect cleaning and care requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Material Type</Label>
              <Select 
                value={material.type} 
                onValueChange={(v) => updateMaterial('type', v as RugMaterial['type'])}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wool">Wool</SelectItem>
                  <SelectItem value="silk">Silk</SelectItem>
                  <SelectItem value="cotton">Cotton</SelectItem>
                  <SelectItem value="synthetic">Synthetic</SelectItem>
                  <SelectItem value="mixed">Mixed/Blend</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Construction</Label>
              <Select 
                value={material.construction} 
                onValueChange={(v) => updateMaterial('construction', v as RugMaterial['construction'])}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select construction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hand-knotted">Hand-Knotted</SelectItem>
                  <SelectItem value="hand-tufted">Hand-Tufted</SelectItem>
                  <SelectItem value="machine-made">Machine-Made</SelectItem>
                  <SelectItem value="flat-weave">Flat-Weave</SelectItem>
                  <SelectItem value="hooked">Hooked</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Age Classification</Label>
              <Select 
                value={material.age} 
                onValueChange={(v) => updateMaterial('age', v as RugMaterial['age'])}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select age" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New (0-10 years)</SelectItem>
                  <SelectItem value="modern">Modern (10-40 years)</SelectItem>
                  <SelectItem value="semi-antique">Semi-Antique (40-80 years)</SelectItem>
                  <SelectItem value="antique">Antique (80+ years)</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Value Category</Label>
              <Select 
                value={material.value} 
                onValueChange={(v) => updateMaterial('value', v as RugMaterial['value'])}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="heirloom">Heirloom/Collectible</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cleaning Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Cleaning Conditions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          <ConditionRow
            label="General Soiling"
            description="Overall dirt and dust accumulation"
            value={conditions.generalSoiling}
            onChange={(v) => updateCondition('generalSoiling', v)}
            disabled={disabled}
          />
          <ConditionRow
            label="Staining"
            description="Visible stains from spills, food, etc."
            value={conditions.staining}
            onChange={(v) => updateCondition('staining', v)}
            disabled={disabled}
          />
          <ConditionRow
            label="Odor"
            description="Unpleasant smells (non-urine)"
            value={conditions.odor}
            onChange={(v) => updateCondition('odor', v)}
            disabled={disabled}
          />
          <ConditionRow
            label="Pet Urine"
            description="Urine contamination from pets"
            value={conditions.petUrine}
            onChange={(v) => updateCondition('petUrine', v)}
            disabled={disabled}
          />
          <ConditionRow
            label="Mold/Mildew"
            description="Active mold or mildew presence"
            value={conditions.mold}
            onChange={(v) => updateCondition('mold', v)}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Structural Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Structural Conditions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          <ConditionRow
            label="Fringe Condition"
            description="Wear, tangling, or damage to fringe"
            value={conditions.fringeCondition}
            onChange={(v) => updateCondition('fringeCondition', v)}
            disabled={disabled}
          />
          <ConditionRow
            label="Edge/Binding Condition"
            description="Edge wear, binding separation"
            value={conditions.edgeCondition}
            onChange={(v) => updateCondition('edgeCondition', v)}
            disabled={disabled}
          />
          <ConditionRow
            label="Foundation Condition"
            description="Warp/weft integrity issues"
            value={conditions.foundationCondition}
            onChange={(v) => updateCondition('foundationCondition', v)}
            disabled={disabled}
          />
          <ConditionRow
            label="Holes"
            description="Holes in the rug body"
            value={conditions.holes}
            onChange={(v) => updateCondition('holes', v)}
            disabled={disabled}
          />
          <ConditionRow
            label="Tears"
            description="Torn or ripped areas"
            value={conditions.tears}
            onChange={(v) => updateCondition('tears', v)}
            disabled={disabled}
          />
          <ConditionRow
            label="Shape Distortion"
            description="Curling, buckling, or warping"
            value={conditions.distortion}
            onChange={(v) => updateCondition('distortion', v)}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Color & Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Color & Appearance</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          <ConditionRow
            label="Color Run/Bleeding"
            description="Dye migration or instability"
            value={conditions.colorRun}
            onChange={(v) => updateCondition('colorRun', v)}
            disabled={disabled}
          />
          <ConditionRow
            label="Color Fading"
            description="Sun damage or color loss"
            value={conditions.colorFade}
            onChange={(v) => updateCondition('colorFade', v)}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Pest & Other Issues */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Pest & Other Issues</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          <ConditionRow
            label="Moth Damage"
            description="Damage from moth larvae"
            value={conditions.mothDamage}
            onChange={(v) => updateCondition('mothDamage', v)}
            disabled={disabled}
          />
          <BooleanRow
            label="Active Pest Infestation"
            description="Live insects observed"
            checked={conditions.pestInfestation}
            onChange={(v) => updateCondition('pestInfestation', v)}
            disabled={disabled}
          />
          <BooleanRow
            label="Dry Rot Present"
            description="Foundation deterioration"
            checked={conditions.dryRot}
            onChange={(v) => updateCondition('dryRot', v)}
            disabled={disabled}
          />
          <BooleanRow
            label="Previous Repairs"
            description="Evidence of prior restoration work"
            checked={conditions.previousRepairs}
            onChange={(v) => updateCondition('previousRepairs', v)}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Usage & Environment */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Usage & Environment</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Affects preventative service recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <BooleanRow
            label="High Traffic Use"
            description="Placed in busy area"
            checked={conditions.highTrafficUse}
            onChange={(v) => updateCondition('highTrafficUse', v)}
            disabled={disabled}
          />
          <BooleanRow
            label="Pets in Home"
            description="Pet presence for protection recommendations"
            checked={conditions.petsInHome}
            onChange={(v) => updateCondition('petsInHome', v)}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ConditionInspectionForm;