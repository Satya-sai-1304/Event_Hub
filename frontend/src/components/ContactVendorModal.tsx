import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";
import { Mail, User, MessageSquare, Send, Loader2, X } from "lucide-react";

interface ContactVendorModalProps {
  vendor: {
    id: string;
    name: string;
    email?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactVendorModal = ({ vendor, open, onOpenChange }: ContactVendorModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    if (!formData.message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setLoading(true);
    try {
      // Create a notification for the merchant
      await api.post("/notifications/contact-merchant", {
        merchantId: vendor.id,
        customerId: user?.id,
        customerName: formData.name,
        customerEmail: formData.email,
        message: formData.message,
      });

      toast.success(`Message sent to ${vendor.name}!`);
      setFormData(prev => ({ ...prev, message: "" }));
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl overflow-hidden p-0">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-20 rounded-full bg-white/10 hover:bg-white/20 text-gray-500 transition-all"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl z-0" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full -ml-16 -mb-16 blur-3xl z-0" />
        
        <form onSubmit={handleSubmit} className="relative z-10">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-3xl font-display font-bold">
              Contact <span className="text-primary">{vendor?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Send a message to this vendor about your upcoming event.
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="contact-name" className="text-sm font-semibold text-gray-700">Your Name</Label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <Input
                  id="contact-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  className="pl-12 h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email" className="text-sm font-semibold text-gray-700">Your Email</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <Input
                  id="contact-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="pl-12 h-12 rounded-xl bg-gray-50 border-gray-100 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message" className="text-sm font-semibold text-gray-700">Message</Label>
              <div className="relative group">
                <MessageSquare className="absolute left-4 top-4 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <Textarea
                  id="contact-message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we help you plan your event?"
                  className="pl-12 min-h-[150px] rounded-xl bg-gray-50 border-gray-100 focus:bg-white transition-all resize-none pt-4"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 pt-6">
            <Button 
              type="submit" 
              className="w-full gradient-primary h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 border-none"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactVendorModal;
