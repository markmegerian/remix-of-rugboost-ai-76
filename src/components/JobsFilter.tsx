import React, { memo, useCallback } from 'react';
import { Search, Calendar, Filter, DollarSign, User, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

export interface JobFilters {
  search: string;
  status: string;
  paymentStatus: string;
  dateRange: string;
  client: string;
}

interface JobsFilterProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  isAdmin?: boolean;
  clients?: string[];
  activeFilterCount?: number;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'intake_scheduled', label: 'Intake Scheduled' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'ready_for_delivery', label: 'Ready for Delivery' },
  { value: 'delivered', label: 'Delivered' },
] as const;

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All Payments' },
  { value: 'pending', label: 'Pending Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
] as const;

const DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
] as const;

// Memoized filter badge component
const FilterBadge = memo(({ 
  label, 
  value, 
  onClear 
}: { 
  label: string; 
  value: string; 
  onClear: () => void;
}) => (
  <Badge variant="secondary" className="gap-1">
    {label}: {value}
    <button onClick={onClear} type="button" aria-label={`Clear ${label} filter`}>
      <X className="h-3 w-3" />
    </button>
  </Badge>
));
FilterBadge.displayName = 'FilterBadge';

const JobsFilter = memo(({ 
  filters, 
  onFiltersChange, 
  isAdmin = false,
  clients = [],
  activeFilterCount = 0,
}: JobsFilterProps) => {
  const updateFilter = useCallback(<K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange({
      search: '',
      status: 'all',
      paymentStatus: 'all',
      dateRange: 'all',
      client: 'all',
    });
  }, [onFiltersChange]);

  const hasActiveFilters = activeFilterCount > 0;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilter('search', e.target.value);
  }, [updateFilter]);

  const handleStatusChange = useCallback((value: string) => {
    updateFilter('status', value);
  }, [updateFilter]);

  const handlePaymentChange = useCallback((value: string) => {
    updateFilter('paymentStatus', value);
  }, [updateFilter]);

  const handleDateChange = useCallback((value: string) => {
    updateFilter('dateRange', value);
  }, [updateFilter]);

  const handleClientChange = useCallback((value: string) => {
    updateFilter('client', value);
  }, [updateFilter]);

  return (
    <Card className="shadow-card">
      <CardContent className="pt-4 pb-4">
        <div className="space-y-4">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client, job number, email..."
                value={filters.search}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="gap-2 whitespace-nowrap"
              >
                <X className="h-4 w-4" />
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Status Filter */}
            <Select 
              value={filters.status} 
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="gap-2">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Payment Status Filter */}
            <Select 
              value={filters.paymentStatus} 
              onValueChange={handlePaymentChange}
            >
              <SelectTrigger className="gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select 
              value={filters.dateRange} 
              onValueChange={handleDateChange}
            >
              <SelectTrigger className="gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                {DATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Client Filter - Admin only or when clients are provided */}
            {(isAdmin || clients.length > 0) && (
              <Select 
                value={filters.client} 
                onValueChange={handleClientChange}
              >
                <SelectTrigger className="gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filters.status !== 'all' && (
                <FilterBadge
                  label="Status"
                  value={STATUS_OPTIONS.find(o => o.value === filters.status)?.label || filters.status}
                  onClear={() => updateFilter('status', 'all')}
                />
              )}
              {filters.paymentStatus !== 'all' && (
                <FilterBadge
                  label="Payment"
                  value={PAYMENT_OPTIONS.find(o => o.value === filters.paymentStatus)?.label || filters.paymentStatus}
                  onClear={() => updateFilter('paymentStatus', 'all')}
                />
              )}
              {filters.dateRange !== 'all' && (
                <FilterBadge
                  label="Date"
                  value={DATE_OPTIONS.find(o => o.value === filters.dateRange)?.label || filters.dateRange}
                  onClear={() => updateFilter('dateRange', 'all')}
                />
              )}
              {filters.client !== 'all' && (
                <FilterBadge
                  label="Client"
                  value={filters.client}
                  onClear={() => updateFilter('client', 'all')}
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

JobsFilter.displayName = 'JobsFilter';

export default JobsFilter;
