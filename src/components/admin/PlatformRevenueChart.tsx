import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Loader2 } from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { RevenueChart } from '@/components/analytics/RevenueChart';

interface PaymentData {
  id: string;
  amount: number;
  platform_fee: number | null;
  created_at: string;
  status: string;
}

type TimeRange = '7d' | '30d' | '90d' | '1y';
type Granularity = 'daily' | 'weekly' | 'monthly';

const PlatformRevenueChart = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [chartData, setChartData] = useState<{ date: string; revenue: number }[]>([]);
  const [feePercentage, setFeePercentage] = useState(10);

  useEffect(() => {
    fetchData();
  }, [timeRange, granularity]);

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case '90d':
        return { start: subDays(now, 90), end: now };
      case '1y':
        return { start: subMonths(now, 12), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      // Fetch fee percentage
      const { data: feeSettings } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'platform_fee_percentage')
        .single();
      
      const fee = feeSettings ? parseFloat(feeSettings.setting_value) : 10;
      setFeePercentage(fee);

      // Fetch completed payments in range
      const { data: payments, error } = await supabase
        .from('payments')
        .select('id, amount, platform_fee, created_at, status')
        .eq('status', 'completed')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Generate chart data based on granularity
      const data = generateChartData(payments || [], start, end, fee);
      setChartData(data);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (
    payments: PaymentData[],
    start: Date,
    end: Date,
    fee: number
  ): { date: string; revenue: number }[] => {
    let intervals: Date[];
    let formatStr: string;
    let getIntervalKey: (date: Date) => string;

    switch (granularity) {
      case 'daily':
        intervals = eachDayOfInterval({ start, end });
        formatStr = 'MMM d';
        getIntervalKey = (date: Date) => format(date, 'yyyy-MM-dd');
        break;
      case 'weekly':
        intervals = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
        formatStr = "'W'w MMM";
        getIntervalKey = (date: Date) => format(startOfWeek(date), 'yyyy-MM-dd');
        break;
      case 'monthly':
        intervals = eachMonthOfInterval({ start, end });
        formatStr = 'MMM yyyy';
        getIntervalKey = (date: Date) => format(startOfMonth(date), 'yyyy-MM');
        break;
      default:
        intervals = eachDayOfInterval({ start, end });
        formatStr = 'MMM d';
        getIntervalKey = (date: Date) => format(date, 'yyyy-MM-dd');
    }

    // Group payments by interval
    const revenueByInterval: Record<string, number> = {};
    intervals.forEach((interval) => {
      revenueByInterval[getIntervalKey(interval)] = 0;
    });

    payments.forEach((payment) => {
      const paymentDate = new Date(payment.created_at);
      const key = getIntervalKey(paymentDate);
      
      // Calculate platform fee for this payment
      const platformFee = payment.platform_fee !== null 
        ? Number(payment.platform_fee) 
        : Number(payment.amount) * (fee / 100);
      
      if (revenueByInterval[key] !== undefined) {
        revenueByInterval[key] += platformFee;
      }
    });

    // Convert to chart format
    return intervals.map((interval) => ({
      date: format(interval, formatStr),
      revenue: Math.round(revenueByInterval[getIntervalKey(interval)] * 100) / 100,
    }));
  };

  const totalFees = chartData.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Platform Fees Over Time
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Total platform fees ({feePercentage}%): <span className="font-semibold text-foreground">${totalFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <RevenueChart data={chartData} />
        )}
      </CardContent>
    </Card>
  );
};

export default PlatformRevenueChart;
