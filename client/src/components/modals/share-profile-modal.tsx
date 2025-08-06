import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Linkedin, Twitter, Mail, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareProfileModalProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
}

export function ShareProfileModal({ open, onClose, shareUrl }: ShareProfileModalProps) {
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "URL Copied!",
        description: "Profile URL has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy URL to clipboard.",
        variant: "destructive",
      });
    }
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const shareToTwitter = () => {
    const text = "Check out my professional profile!";
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    const subject = "My Professional Profile";
    const body = `Hi,\n\nI'd like to share my professional profile with you: ${shareUrl}\n\nBest regards`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
  };

  const generateQRCode = () => {
    toast({
      title: "QR Code",
      description: "QR code generation feature coming soon!",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label htmlFor="share-url" className="text-sm font-medium text-gray-700 mb-2 block">
              Public Profile URL
            </Label>
            <div className="flex">
              <Input
                id="share-url"
                value={shareUrl || "Profile not yet available for sharing"}
                readOnly
                className="flex-1 bg-gray-50"
              />
              <Button
                onClick={copyToClipboard}
                disabled={!shareUrl}
                size="sm"
                className="ml-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={shareToLinkedIn}
              disabled={!shareUrl}
              className="flex items-center justify-center gap-2"
            >
              <Linkedin className="h-4 w-4 text-blue-600" />
              LinkedIn
            </Button>
            
            <Button
              variant="outline"
              onClick={shareToTwitter}
              disabled={!shareUrl}
              className="flex items-center justify-center gap-2"
            >
              <Twitter className="h-4 w-4 text-blue-400" />
              Twitter
            </Button>
            
            <Button
              variant="outline"
              onClick={shareViaEmail}
              disabled={!shareUrl}
              className="flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4 text-gray-600" />
              Email
            </Button>
            
            <Button
              variant="outline"
              onClick={generateQRCode}
              disabled={!shareUrl}
              className="flex items-center justify-center gap-2"
            >
              <QrCode className="h-4 w-4 text-gray-600" />
              QR Code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
