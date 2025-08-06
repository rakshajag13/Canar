import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreditTopupModalProps {
  open: boolean;
  onClose: () => void;
  currentCredits: number;
}

export function CreditTopupModal({ open, onClose, currentCredits }: CreditTopupModalProps) {
  const { toast } = useToast();

  const topupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/credits/topup", {
        credits: 100,
        amount: 50000 // ₹500 in paise
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      toast({
        title: "Credits Purchased!",
        description: "100 credits have been added to your account.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy More Credits</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Credits:</span>
              <span className="font-semibold text-gray-900">{currentCredits}</span>
            </div>
          </div>

          <div className="bg-white border-2 border-primary rounded-lg p-4">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-900">Extra Credits Top-Up</h4>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">₹500</span>
              </div>
              <p className="text-gray-600 mt-1">100 additional credits</p>
              <ul className="mt-4 text-sm text-gray-600 space-y-1">
                <li>• 20 additional profile edits</li>
                <li>• Instant credit top-up</li>
                <li>• No expiration date</li>
              </ul>
            </div>
          </div>

          <Button
            onClick={() => topupMutation.mutate()}
            disabled={topupMutation.isPending}
            className="w-full"
          >
            {topupMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Purchase Credits - ₹500
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Credits will be added to your account instantly after payment
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
