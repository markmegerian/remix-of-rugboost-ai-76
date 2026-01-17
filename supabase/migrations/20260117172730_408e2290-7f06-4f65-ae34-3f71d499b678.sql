-- Create a table for service prices
CREATE TABLE public.service_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, service_name)
);

-- Enable Row Level Security
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own service prices" 
ON public.service_prices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own service prices" 
ON public.service_prices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service prices" 
ON public.service_prices 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service prices" 
ON public.service_prices 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_service_prices_updated_at
BEFORE UPDATE ON public.service_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();