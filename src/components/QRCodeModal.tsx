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
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">Join Quiz</DialogTitle>
          <DialogDescription className="text-sm md:text-base">
            Scan the QR code or share the join code
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {qrDataUrl && (
            <div className="flex justify-center">
              <img src={qrDataUrl} alt="QR Code" className="rounded-lg border max-w-full h-auto" />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted px-3 md:px-4 py-3 rounded-md text-center font-mono text-xl md:text-2xl font-bold min-h-[48px] flex items-center justify-center">
                {joinCode}
              </div>
              <Button onClick={copyCode} size="icon" variant="outline" className="touch-manipulation min-h-[48px] min-w-[48px]">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted px-3 md:px-4 py-3 rounded-md text-xs md:text-sm text-muted-foreground break-all min-h-[48px] flex items-center">
                {joinUrl}
              </div>
              <Button onClick={copyUrl} size="icon" variant="outline" className="touch-manipulation min-h-[48px] min-w-[48px]">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button onClick={downloadQR} className="w-full min-h-[48px] touch-manipulation" variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
