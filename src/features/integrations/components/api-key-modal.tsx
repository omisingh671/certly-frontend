import { AlertCircle, Copy } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  clientName: string;
  apiKey: string;
}

export const ApiKeyModal = ({ open, onClose, clientName, apiKey }: ApiKeyModalProps) => {
  const { pushToast } = useToast();

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    pushToast({ title: "Copied to clipboard", tone: "success" });
  };

  return (
    <Modal open={open} title="LMS API Key Generated" onClose={onClose} closeDisabled>
      <div className="space-y-5">
        <div className="rounded-3xl border border-warning-soft bg-warning-soft/10 p-5 text-warning-soft flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-text-primary">Important Security Warning</p>
            <p className="text-sm text-text-secondary mt-1">
              Please copy this API key now. For your security, this key is hashed on our servers and{" "}
              <strong>will never be shown again</strong>.
            </p>
          </div>
        </div>

        <Field label="Client Name">
          <Input value={clientName} disabled />
        </Field>

        <Field label="Secret API Key">
          <div className="relative">
            <Input value={apiKey} readOnly className="pr-12 font-mono" />
            <button
              type="button"
              onClick={() => copyToClipboard(apiKey)}
              className="absolute right-3 top-3 text-text-secondary hover:text-primary transition"
              title="Copy Key"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
        </Field>

        <div className="flex justify-end mt-6">
          <Button variant="primary" onClick={onClose}>
            I have copied the key
          </Button>
        </div>
      </div>
    </Modal>
  );
};
