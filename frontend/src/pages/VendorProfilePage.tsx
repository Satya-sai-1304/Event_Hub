import { useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Phone, Mail, MapPin, Grid, MessageCircle, ChevronRight, User, Image as ImageIcon } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import ContactVendorModal from "@/components/ContactVendorModal";

const VendorProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [contactOpen, setContactOpen] = useState(false);

  const { data: vendor, isLoading: isVendorLoading } = useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const res = await api.get(`/merchants/${id}`);
      return res.data;
    },
  });

  const { data: services, isLoading: isServicesLoading } = useQuery({
    queryKey: ["vendor-services", id],
    queryFn: async () => {
      const res = await api.get(`/services?merchantId=${id}`);
      return res.data;
    },
  });

  if (isVendorLoading || isServicesLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const carouselImages = Array.from(new Set([
    vendor?.profileImage,
    ...(vendor?.images || [])
  ])).filter(Boolean);

  const displayImages = carouselImages.length > 0 ? carouselImages : ["/placeholder.svg"];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-none shadow-lg">
            <CardContent className="p-0">
              <Carousel className="w-full h-[500px]">
                <CarouselContent>
                  {displayImages.map((img: string, index: number) => (
                    <CarouselItem key={index}>
                      <img src={img} alt={vendor?.name} className="w-full h-[500px] object-cover" />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </Carousel>
            </CardContent>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-4xl font-extrabold mb-2">{vendor?.name}</h1>
                  <div className="flex items-center text-muted-foreground gap-4">
                    <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-primary" /> Hyderabad</span>
                    <span className="flex items-center"><Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" /> {vendor?.rating || "New"} Rating</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="lg" className="rounded-full" onClick={() => setContactOpen(true)}>
                    <MessageCircle className="w-5 h-5 mr-2" /> Message
                  </Button>
                  <Button size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-all">
                    <Phone className="w-5 h-5 mr-2" /> Contact Now
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-3 flex items-center">
                    <User className="w-6 h-6 mr-2 text-primary" /> About Vendor
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {vendor?.description || "No description available for this vendor."}
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-3 flex items-center">
                    <Grid className="w-6 h-6 mr-2 text-primary" /> Services Offered
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {vendor?.services?.map((service: string, index: number) => (
                      <Badge key={index} variant="secondary" className="px-4 py-2 text-md rounded-full">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services List */}
          <div>
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <ImageIcon className="w-8 h-8 mr-3 text-primary" /> All Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services?.map((service: any) => (
                <Card key={service.id || service._id} className="overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="relative h-48 overflow-hidden">
                    <img src={service.image || "/placeholder.svg"} alt={service.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-white/90 text-primary hover:bg-white backdrop-blur-sm px-3 py-1 font-bold shadow-md">₹{service.price}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold line-clamp-1">{service.name}</h3>
                      <Badge variant="outline" className="text-xs">{service.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-6">{service.description}</p>
                    <Button 
                      className="w-full group-hover:bg-primary transition-colors rounded-xl font-bold py-6"
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast.error("Please login to book services");
                          navigate("/login", { state: { from: location.pathname + location.search } });
                          return;
                        }
                        navigate(`/book-service/${service.id || service._id}`);
                      }}
                    >
                      Book Now <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <Card className="sticky top-8 border-none shadow-xl bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="flex items-center p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-primary/10 p-3 rounded-xl mr-4">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-bold text-lg">{vendor?.contact || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-primary/10 p-3 rounded-xl mr-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-bold text-lg break-all">{vendor?.contact || "N/A"}</p>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-primary to-primary/80 text-white rounded-3xl space-y-4 shadow-xl">
                <h3 className="text-xl font-bold">Why book with them?</h3>
                <ul className="space-y-3 text-sm opacity-90">
                  <li className="flex items-center">✓ Verified Merchant</li>
                  <li className="flex items-center">✓ Professional Quality</li>
                  <li className="flex items-center">✓ On-time Guarantee</li>
                  <li className="flex items-center">✓ Best Price Assured</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <ContactVendorModal 
        vendor={vendor} 
        open={contactOpen} 
        onOpenChange={setContactOpen} 
      />
    </div>
  );
};

export default VendorProfilePage;
