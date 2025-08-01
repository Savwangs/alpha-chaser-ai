import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
}

const initialIndices: MarketIndex[] = [
  {
    name: "S&P 500",
    symbol: "SPX",
    value: 4547.25,
    change: 23.45,
    changePercent: 0.52
  },
  {
    name: "Dow Jones",
    symbol: "DJI",
    value: 35240.18,
    change: -156.78,
    changePercent: -0.44
  },
  {
    name: "NASDAQ",
    symbol: "NDX",
    value: 14823.45,
    change: 89.23,
    changePercent: 0.61
  },
  {
    name: "Russell 2000",
    symbol: "RUT",
    value: 1875.32,
    change: 12.45,
    changePercent: 0.67
  }
];

export const MarketOverview = () => {
  const [indices, setIndices] = useState<MarketIndex[]>(initialIndices);
  const [marketStatus, setMarketStatus] = useState<"open" | "closed" | "pre-market">("open");

  useEffect(() => {
    // Simulate real-time market updates
    const interval = setInterval(() => {
      setIndices(prevIndices =>
        prevIndices.map(index => {
          const priceChange = (Math.random() - 0.5) * 20;
          const newValue = Number((index.value + priceChange).toFixed(2));
          const newChange = Number((index.change + priceChange).toFixed(2));
          const newChangePercent = Number(((newChange / (newValue - newChange)) * 100).toFixed(2));
          
          return {
            ...index,
            value: newValue,
            change: newChange,
            changePercent: newChangePercent
          };
        })
      );
    }, 4000);

    // Set market status based on time
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 9 && hour < 16) {
      setMarketStatus("open");
    } else if (hour >= 4 && hour < 9) {
      setMarketStatus("pre-market");
    } else {
      setMarketStatus("closed");
    }

    return () => clearInterval(interval);
  }, []);

  const getMarketStatusBadge = () => {
    switch (marketStatus) {
      case "open":
        return <Badge className="bg-profit/10 text-profit border-profit/20">Market Open</Badge>;
      case "pre-market":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Pre-Market</Badge>;
      case "closed":
        return <Badge variant="secondary">Market Closed</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Market Overview</span>
          </CardTitle>
          {getMarketStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {indices.map((index) => (
          <div key={index.symbol} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="font-semibold text-sm">{index.name}</p>
              <p className="text-xs text-muted-foreground">{index.symbol}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm">{index.value.toLocaleString()}</p>
              <div className="flex items-center space-x-1">
                {index.change >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-profit" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-loss" />
                )}
                <span className={`text-xs ${index.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {/* Market Stats */}
        <div className="pt-4 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Volume (SPY)</span>
            <span className="font-medium">82.4M</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VIX</span>
            <span className="font-medium text-warning">16.8</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">10Y Treasury</span>
            <span className="font-medium">4.42%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};