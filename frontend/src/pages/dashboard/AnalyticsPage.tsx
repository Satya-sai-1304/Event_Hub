import { categories, type Event, type User, type Booking } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, CalendarDays, Ticket, IndianRupee, Users } from "lucide-react";
import Loader from "@/components/Loader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

const AnalyticsPage = () => {
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get<Event[]>('/events');
      return response.data;
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/users');
      return response.data;
    },
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await api.get<Booking[]>('/bookings');
      return response.data;
    },
  });

  const isLoading = eventsLoading || usersLoading || bookingsLoading;

  const totalRevenue = bookings?.filter((b) => b.status === "paid").reduce((s, b) => s + b.totalPrice + (b.additionalCost || 0), 0) || 0;

  // Build monthly bookings/revenue from real data
  const monthlyMap: Record<string, { bookings: number; revenue: number }> = {};
  (bookings || []).forEach((b) => {
    const month = new Date(b.createdAt).toLocaleString("en-US", { month: "short" });
    if (!monthlyMap[month]) monthlyMap[month] = { bookings: 0, revenue: 0 };
    monthlyMap[month].bookings += 1;
    if (b.status === "paid") monthlyMap[month].revenue += b.totalPrice + (b.additionalCost || 0);
  });
  const monthlyData = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }));

  const categoryData = categories.map((c) => ({
    name: c.name,
    count: events?.filter((e) => e.category === c.name).length || 0,
    color: c.color,
  })).filter((c) => c.count > 0);

  const roleData = [
    { name: "Customers", value: users?.filter((u) => u.role === "customer").length || 0, color: "hsl(262, 83%, 58%)" },
    { name: "Organizers", value: users?.filter((u) => u.role === "organizer").length || 0, color: "hsl(340, 82%, 52%)" },
    { name: "Admins", value: users?.filter((u) => u.role === "admin").length || 0, color: "hsl(38, 92%, 50%)" },
  ].filter(r => r.value > 0);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-display font-bold">
        <BarChart3 className="inline h-6 w-6 mr-2 text-primary" />
        Platform Analytics
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: events?.length || 0, icon: CalendarDays },
          { label: "Total Bookings", value: bookings?.length || 0, icon: Ticket },
          { label: "Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee },
          { label: "Users", value: users?.length || 0, icon: Users },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-muted text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Monthly Bookings</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 88%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="bookings" fill="hsl(262, 83%, 58%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-base">Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 88%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="hsl(340, 82%, 52%)" strokeWidth={3} dot={{ fill: "hsl(340, 82%, 52%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-base">Events by Category</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="count">
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-base">Users by Role</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {roleData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
