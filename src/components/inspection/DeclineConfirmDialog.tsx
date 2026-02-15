import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { categorizeService, getServiceDeclineConsequence } from '@/lib/serviceCategories';

interface DeclineConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  serviceName: string;
}

export const DeclineConfirmDialog: React.FC<DeclineConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Decline Service
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You are declining: <strong>{serviceName}</strong>
            </p>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive">
                {getServiceDeclineConsequence(serviceName, categorizeService(serviceName))}
              </p>
            </div>
            <p className="text-sm">
              This service will not be performed. You may restore it before final approval.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Service</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Decline Service
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
