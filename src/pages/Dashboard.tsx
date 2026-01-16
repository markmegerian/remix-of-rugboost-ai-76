import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, Calendar, FileText, Eye, Download, Plus, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { generatePDF } from '@/lib/pdfGenerator';

interface Inspection {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  notes: string | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  created_at: string;
}

const RUG_TYPES = [
  'All Types',
  'Persian',
  'Turkish',
  'Afghan',
  'Chinese',
  'Indian',
  'Moroccan',
  'Kilim',
  'Navajo',
  'Other',
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [rugTypeFilter, setRugTypeFilter] = useState('All Types');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchInspections();
    }
  }, [user]);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      toast.error('Failed to load inspections');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleViewInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setIsViewDialogOpen(true);
  };

  const handleDownloadPDF = async (inspection: Inspection) => {
    try {
      await generatePDF(inspection);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const filteredInspections = inspections.filter((inspection) => {
    // Search filter
    const matchesSearch =
      inspection.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.rug_number.toLowerCase().includes(searchQuery.toLowerCase());

    // Rug type filter
    const matchesRugType =
      rugTypeFilter === 'All Types' || inspection.rug_type === rugTypeFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const inspectionDate = new Date(inspection.created_at);
      const now = new Date();
      if (dateFilter === 'today') {
        matchesDate = inspectionDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = inspectionDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        matchesDate = inspectionDate >= monthAgo;
      }
    }

    return matchesSearch && matchesRugType && matchesDate;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary to-terracotta-light p-2.5 shadow-soft">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                RugInspect
              </h1>
              <p className="text-xs text-muted-foreground">
                Inspection Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/')} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Inspection
            </Button>
            <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Filters */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by client or rug number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={rugTypeFilter} onValueChange={setRugTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rug Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RUG_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Inspections Table */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Inspection History
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredInspections.length} records)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredInspections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No inspections found</p>
                  {inspections.length === 0 && (
                    <Button onClick={() => navigate('/')} className="mt-4">
                      Create Your First Inspection
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Rug #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Dimensions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInspections.map((inspection) => (
                        <TableRow key={inspection.id}>
                          <TableCell className="font-medium">
                            {format(new Date(inspection.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{inspection.client_name}</TableCell>
                          <TableCell>{inspection.rug_number}</TableCell>
                          <TableCell>{inspection.rug_type}</TableCell>
                          <TableCell>
                            {inspection.length && inspection.width
                              ? `${inspection.length}' × ${inspection.width}'`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewInspection(inspection)}
                                className="gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPDF(inspection)}
                                className="gap-1"
                              >
                                <Download className="h-4 w-4" />
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* View Inspection Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Inspection Report
            </DialogTitle>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-6">
              {/* Rug Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedInspection.client_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rug Number</p>
                  <p className="font-medium">{selectedInspection.rug_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{selectedInspection.rug_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dimensions</p>
                  <p className="font-medium">
                    {selectedInspection.length && selectedInspection.width
                      ? `${selectedInspection.length}' × ${selectedInspection.width}'`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Photos */}
              {selectedInspection.photo_urls && selectedInspection.photo_urls.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedInspection.photo_urls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Rug photo ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Report */}
              {selectedInspection.analysis_report && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">AI Analysis</p>
                  <div className="bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {selectedInspection.analysis_report}
                    </pre>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleDownloadPDF(selectedInspection)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
