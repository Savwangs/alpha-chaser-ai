import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mock market data generator
const generateMockPrice = (basePrice: number): { price: number; change: number; changePercent: number } => {
  const volatility = 0.02; // 2% volatility
  const randomChange = (Math.random() - 0.5) * volatility;
  const newPrice = basePrice * (1 + randomChange);
  const change = newPrice - basePrice;
  const changePercent = (change / basePrice) * 100;
  
  return {
    price: Math.round(newPrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Updating market data...');

    // Get all symbols from market_data table
    const { data: existingData, error: fetchError } = await supabase
      .from('market_data')
      .select('symbol, price');

    if (fetchError) {
      throw fetchError;
    }

    if (!existingData || existingData.length === 0) {
      throw new Error('No market data found to update');
    }

    // Generate new prices for each symbol
    const updates = existingData.map(item => {
      const { price, change, changePercent } = generateMockPrice(item.price);
      
      return {
        symbol: item.symbol,
        price,
        change,
        change_percent: changePercent,
        volume: Math.floor(Math.random() * 100000000) + 10000000, // Random volume
        updated_at: new Date().toISOString()
      };
    });

    // Update each symbol
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('market_data')
        .update({
          price: update.price,
          change: update.change,
          change_percent: update.change_percent,
          volume: update.volume,
          updated_at: update.updated_at
        })
        .eq('symbol', update.symbol);

      if (updateError) {
        console.error(`Error updating ${update.symbol}:`, updateError);
      } else {
        console.log(`Updated ${update.symbol}: $${update.price} (${update.change_percent > 0 ? '+' : ''}${update.change_percent.toFixed(2)}%)`);
      }
    }

    // Also update portfolio values and holdings
    const { data: portfolios } = await supabase
      .from('portfolios')
      .select('id, user_id');

    if (portfolios) {
      for (const portfolio of portfolios) {
        // Get holdings for this portfolio
        const { data: holdings } = await supabase
          .from('holdings')
          .select('*')
          .eq('portfolio_id', portfolio.id);

        if (holdings && holdings.length > 0) {
          let totalValue = 0;
          
          for (const holding of holdings) {
            // Get updated price for this symbol
            const updatedSymbol = updates.find(u => u.symbol === holding.symbol);
            if (updatedSymbol) {
              const marketValue = holding.quantity * updatedSymbol.price;
              const unrealizedPnl = marketValue - (holding.quantity * holding.average_cost);
              const unrealizedPnlPercent = (unrealizedPnl / (holding.quantity * holding.average_cost)) * 100;
              
              // Update holding
              await supabase
                .from('holdings')
                .update({
                  current_price: updatedSymbol.price,
                  market_value: marketValue,
                  unrealized_pnl: unrealizedPnl,
                  unrealized_pnl_percent: unrealizedPnlPercent,
                  updated_at: new Date().toISOString()
                })
                .eq('id', holding.id);
              
              totalValue += marketValue;
            }
          }

          // Update portfolio total value
          const { data: oldPortfolio } = await supabase
            .from('portfolios')
            .select('total_value')
            .eq('id', portfolio.id)
            .single();

          const dailyChange = oldPortfolio ? totalValue - oldPortfolio.total_value : 0;
          const dailyChangePercent = oldPortfolio && oldPortfolio.total_value > 0 
            ? (dailyChange / oldPortfolio.total_value) * 100 
            : 0;

          await supabase
            .from('portfolios')
            .update({
              total_value: totalValue,
              daily_change: dailyChange,
              daily_change_percent: dailyChangePercent,
              updated_at: new Date().toISOString()
            })
            .eq('id', portfolio.id);
        }
      }
    }

    console.log(`Successfully updated ${updates.length} symbols`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updates.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in market-data-updater function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});