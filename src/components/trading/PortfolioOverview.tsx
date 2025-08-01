import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Position {
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  value: number;
}

const positions: Position[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    shares: 50,
    avgPrice: 175.30,
    currentPrice: 182.45,
    change: 7.15,
    changePercent: 4.08,
    value: 9122.50
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    shares: 30,
    avgPrice: 338.20,
    currentPrice: 342.80,
    change: 4.60,
    changePercent: 1.36,
    value: 10284.00
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    shares: 25,
    avgPrice: 128.45,
    currentPrice: 131.20,
    change: 2.75,
    changePercent: 2.14,
    value: 3280.00
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    shares: 15,
    avgPrice: 248.90,
    currentPrice: 242.15,
    change: -6.75,
    changePercent: -2.71,
    value: 3632.25
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    shares: 40,
    avgPrice: 445.20,
    currentPrice: 468.35,
    change: 23.15,
    changePercent: 5.20,
    value: 18734.00
  }
];

export const PortfolioOverview = () => {
  const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
  const totalGainLoss = positions.reduce((sum, pos) => sum + (pos.change * pos.shares), 0);
  const totalGainLossPercent = (totalGainLoss / (totalValue - totalGainLoss)) * 100;

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Portfolio Summary
            <div className="flex items-center space-x-2">
              {totalGainLoss >= 0 ? (
                <TrendingUp className="h-5 w-5 text-profit" />
              ) : (
                <TrendingDown className="h-5 w-5 text-loss" />
              )}
              <span className={`text-lg font-semibold ${totalGainLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
                {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(2)} ({totalGainLossPercent.toFixed(2)}%)
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cash Available</p>
              <p className="text-2xl font-bold">$12,450</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {positions.map((position) => {
              const allocation = (position.value / totalValue) * 100;
              return (
                <div key={position.symbol} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-semibold">{position.symbol}</p>
                        <p className="text-sm text-muted-foreground">{position.name}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {position.shares} shares
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${position.value.toLocaleString()}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${position.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {position.change >= 0 ? '+' : ''}${position.change.toFixed(2)}
                        </span>
                        <span className={`text-sm ${position.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                          ({position.changePercent >= 0 ? '+' : ''}{position.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Allocation</span>
                      <span>{allocation.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={allocation} 
                      className="h-2"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};