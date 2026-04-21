import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  HelpCircle, 
  MessageSquare, 
  Mail, 
  Phone, 
  Search, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Video,
  Users,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/Loader";

const SupportHelpPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
  });

  const { data: myComplaints, isLoading: complaintsLoading, refetch } = useQuery({
    queryKey: ['my-complaints', user?.id],
    queryFn: async () => {
      const response = await api.get(`/complaints/user/${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id
  });

  const complaintMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/complaints', data);
    },
    onSuccess: () => {
      toast.success("Support ticket created successfully! We'll get back to you within 24 hours.");
      setContactForm({ subject: '', message: '' });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit complaint");
    }
  });

  const faqs = [
    {
      question: "How do I book an event?",
      answer: "Browse events on the dashboard, click on an event you're interested in, then click 'Book Now'. Fill in your details and submit the booking request. You'll receive a confirmation once the merchant approves it."
    },
    {
      question: "How can I make a payment?",
      answer: "Once your booking is approved and billed by the merchant, you'll receive a payment notification. Go to 'Billing & Payments' page, view your bill, and scan the QR code to complete the payment using any UPI app."
    },
    {
      question: "Can I cancel my booking?",
      answer: "Yes, you can cancel bookings that are in 'pending' or 'accepted' status. Go to 'My Bookings', select the booking, and click 'Cancel'. Note that cancellation policies may vary by event."
    },
    {
      question: "How do I contact the event organizer?",
      answer: "You can contact organizers through the support ticket system. Go to the 'Help & Support' page and use the 'Contact Support' form. We'll forward your message to the relevant organizer."
    },
    {
      question: "What happens if my event is cancelled?",
      answer: "If an event is cancelled by the organizer, you'll receive a full refund automatically. You'll also be notified via email and in-app notifications."
    },
    {
      question: "How do I save events for later?",
      answer: "Click the heart icon on any event card to save it to your wishlist. You can access all saved events from the 'Saved Events' page in your dashboard."
    },
    {
      question: "Can I view photos from past events?",
      answer: "Yes! After events are completed, organizers often upload photos. You can view these in the 'Gallery' section of your dashboard."
    },
    {
      question: "How do I update my profile information?",
      answer: "Go to 'Profile & Settings' page and click 'Edit Profile'. You can update your name, phone number, address, and other details. Don't forget to save your changes!"
    }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please login to submit a complaint");
    
    complaintMutation.mutate({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      subject: contactForm.subject,
      message: contactForm.message,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          Help & Support
        </h1>
        <p className="text-muted-foreground mt-1">We're here to help you with any questions</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setOpenFaq(0)}>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-1">FAQs</h3>
            <p className="text-sm text-muted-foreground">Find quick answers</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.open('mailto:support@eventpro.com')}>
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-1">Email Us</h3>
            <p className="text-sm text-muted-foreground">support@eventpro.com</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => toast.info("Phone support coming soon!")}>
          <CardContent className="p-6 text-center">
            <Phone className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-1">Call Us</h3>
            <p className="text-sm text-muted-foreground">+91 9876543210</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search for Help
          </CardTitle>
          <CardDescription>Find answers to common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for topics like booking, payment, cancellation..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Common questions and answers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No results found for "{searchTerm}"</p>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  className="w-full p-4 text-left bg-muted/50 hover:bg-muted flex items-center justify-between gap-4"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-medium">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="p-4 bg-background">
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* My Support Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            My Support Tickets
          </CardTitle>
          <CardDescription>Track the status of your reported issues</CardDescription>
        </CardHeader>
        <CardContent>
          {complaintsLoading ? (
            <div className="flex justify-center py-8"><Loader /></div>
          ) : (myComplaints || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground italic">
              You haven't submitted any support tickets yet.
            </div>
          ) : (
            <div className="space-y-4">
              {(myComplaints || []).map((c: any) => (
                <div key={c.id || c._id} className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{c.subject}</h4>
                    <Badge variant={c.status === 'resolved' ? 'default' : 'outline'}>
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{c.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted on: {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Contact Support
          </CardTitle>
          <CardDescription>Get in touch with us for more help</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleContactSubmit}>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="What can we help you with?"
                required
                value={contactForm.subject}
                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Describe your issue in detail..."
                className="min-h-[150px]"
                required
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full gradient-primary" disabled={complaintMutation.isPending}>
              {complaintMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Message
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Additional Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Tutorials
            </CardTitle>
            <CardDescription>Learn how to use EventPro</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                How to book an event
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Making payments securely
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Managing your bookings
              </li>
            </ul>
            <Button variant="outline" size="sm" className="w-full mt-4" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Community Forum
            </CardTitle>
            <CardDescription>Connect with other users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Join our community to share experiences and tips with other EventPro users.
            </p>
            <Button variant="outline" size="sm" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Need Immediate Assistance?</h3>
            <p className="text-muted-foreground">Our support team is available Monday-Saturday, 9 AM - 6 PM IST</p>
            <div className="flex flex-wrap gap-4 justify-center pt-2">
              <Button variant="outline" onClick={() => window.open('mailto:support@eventpro.com')}>
                <Mail className="h-4 w-4 mr-2" />
                Email Support
              </Button>
              <Button variant="outline" onClick={() => toast.info("Live chat coming soon!")}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Live Chat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportHelpPage;
