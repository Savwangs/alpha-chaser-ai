import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioOverview } from "./PortfolioOverview";
import { StockChart } from "./StockChart";
import { AIInsights } from "./AIInsights";
import { TradingSignals } from "./TradingSignals";
import { WatchList } from "./WatchList";
import { MarketOverview } from "./MarketOverview";
import { Brain, TrendingUp, DollarSign, BarChart3, AlertTriangle, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useToast } from "@/hooks/use-toast";

export const TradingDashboard = () => {
  const [selectedStock, setSelectedStock] = useState("AAPL");
  const { user, signOut } = useAuth();
  const { portfolio, loading } = usePortfolio();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You've been signed out successfully.",
    });
  };

  // Real-time updates for market data
  useEffect(() => {
    const updateMarketData = async () => {
      try {
        const response = await fetch('https://duqviyslekqjldccbflu.supabase.co/functions/v1/market-data-updater', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          console.log('Market data updated');
        }
      } catch (error) {
        console.error('Error updating market data:', error);
      }
    };

    // Update every 30 seconds
    const interval = setInterval(updateMarketData, 30000);
    
    // Initial update
    updateMarketData();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AlphaChaser AI
            </h1>
          </div>
          <Badge variant="outline" className="bg-primary/10 border-primary/20">
            AI Trading Agent
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Portfolio Value</p>
            <p className="text-2xl font-bold">
              ${portfolio ? portfolio.total_value.toLocaleString() : '0'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Daily P&L</p>
            <p className={`text-xl font-semibold ${(portfolio?.daily_change || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
              {(portfolio?.daily_change || 0) >= 0 ? '+' : ''}${(portfolio?.daily_change || 0).toFixed(0)}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
            className="flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <MarketOverview />
          <WatchList onSelectStock={setSelectedStock} selectedStock={selectedStock} />
          <AIInsights />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold text-primary">74.2%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-profit/10 to-profit/5 border-profit/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-profit" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Profit</p>
                    <p className="text-2xl font-bold text-profit">$18,420</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-warning/10 to-warning/5 border-warning/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                    <p className="text-2xl font-bold text-warning">2.14</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-loss/10 to-loss/5 border-loss/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-loss" />
                  <div>
                    <p className="text-sm text-muted-foreground">Max Drawdown</p>
                    <p className="text-2xl font-bold text-loss">-5.8%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Trading Interface */}
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chart">Chart Analysis</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="signals">Trading Signals</TabsTrigger>
              <TabsTrigger value="backtest">Backtest</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="space-y-4">
              <StockChart symbol={selectedStock} />
            </TabsContent>

            <TabsContent value="portfolio" className="space-y-4">
              <PortfolioOverview />
            </TabsContent>

            <TabsContent value="signals" className="space-y-4">
              <TradingSignals />
            </TabsContent>

            <TabsContent value="backtest" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Strategy Backtesting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Backtesting interface coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};