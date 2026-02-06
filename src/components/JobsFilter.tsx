import React from 'react';
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
];

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All Payments' },
  { value: 'pending', label: 'Pending Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

const DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
];

const JobsFilter = ({ 
  filters, 
  onFiltersChange, 
  isAdmin = false,
  clients = [],
  activeFilterCount = 0,
}: JobsFilterProps) => {
  const updateFilter = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      paymentStatus: 'all',
      dateRange: 'all',
      client: 'all',
    });
  };

  const hasActiveFilters = activeFilterCount > 0;

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
                onChange={(e) => updateFilter('search', e.target.value)}
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
              onValueChange={(value) => updateFilter('status', value)}
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
              onValueChange={(value) => updateFilter('paymentStatus', value)}
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
              onValueChange={(value) => updateFilter('dateRange', value)}
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
                onValueChange={(value) => updateFilter('client', value)}
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
                <Badge variant="secondary" className="gap-1">
                  Status: {STATUS_OPTIONS.find(o => o.value === filters.status)?.label}
                  <button onClick={() => updateFilter('status', 'all')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.paymentStatus !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Payment: {PAYMENT_OPTIONS.find(o => o.value === filters.paymentStatus)?.label}
                  <button onClick={() => updateFilter('paymentStatus', 'all')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.dateRange !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Date: {DATE_OPTIONS.find(o => o.value === filters.dateRange)?.label}
                  <button onClick={() => updateFilter('dateRange', 'all')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.client !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Client: {filters.client}
                  <button onClick={() => updateFilter('client', 'all')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobsFilter;
