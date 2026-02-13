import React, { useState } from 'react';
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
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';

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

const FilterSelects: React.FC<{
  filters: JobFilters;
  updateFilter: <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => void;
  isAdmin: boolean;
  clients: string[];
}> = ({ filters, updateFilter, isAdmin, clients }) => (
  <>
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">Status</Label>
      <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
        <SelectTrigger className="gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">Payment</Label>
      <Select value={filters.paymentStatus} onValueChange={(v) => updateFilter('paymentStatus', v)}>
        <SelectTrigger className="gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Payment" />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">Date Range</Label>
      <Select value={filters.dateRange} onValueChange={(v) => updateFilter('dateRange', v)}>
        <SelectTrigger className="gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {(isAdmin || clients.length > 0) && (
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">Client</Label>
        <Select value={filters.client} onValueChange={(v) => updateFilter('client', v)}>
          <SelectTrigger className="gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
  </>
);

const ActiveFilterBadges: React.FC<{
  filters: JobFilters;
  updateFilter: <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => void;
}> = ({ filters, updateFilter }) => {
  const hasAny = filters.status !== 'all' || filters.paymentStatus !== 'all' || filters.dateRange !== 'all' || filters.client !== 'all';
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.status !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Status: {STATUS_OPTIONS.find(o => o.value === filters.status)?.label}
          <button onClick={() => updateFilter('status', 'all')}><X className="h-3 w-3" /></button>
        </Badge>
      )}
      {filters.paymentStatus !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Payment: {PAYMENT_OPTIONS.find(o => o.value === filters.paymentStatus)?.label}
          <button onClick={() => updateFilter('paymentStatus', 'all')}><X className="h-3 w-3" /></button>
        </Badge>
      )}
      {filters.dateRange !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Date: {DATE_OPTIONS.find(o => o.value === filters.dateRange)?.label}
          <button onClick={() => updateFilter('dateRange', 'all')}><X className="h-3 w-3" /></button>
        </Badge>
      )}
      {filters.client !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Client: {filters.client}
          <button onClick={() => updateFilter('client', 'all')}><X className="h-3 w-3" /></button>
        </Badge>
      )}
    </div>
  );
};

const JobsFilter = ({ 
  filters, 
  onFiltersChange, 
  isAdmin = false,
  clients = [],
  activeFilterCount = 0,
}: JobsFilterProps) => {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        <div className="space-y-3">
          {/* Search Row */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client, job number, email..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Mobile: Filter button */}
            {isMobile && (
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 relative min-h-[44px] min-w-[44px]"
                onClick={() => setDrawerOpen(true)}
              >
                <Filter className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            )}

            {/* Desktop: Clear button */}
            {!isMobile && hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2 whitespace-nowrap">
                <X className="h-4 w-4" />
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Desktop: Filter Row */}
          {!isMobile && (
            <div className="grid grid-cols-4 gap-3">
              <FilterSelects filters={filters} updateFilter={updateFilter} isAdmin={isAdmin} clients={clients} />
            </div>
          )}

          {/* Active Filter Badges (always visible) */}
          <ActiveFilterBadges filters={filters} updateFilter={updateFilter} />
        </div>
      </CardContent>

      {/* Mobile Filter Drawer */}
      {isMobile && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 space-y-4">
              <FilterSelects filters={filters} updateFilter={updateFilter} isAdmin={isAdmin} clients={clients} />
            </div>
            <DrawerFooter className="flex-row gap-2">
              {hasActiveFilters && (
                <Button variant="outline" className="flex-1" onClick={() => { clearFilters(); setDrawerOpen(false); }}>
                  Clear All
                </Button>
              )}
              <Button className="flex-1" onClick={() => setDrawerOpen(false)}>
                Done
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </Card>
  );
};

export default JobsFilter;
