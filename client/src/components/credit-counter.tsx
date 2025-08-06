import { Button } from "@/components/ui/button";
import { Coins, Plus } from "lucide-react";

interface CreditCounterProps {
  credits: number;
  onClick: () => void;
}

export function CreditCounter({ credits, onClick }: CreditCounterProps) {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
        <Coins className="h-4 w-4 text-warning mr-2" />
        <span className="font-medium text-gray-900">{credits}</span>
        <span className="text-sm text-gray-600 ml-1">credits</span>
      </div>
      <Button
        onClick={onClick}
        size="sm"
        className="bg-accent hover:bg-green-600 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Buy Credits
      </Button>
    </div>
  );
}
