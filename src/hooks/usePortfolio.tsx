import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Portfolio {
  id: string;
  name: string;
  total_value: number;
  daily_change?: number;
  daily_change_percent?: number;
  cash_balance?: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Holding {
  id: string;
  symbol: string;
  company_name?: string;
  quantity: number;
  average_cost?: number;
  current_price?: number;
  market_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_percent?: number;
  portfolio_id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  company_name?: string;
  current_price?: number;
  change_percent?: number;
  notes?: string;
  added_at?: string;
  user_id: string;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  signal_type: string;
  confidence_score?: number;
  price_target?: number;
  stop_loss?: number;
  ai_reasoning?: string;
  created_at: string;
  expires_at?: string;
  user_id: string;
}

export const usePortfolio = () => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPortfolioData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch portfolio
      const { data: portfolioData } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (portfolioData) {
        setPortfolio(portfolioData as Portfolio);

        // Fetch holdings for this portfolio
        const { data: holdingsData } = await supabase
          .from('holdings')
          .select('*')
          .eq('portfolio_id', portfolioData.id);

        setHoldings((holdingsData || []) as Holding[]);
      }

      // Fetch watchlist
      const { data: watchlistData } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id);

      setWatchlist((watchlistData || []) as WatchlistItem[]);

      // Fetch trading signals
      const { data: signalsData } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setSignals((signalsData || []) as TradingSignal[]);

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPortfolioData();
    }
  }, [user]);

  const addToWatchlist = async (symbol: string, companyName: string) => {
    if (!user) return;

    try {
      // Get current price from market_data
      const { data: marketData } = await supabase
        .from('market_data')
        .select('price, change_percent')
        .eq('symbol', symbol)
        .single();

      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          symbol,
          company_name: companyName,
          current_price: marketData?.price || 0,
          change_percent: marketData?.change_percent || 0,
        });

      if (!error) {
        fetchPortfolioData();
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const removeFromWatchlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchPortfolioData();
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  return {
    portfolio,
    holdings,
    watchlist,
    signals,
    loading,
    addToWatchlist,
    removeFromWatchlist,
    refetch: fetchPortfolioData,
  };
};