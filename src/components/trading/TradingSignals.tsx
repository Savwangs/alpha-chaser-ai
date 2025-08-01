import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Clock, Target, DollarSign } from "lucide-react";

interface Signal {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  strength: "STRONG" | "MODERATE" | "WEAK";
  price: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;
  timeframe: string;
  strategy: string;
  timestamp: Date;
  status: "ACTIVE" | "TRIGGERED" | "EXPIRED";
}

const mockSignals: Signal[] = [
  {
    id: "1",
    symbol: "AAPL",
    type: "BUY",
    strength: "STRONG",
    price: 182.45,
    targetPrice: 195.00,
    stopLoss: 175.00,
    confidence: 87,
    timeframe: "1-3 days",
    strategy: "Momentum Breakout",
    timestamp: new Date(Date.now() - 300000),
    status: "ACTIVE"
  },
  {
    id: "2",
    symbol: "MSFT",
    type: "SELL",
    strength: "MODERATE",
    price: 342.80,
    targetPrice: 335.00,
    stopLoss: 348.00,
    confidence: 72,
    timeframe: "2-5 days",
    strategy: "Mean Reversion",
    timestamp: new Date(Date.now() - 900000),
    status: "ACTIVE"
  },
  {
    id: "3",
    symbol: "NVDA",
    type: "BUY",
    strength: "STRONG",
    price: 468.35,
    targetPrice: 485.00,
    stopLoss: 455.00,
    confidence: 91,
    timeframe: "1 week",
    strategy: "Earnings Momentum",
    timestamp: new Date(Date.now() - 1800000),
    status: "TRIGGERED"
  },
  {
    id: "4",
    symbol: "TSLA",
    type: "BUY",
    strength: "WEAK",
    price: 242.15,
    targetPrice: 255.00,
    stopLoss: 235.00,
    confidence: 64,
    timeframe: "3-7 days",
    strategy: "Support Bounce",
    timestamp: new Date(Date.now() - 3600000),
    status: "ACTIVE"
  }
];

export const TradingSignals = () => {
  const [signals, setSignals] = useState(mockSignals);
  const [selectedTab, setSelectedTab] = useState("active");

  useEffect(() => {
    // Simulate real-time signal updates
    const interval = setInterval(() => {
      setSignals(prev => prev.map(signal => ({
        ...signal,
        confidence: Math.max(50, Math.min(95, signal.confidence + (Math.random() - 0.5) * 5))
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getSignalsByStatus = (status: string) => {
    return signals.filter(signal => {
      if (status === "active") return signal.status === "ACTIVE";
      if (status === "triggered") return signal.status === "TRIGGERED";
      if (status === "expired") return signal.status === "EXPIRED";
      return true;
    });
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "STRONG": return "text-profit";
      case "MODERATE": return "text-warning";
      case "WEAK": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  const getSignalTypeIcon = (type: string) => {
    return type === "BUY" ? (
      <TrendingUp className="h-4 w-4 text-profit" />
    ) : (
      <TrendingDown className="h-4 w-4 text-loss" />
    );
  };

  const calculatePotentialReturn = (signal: Signal) => {
    if (signal.type === "BUY") {
      return ((signal.targetPrice - signal.price) / signal.price) * 100;
    } else {
      return ((signal.price - signal.targetPrice) / signal.price) * 100;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Signal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Active Signals</p>
                <p className="text-2xl font-bold">{signals.filter(s => s.status === "ACTIVE").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-profit" />
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-profit">74.2%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Return</p>
                <p className="text-2xl font-bold text-warning">+8.4%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">2.3d</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Signals */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active ({getSignalsByStatus("active").length})</TabsTrigger>
              <TabsTrigger value="triggered">Triggered ({getSignalsByStatus("triggered").length})</TabsTrigger>
              <TabsTrigger value="all">All Signals</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              <div className="space-y-4">
                {getSignalsByStatus("active").map((signal) => (
                  <div key={signal.id} className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getSignalTypeIcon(signal.type)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-lg">{signal.symbol}</span>
                            <Badge 
                              variant={signal.type === "BUY" ? "default" : "destructive"}
                              className={signal.type === "BUY" ? "bg-profit/10 text-profit border-profit/20" : "bg-loss/10 text-loss border-loss/20"}
                            >
                              {signal.type}
                            </Badge>
                            <Badge variant="outline" className={getStrengthColor(signal.strength)}>
                              {signal.strength}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{signal.strategy}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${signal.price}</p>
                        <p className="text-sm text-muted-foreground">{formatTimeAgo(signal.timestamp)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Target</p>
                        <p className="font-semibold text-profit">${signal.targetPrice}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stop Loss</p>
                        <p className="font-semibold text-loss">${signal.stopLoss}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Potential Return</p>
                        <p className="font-semibold text-profit">+{calculatePotentialReturn(signal).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="font-semibold">{signal.confidence}%</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Timeframe: {signal.timeframe}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        <Button size="sm">
                          Execute Trade
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="triggered" className="mt-6">
              <div className="space-y-4">
                {getSignalsByStatus("triggered").map((signal) => (
                  <div key={signal.id} className="p-4 border border-profit/20 bg-profit/5 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getSignalTypeIcon(signal.type)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-lg">{signal.symbol}</span>
                            <Badge className="bg-profit text-profit-foreground">TRIGGERED</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{signal.strategy}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-profit">+{calculatePotentialReturn(signal).toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">{formatTimeAgo(signal.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <div className="space-y-4">
                {signals.map((signal) => (
                  <div key={signal.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getSignalTypeIcon(signal.type)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">{signal.symbol}</span>
                            <Badge 
                              variant={signal.status === "ACTIVE" ? "default" : signal.status === "TRIGGERED" ? "default" : "secondary"}
                            >
                              {signal.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{signal.strategy}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${signal.price}</p>
                        <p className="text-sm text-muted-foreground">{formatTimeAgo(signal.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};