import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Mail, Phone, MapPin, Camera, Lock, Bell, Shield, CreditCard, CheckCircle, Upload, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";

const MerchantProfile = () => {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '+91 9876543210',
    address: user?.address || 'Mumbai, Maharashtra, India',
    bio: user?.description || user?.bio || 'Event enthusiast who loves attending cultural programs and concerts.',
    services: user?.services || [],
    images: user?.images || [],
    location: user?.location || { lat: 17.3850, lng: 78.4867 },
    profileImage: (user as any)?.profileImage || ''
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.patch(`/users/${user?.id || user?._id}`, data);
      return res.data;
    },
    onSuccess: (updatedUser) => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      
      // Update local storage and context state
      const authUser = JSON.parse(sessionStorage.getItem('auth-user') || '{}');
      const newUserData = { ...authUser, ...updatedUser };
      sessionStorage.setItem('auth-user', JSON.stringify(newUserData));
      setUser(newUserData);
    },
    onError: () => {
      toast.error("Failed to update profile");
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'portfolio') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size should be less than 2MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'profile') {
          setFormData(prev => ({ ...prev, profileImage: base64String }));
        } else {
          setFormData(prev => ({ ...prev, images: [...prev.images, base64String] }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePortfolioImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          Merchant Profile
        </h1>
        <p className="text-muted-foreground mt-1">Manage your professional profile and portfolio</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-primary/10">
                <AvatarImage src={formData.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'profile')}
              />
              <Button 
                size="sm" 
                variant="secondary" 
                className="absolute bottom-0 right-0 h-8 w-8 p-0 rounded-full shadow-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
                <h2 className="text-2xl font-bold">{user?.name}</h2>
                <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
              </div>
              <p className="text-muted-foreground mb-2">{formData.email}</p>
              <div className="flex items-center gap-4 justify-center sm:justify-start text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Email Verified
                </span>
                <span>•</span>
                <span>Merchant Partner</span>
              </div>
            </div>

            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Merchant Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Merchant Information
            </CardTitle>
            <CardDescription>Your business details and portfolio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    className="pl-9" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    className="pl-9" 
                    type="email"
                    value={formData.email} 
                    disabled={true}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    className="pl-9" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="address" 
                    className="pl-9" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">About Business</Label>
              <textarea
                id="bio"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md bg-background resize-none"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="services">Services Offered (Comma separated)</Label>
                <Input 
                  id="services" 
                  value={formData.services.join(', ')}
                  onChange={(e) => setFormData({...formData, services: e.target.value.split(',').map(s => s.trim())})}
                  disabled={!isEditing}
                  placeholder="e.g. Decoration, Catering, Lighting"
                />
              </div>
              <div className="space-y-2">
                <Label>Portfolio Images</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={img} alt={`Portfolio ${index}`} className="w-full h-full object-cover" />
                      {isEditing && (
                        <button 
                          onClick={() => removePortfolioImage(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button 
                      onClick={() => portfolioInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add Photo</span>
                    </button>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={portfolioInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'portfolio')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Input id="currentPassword" type="password" placeholder="••••••••" disabled={!isEditing} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Input id="newPassword" type="password" placeholder="Min. 8 characters" disabled={!isEditing} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" type="password" placeholder="Re-enter password" disabled={!isEditing} />
              </div>
            </div>

            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => toast.info("Password change feature coming soon!")}
            >
              Update Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MerchantProfile;
