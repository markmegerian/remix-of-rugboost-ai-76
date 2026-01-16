import React, { useState } from 'react';
import { User, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface JobFormData {
  jobNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
}

interface JobFormProps {
  onSubmit: (data: JobFormData) => Promise<void>;
  isLoading: boolean;
  initialData?: Partial<JobFormData>;
}

const JobForm: React.FC<JobFormProps> = ({ onSubmit, isLoading, initialData }) => {
  const [formData, setFormData] = useState<JobFormData>({
    jobNumber: initialData?.jobNumber || '',
    clientName: initialData?.clientName || '',
    clientEmail: initialData?.clientEmail || '',
    clientPhone: initialData?.clientPhone || '',
    notes: initialData?.notes || '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.jobNumber || !formData.clientName) {
      toast.error('Please fill in all required fields');
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Job Information */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Job Information
          </h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobNumber">Job Number *</Label>
          <Input
            id="jobNumber"
            name="jobNumber"
            placeholder="JOB-2024-001"
            value={formData.jobNumber}
            onChange={handleInputChange}
            required
          />
        </div>
      </section>

      {/* Client Information */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <User className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Client Information
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              name="clientName"
              placeholder="John Smith"
              value={formData.clientName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email</Label>
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              placeholder="john@example.com"
              value={formData.clientEmail}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientPhone">Phone</Label>
            <Input
              id="clientPhone"
              name="clientPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.clientPhone}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="notes">Job Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Any notes about this job..."
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
          />
        </div>
      </section>

      {/* Submit Button */}
      <div className="pt-4">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating Job...' : 'Create Job'}
        </Button>
      </div>
    </form>
  );
};

export default JobForm;
