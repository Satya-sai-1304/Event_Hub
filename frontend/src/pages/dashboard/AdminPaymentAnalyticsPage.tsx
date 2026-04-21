import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, TrendingUp, Users, Loader2, Calendar, ShoppingBag } from "lucide-react";
import api from "@/lib/api";

interface Transaction {
  id: string;
  bookingId: string;
  userId: string;
  merchantId: string;
  eventId: string;
  bookingType: 'ticketed' | 'full_service';
  totalAmount: number;
  adminCommission: number;
  merchantEarnings: number;
  paymentStatus: string;
  paymentId: string;
  createdAt: string;
}

interface Analytics {
  totalCommissionEarned: number;
  totalMerchantEarnings: number;
  totalTransactions: number;
  recentTransactions: Transaction[];
}

const AdminPaymentAnalyticsPage = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-transactions-analytics'],
    queryFn: async () => {
      const response = await api.get<Analytics>('/transactions/analytics');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Payment Analytics</h1>
        <p className="text-muted-foreground">
          Monitor your platform's financial performance and commission earnings.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Commission Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₹{(analytics?.totalCommissionEarned || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">5% of total platform volume</p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Total Merchant Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">₹{(analytics?.totalMerchantEarnings || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">95% of total platform volume</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{analytics?.totalTransactions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Processed successfully</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Commission (5%)</TableHead>
                  <TableHead>Merchant Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.recentTransactions && analytics.recentTransactions.length > 0 ? (
                  analytics.recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {(tx.bookingId || '').substring(0, 12)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {tx.bookingType === 'ticketed' ? (
                            <ShoppingBag className="h-3.5 w-3.5 text-blue-500" />
                          ) : (
                            <Calendar className="h-3.5 w-3.5 text-purple-500" />
                          )}
                          <span className="capitalize">{(tx.bookingType || '').replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹{(tx.totalAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-primary font-medium">
                        ₹{(tx.adminCommission || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        ₹{(tx.merchantEarnings || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                          {tx.paymentStatus || 'Paid'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentAnalyticsPage;
