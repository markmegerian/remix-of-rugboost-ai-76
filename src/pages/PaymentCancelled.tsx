import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import rugboostLogo from '@/assets/rugboost-logo.svg';

const PaymentCancelled = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnToken = searchParams.get('token');
  const jobId = searchParams.get('job');

  const handleReturnToPortal = () => {
    if (returnToken) {
      navigate(`/client/${returnToken}`);
    } else {
      navigate('/client/dashboard');
    }
  };

  const handleTryAgain = () => {
    // Go back to portal to retry payment
    handleReturnToPortal();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <img src={rugboostLogo} alt="RugBoost" className="h-16 w-16 mb-4" />
        </div>

        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
            <CardDescription>
              Your payment was not completed. No charges have been made to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                You can return to your estimate and try again whenever you're ready. 
                Your selected services have been saved.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleTryAgain}
                className="w-full gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={handleReturnToPortal}
                className="w-full gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Estimate
              </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-4">
              Having trouble? Contact us for assistance with your payment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentCancelled;
