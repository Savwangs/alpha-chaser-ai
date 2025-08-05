import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AddStockModalProps {
  onStockAdded: () => void;
}

export const AddStockModal = ({ onStockAdded }: AddStockModalProps) => {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [averageCost, setAverageCost] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const addStock = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add stocks to your portfolio.",
        variant: "destructive"
      });
      return;
    }

    if (!symbol || !quantity || !averageCost) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get user's portfolio
      const { data: portfolio } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Get current market price
      const { data: marketData } = await supabase
        .from('market_data')
        .select('price')
        .eq('symbol', symbol.toUpperCase())
        .single();

      const currentPrice = marketData?.price || parseFloat(averageCost);
      const quantityNum = parseFloat(quantity);
      const averageCostNum = parseFloat(averageCost);
      const marketValue = quantityNum * currentPrice;
      const unrealizedPnl = marketValue - (quantityNum * averageCostNum);
      const unrealizedPnlPercent = (unrealizedPnl / (quantityNum * averageCostNum)) * 100;

      // Add holding
      const { error } = await supabase
        .from('holdings')
        .insert({
          portfolio_id: portfolio.id,
          user_id: user.id,
          symbol: symbol.toUpperCase(),
          quantity: quantityNum,
          average_cost: averageCostNum,
          current_price: currentPrice,
          market_value: marketValue,
          unrealized_pnl: unrealizedPnl,
          unrealized_pnl_percent: unrealizedPnlPercent
        });

      if (error) throw error;

      toast({
        title: "Stock added",
        description: `${symbol.toUpperCase()} has been added to your portfolio.`,
      });

      setSymbol("");
      setQuantity("");
      setAverageCost("");
      setOpen(false);
      onStockAdded();
    } catch (error) {
      console.error('Error adding stock:', error);
      toast({
        title: "Error",
        description: "Failed to add stock to portfolio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Stock</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stock to Portfolio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="symbol">Stock Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Number of shares"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="averageCost">Average Cost per Share</Label>
            <Input
              id="averageCost"
              type="number"
              step="0.01"
              placeholder="Cost per share"
              value={averageCost}
              onChange={(e) => setAverageCost(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={addStock}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Adding..." : "Add Stock"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};