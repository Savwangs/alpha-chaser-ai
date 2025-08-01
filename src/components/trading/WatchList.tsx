import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Star, Plus, Search } from "lucide-react";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: string;
}

interface WatchListProps {
  onSelectStock: (symbol: string) => void;
  selectedStock: string;
}

const initialStocks: Stock[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 182.45,
    change: 2.34,
    changePercent: 1.30,
    volume: 45230000,
    marketCap: "2.8T"
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    price: 342.80,
    change: 4.60,
    changePercent: 1.36,
    volume: 23450000,
    marketCap: "2.5T"
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 131.20,
    change: -1.85,
    changePercent: -1.39,
    volume: 28340000,
    marketCap: "1.6T"
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 242.15,
    change: -6.75,
    changePercent: -2.71,
    volume: 67890000,
    marketCap: "772B"
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 468.35,
    change: 23.15,
    changePercent: 5.20,
    volume: 41230000,
    marketCap: "1.2T"
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 144.25,
    change: 0.85,
    changePercent: 0.59,
    volume: 34560000,
    marketCap: "1.5T"
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    price: 378.90,
    change: -2.45,
    changePercent: -0.64,
    volume: 19870000,
    marketCap: "964B"
  }
];

export const WatchList = ({ onSelectStock, selectedStock }: WatchListProps) => {
  const [stocks, setStocks] = useState<Stock[]>(initialStocks);
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState<string[]>(["AAPL", "NVDA", "TSLA"]);

  useEffect(() => {
    // Simulate real-time price updates
    const interval = setInterval(() => {
      setStocks(prevStocks => 
        prevStocks.map(stock => ({
          ...stock,
          price: Number((stock.price + (Math.random() - 0.5) * 2).toFixed(2)),
          change: Number((stock.change + (Math.random() - 0.5) * 0.5).toFixed(2))
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Watchlist</span>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stocks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
        {filteredStocks.map((stock) => (
          <div
            key={stock.symbol}
            className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 ${
              selectedStock === stock.symbol ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onClick={() => onSelectStock(stock.symbol)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(stock.symbol);
                  }}
                >
                  <Star 
                    className={`h-3 w-3 ${
                      favorites.includes(stock.symbol) 
                        ? 'fill-warning text-warning' 
                        : 'text-muted-foreground'
                    }`} 
                  />
                </Button>
                <div>
                  <p className="font-semibold text-sm">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {stock.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">${stock.price}</p>
                <div className="flex items-center space-x-1">
                  {stock.change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-profit" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-loss" />
                  )}
                  <span className={`text-xs ${stock.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Vol: {formatVolume(stock.volume)}</span>
              <span>Cap: {stock.marketCap}</span>
            </div>
            
            {favorites.includes(stock.symbol) && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                  Favorite
                </Badge>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};