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

  // Input validation functions
  const validateSymbol = (symbol: string): string => {
    const cleanSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,10}$/.test(cleanSymbol)) {
      throw new Error('Stock symbol must be 1-10 alphanumeric characters');
    }
    return cleanSymbol;
  };

  const validateQuantity = (quantity: string): number => {
    const num = parseFloat(quantity);
    if (isNaN(num) || num <= 0) {
      throw new Error('Quantity must be a positive number');
    }
    if (num > 1000000) {
      throw new Error('Quantity cannot exceed 1,000,000 shares');
    }
    return num;
  };

  const validatePrice = (price: string): number => {
    const num = parseFloat(price);
    if (isNaN(num) || num <= 0) {
      throw new Error('Price must be a positive number');
    }
    if (num > 100000) {
      throw new Error('Price cannot exceed $100,000 per share');
    }
    return num;
  };

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

    // Validate inputs
    try {
      const validatedSymbol = validateSymbol(symbol);
      const validatedQuantity = validateQuantity(quantity);
      const validatedPrice = validatePrice(averageCost);
      
      setLoading(true);

      // Get user's portfolio
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (portfolioError || !portfolio) {
        throw new Error('Portfolio not found. Please contact support.');
      }

      // Get current market price
      const { data: marketData } = await supabase
        .from('market_data')
        .select('price')
        .eq('symbol', validatedSymbol)
        .single();

      const currentPrice = marketData?.price || validatedPrice;
      const marketValue = validatedQuantity * currentPrice;

      // Add holding
      const { error: insertError } = await supabase
        .from('holdings')
        .insert({
          portfolio_id: portfolio.id,
          user_id: user.id,
          symbol: validatedSymbol,
          quantity: validatedQuantity,
          average_cost: validatedPrice,
          current_price: currentPrice
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('Failed to save stock to portfolio');
      }

      toast({
        title: "Stock added",
        description: `${validatedSymbol} has been added to your portfolio.`,
      });

      setSymbol("");
      setQuantity("");
      setAverageCost("");
      setOpen(false);
      onStockAdded();
    } catch (error: any) {
      console.error('Error adding stock:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add stock to portfolio. Please try again.",
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
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                // Only allow letters and numbers, max 10 characters
                if (/^[A-Z0-9]{0,10}$/.test(value)) {
                  setSymbol(value);
                }
              }}
              className="mt-1"
              maxLength={10}
            />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Number of shares"
              value={quantity}
              onChange={(e) => {
                const value = e.target.value;
                // Allow positive numbers only
                if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0)) {
                  setQuantity(value);
                }
              }}
              className="mt-1"
              min="0"
              max="1000000"
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
              onChange={(e) => {
                const value = e.target.value;
                // Allow positive numbers only with up to 2 decimal places
                if (value === '' || (/^\d*\.?\d{0,2}$/.test(value) && parseFloat(value) >= 0)) {
                  setAverageCost(value);
                }
              }}
              className="mt-1"
              min="0"
              max="100000"
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