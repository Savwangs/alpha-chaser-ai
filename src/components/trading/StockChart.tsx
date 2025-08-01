import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface StockChartProps {
  symbol: string;
}

interface ChartData {
  time: string;
  price: number;
  volume: number;
}

// Mock data generator
const generateChartData = (): ChartData[] => {
  const data: ChartData[] = [];
  let basePrice = 182.45;
  
  for (let i = 0; i < 50; i++) {
    basePrice += (Math.random() - 0.5) * 4;
    data.push({
      time: `${9 + Math.floor(i / 6)}:${(i % 6) * 10}0`,
      price: Number(basePrice.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 500000
    });
  }
  
  return data;
};

export const StockChart = ({ symbol }: StockChartProps) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [timeframe, setTimeframe] = useState("1D");
  const [currentPrice, setCurrentPrice] = useState(182.45);
  const [priceChange, setPriceChange] = useState(2.34);
  const [priceChangePercent, setPriceChangePercent] = useState(1.30);

  useEffect(() => {
    setChartData(generateChartData());
    
    // Simulate real-time price updates
    const interval = setInterval(() => {
      setCurrentPrice(prev => {
        const newPrice = prev + (Math.random() - 0.5) * 2;
        return Number(newPrice.toFixed(2));
      });
      setPriceChange(prev => prev + (Math.random() - 0.5) * 0.5);
    }, 2000);

    return () => clearInterval(interval);
  }, [symbol]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{`Time: ${label}`}</p>
          <p className="text-primary">{`Price: $${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-[600px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CardTitle className="text-2xl font-bold">{symbol}</CardTitle>
            <div className="flex items-center space-x-2">
              {priceChange >= 0 ? (
                <TrendingUp className="h-5 w-5 text-profit" />
              ) : (
                <TrendingDown className="h-5 w-5 text-loss" />
              )}
              <span className="text-3xl font-bold">${currentPrice}</span>
              <Badge 
                variant={priceChange >= 0 ? "default" : "destructive"}
                className={priceChange >= 0 ? "bg-profit/10 text-profit border-profit/20" : "bg-loss/10 text-loss border-loss/20"}
              >
                {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {["1D", "5D", "1M", "3M", "1Y"].map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(tf)}
                className="h-8"
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Technical Indicators */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
            <BarChart3 className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">RSI</p>
              <p className="font-semibold">67.8</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">MACD</p>
              <p className="font-semibold text-warning">+1.24</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
            <BarChart3 className="h-4 w-4 text-profit" />
            <div>
              <p className="text-xs text-muted-foreground">BB %B</p>
              <p className="font-semibold text-profit">0.78</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};