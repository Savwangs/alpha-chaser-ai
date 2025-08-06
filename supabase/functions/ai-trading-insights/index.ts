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

function validateTimeframe(timeframe: string): string {
  const validTimeframes = ['1D', '1W', '1M', '3M', '6M', '1Y'];
  const cleanTimeframe = timeframe?.trim().toUpperCase() || '1D';
  
  if (!validTimeframes.includes(cleanTimeframe)) {
    return '1D'; // Default to 1D if invalid
  }
  
  return cleanTimeframe;
}

// Error sanitization function
function sanitizeError(error: any): string {
  if (error.message) {
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

    const { symbol, timeframe = '1D' } = requestBody;

    // Validate inputs
    const validatedSymbol = validateStockSymbol(symbol);
    const validatedTimeframe = validateTimeframe(timeframe);

    if (!openAIApiKey) {
      console.log('AI insights disabled - no OpenAI API key configured');
      
      // Return mock insights when no API key is available
      const mockInsights = {
        insights: [
          {
            type: 'Technical Analysis',
            message: `${symbol} is showing strong momentum with bullish patterns forming on the ${timeframe} chart.`,
            confidence: 0.78,
            timestamp: new Date().toISOString()
          },
          {
            type: 'Market Sentiment', 
            message: 'Overall market sentiment remains positive with increasing institutional interest.',
            confidence: 0.65,
            timestamp: new Date().toISOString()
          },
          {
            type: 'Risk Assessment',
            message: 'Moderate risk levels detected. Consider position sizing carefully.',
            confidence: 0.72,
            timestamp: new Date().toISOString()
          }
        ]
      };

      return new Response(JSON.stringify(mockInsights), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // Prepare AI prompt with market data
    const prompt = `Analyze the following stock data for ${validatedSymbol} and provide trading insights:

Current Price: $${marketData.price}
Change: ${marketData.change_percent}%
Volume: ${marketData.volume?.toLocaleString() || 'N/A'}
Market Cap: $${marketData.market_cap ? (marketData.market_cap / 1e9).toFixed(1) + 'B' : 'N/A'}
Timeframe: ${validatedTimeframe}

Please provide 3 specific insights:
1. Technical Analysis insight
2. Market Sentiment insight  
3. Risk Assessment insight

Format your response as actionable insights for a trader. Be concise and specific.`;

    // Call OpenAI API
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
            content: 'You are an expert financial analyst providing concise, actionable trading insights. Focus on technical analysis, market sentiment, and risk assessment.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const aiInsights = aiResponse.choices[0].message.content;

    // Parse AI response into structured insights
    const insights = [
      {
        type: 'AI Analysis',
        message: aiInsights,
        confidence: 0.85,
        timestamp: new Date().toISOString()
      }
    ];

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-trading-insights function:', error);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.message.includes('Invalid') || error.message.includes('required')) {
      statusCode = 400;
    } else if (error.message.includes('not found') || error.message.includes('not available')) {
      statusCode = 404;
    }

    // Return fallback insights for non-critical errors
    if (statusCode === 500) {
      const fallbackInsights = {
        insights: [
          {
            type: 'System Notice',
            message: 'AI analysis temporarily unavailable. Please try again later.',
            confidence: 0.5,
            timestamp: new Date().toISOString()
          }
        ]
      };

      return new Response(JSON.stringify(fallbackInsights), {
        status: 200, // Return 200 with fallback data for server errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return error for client errors (400, 404)
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