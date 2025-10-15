import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  joinCode: string;
  joinUrl: string;
}

export const QRCodeModal = ({ open, onClose, joinCode, joinUrl }: QRCodeModalProps) => {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (open) {
      QRCode.toDataURL(joinUrl, { width: 300, margin: 2 }).then(setQrDataUrl);
    }
  }, [open, joinUrl]);

  const copyCode = () => {
    navigator.clipboard.writeText(joinCode);
    toast.success("Join code copied!");
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success("URL copied!");
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.download = `quiz-${joinCode}.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success("QR code downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Quiz</DialogTitle>
          <DialogDescription>
            Scan the QR code or share the join code
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {qrDataUrl && (
            <div className="flex justify-center">
              <img src={qrDataUrl} alt="QR Code" className="rounded-lg border" />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted px-4 py-2 rounded-md text-center font-mono text-2xl font-bold">
                {joinCode}
              </div>
              <Button onClick={copyCode} size="icon" variant="outline">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted px-4 py-2 rounded-md text-sm text-muted-foreground break-all">
                {joinUrl}
              </div>
              <Button onClick={copyUrl} size="icon" variant="outline">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button onClick={downloadQR} className="w-full" variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
