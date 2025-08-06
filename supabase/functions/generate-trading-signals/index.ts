import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Input validation functions
function validateStockSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('Invalid symbol: Symbol is required and must be a string');
  }
  
  const cleanSymbol = symbol.trim().toUpperCase();
  
  if (!/^[A-Z0-9]{1,10}$/.test(cleanSymbol)) {
    throw new Error('Invalid symbol: Must be 1-10 alphanumeric characters');
  }
  
  return cleanSymbol;
}

function validateUserId(userId: string): string {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID: User ID is required');
  }
  
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  return userId;
}

// Error sanitization function
function sanitizeError(error: any): string {
  // Don't expose internal details in production
  if (error.message) {
    // Remove any potential sensitive information
    return error.message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
                        .replace(/\b\d{4,}\b/g, '[number]');
  }
  return 'An unexpected error occurred';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check request method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      throw new Error('Invalid JSON in request body');
    }

    const { symbol, userId } = requestBody;

    // Validate inputs
    const validatedUserId = validateUserId(userId);
    const validatedSymbol = validateStockSymbol(symbol);

    // Check rate limiting
    const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
      p_user_id: validatedUserId,
      p_function_name: 'generate-trading-signals',
      p_max_requests: 5, // 5 requests per hour
      p_window_minutes: 60
    });

    if (!rateLimitCheck) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 3600 // 1 hour in seconds
        }),
        {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '3600'
          },
        }
      );
    }

    // Get market data for the symbol
    const { data: marketData, error: marketDataError } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', validatedSymbol)
      .single();

    if (marketDataError || !marketData) {
      console.error('Market data fetch error:', marketDataError);
      throw new Error(`Market data not available for ${validatedSymbol}`);
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

    // Validate generated values
    confidence = Math.max(0, Math.min(1, confidence)); // Clamp between 0 and 1
    priceTarget = Math.max(0, priceTarget); // Ensure positive
    stopLoss = Math.max(0, stopLoss); // Ensure positive
    reasoning = reasoning.substring(0, 1000); // Limit length

    // Save the signal to database
    const { data: signal, error: signalError } = await supabase
      .from('trading_signals')
      .insert({
        user_id: validatedUserId,
        symbol: validatedSymbol,
        signal_type: signalType,
        confidence_score: confidence,
        price_target: priceTarget,
        stop_loss: stopLoss,
        ai_reasoning: reasoning,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select()
      .single();

    if (signalError) {
      console.error('Database insert error:', signalError);
      throw new Error('Failed to save trading signal');
    }

    console.log(`Generated ${signalType} signal for ${validatedSymbol} with ${(confidence * 100).toFixed(0)}% confidence`);

    return new Response(JSON.stringify({ signal }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-trading-signals function:', error);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.message.includes('Invalid') || error.message.includes('required')) {
      statusCode = 400;
    } else if (error.message.includes('not found') || error.message.includes('not available')) {
      statusCode = 404;
    }

    return new Response(
      JSON.stringify({ 
        error: sanitizeError(error),
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});