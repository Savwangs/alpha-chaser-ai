import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get market data for the symbol
    const { data: marketData } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', symbol)
      .single();

    if (!marketData) {
      throw new Error(`No market data found for ${symbol}`);
    }

    let signalType: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    let priceTarget: number;
    let stopLoss: number;
    let reasoning: string;

    if (!openAIApiKey) {
      console.log('Generating algorithmic trading signal...');
      
      // Generate signal using basic technical indicators
      const priceChange = marketData.change_percent || 0;
      const currentPrice = marketData.price;
      
      if (priceChange > 2) {
        signalType = 'BUY';
        confidence = 0.75;
        priceTarget = currentPrice * 1.1;
        stopLoss = currentPrice * 0.95;
        reasoning = `Strong upward momentum (+${priceChange.toFixed(2)}%) suggests continued bullish trend. High volume supports the move.`;
      } else if (priceChange < -3) {
        signalType = 'SELL';
        confidence = 0.70;
        priceTarget = currentPrice * 0.9;
        stopLoss = currentPrice * 1.05;
        reasoning = `Significant downward pressure (${priceChange.toFixed(2)}%) indicates potential further decline. Consider risk management.`;
      } else {
        signalType = 'HOLD';
        confidence = 0.60;
        priceTarget = currentPrice * 1.05;
        stopLoss = currentPrice * 0.95;
        reasoning = `Price action is consolidating. Wait for clearer directional signals before entering new positions.`;
      }
    } else {
      // Use AI to generate more sophisticated signals
      const prompt = `Analyze ${symbol} and generate a trading signal:

Current Price: $${marketData.price}
Change: ${marketData.change_percent}%
Volume: ${marketData.volume?.toLocaleString() || 'N/A'}
Market Cap: $${marketData.market_cap ? (marketData.market_cap / 1e9).toFixed(1) + 'B' : 'N/A'}

Based on this data, provide:
1. Signal type (BUY/SELL/HOLD)
2. Confidence level (0-1)
3. Price target
4. Stop loss level
5. Brief reasoning

Format as: SIGNAL_TYPE|CONFIDENCE|PRICE_TARGET|STOP_LOSS|REASONING`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'You are a professional trading algorithm. Provide precise, actionable trading signals based on market data analysis.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const aiResponse = await response.json();
        const aiContent = aiResponse.choices[0].message.content;
        
        try {
          const parts = aiContent.split('|');
          signalType = parts[0] as 'BUY' | 'SELL' | 'HOLD';
          confidence = parseFloat(parts[1]) || 0.5;
          priceTarget = parseFloat(parts[2]) || marketData.price * 1.05;
          stopLoss = parseFloat(parts[3]) || marketData.price * 0.95;
          reasoning = parts[4] || 'AI-generated trading signal based on market analysis.';
        } catch (parseError) {
          // Fallback to algorithmic signal if AI parsing fails
          signalType = 'HOLD';
          confidence = 0.5;
          priceTarget = marketData.price * 1.05;
          stopLoss = marketData.price * 0.95;
          reasoning = 'AI analysis available but parsing failed. Using conservative hold signal.';
        }
      } else {
        throw new Error('AI analysis failed');
      }
    }

    // Save the signal to database
    const { data: signal, error } = await supabase
      .from('trading_signals')
      .insert({
        user_id: userId,
        symbol,
        signal_type: signalType,
        confidence,
        price_target: priceTarget,
        stop_loss: stopLoss,
        reasoning,
        source: openAIApiKey ? 'AI_ANALYSIS' : 'ALGORITHMIC',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`Generated ${signalType} signal for ${symbol} with ${(confidence * 100).toFixed(0)}% confidence`);

    return new Response(JSON.stringify({ signal }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-trading-signals function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});