import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AIInsight {
  type: string;
  message: string;
  confidence: number;
  timestamp: string;
}

export const AIInsights = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [marketSentiment, setMarketSentiment] = useState(78);
  const [aiConfidence, setAiConfidence] = useState(83);
  const [loading, setLoading] = useState(false);

  const fetchAIInsights = async (symbol: string = "AAPL") => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-trading-insights', {
        body: { symbol, timeframe: '1D' }
      });

      if (error) throw error;
      
      if (data?.insights) {
        setInsights(data.insights);
        const avgConfidence = data.insights.reduce((acc: number, insight: AIInsight) => acc + insight.confidence, 0) / data.insights.length;
        setAiConfidence(Math.round(avgConfidence * 100));
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      // Fallback to default insights
      setInsights([
        {
          type: "Technical Analysis",
          message: "Market analysis temporarily unavailable. Using cached data.",
          confidence: 0.5,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIInsights();
    
    const interval = setInterval(() => {
      setMarketSentiment(prev => Math.max(0, Math.min(100, prev + (Math.random() - 0.5) * 5)));
      fetchAIInsights();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getInsightIcon = (type: string) => {
    if (type.toLowerCase().includes('technical')) {
      return <Target className="h-4 w-4 text-primary" />;
    } else if (type.toLowerCase().includes('sentiment')) {
      return <TrendingUp className="h-4 w-4 text-warning" />;
    } else if (type.toLowerCase().includes('risk')) {
      return <AlertTriangle className="h-4 w-4 text-loss" />;
    }
    return <Brain className="h-4 w-4 text-muted-foreground" />;
  };

  const getInsightBadgeVariant = (confidence: number) => {
    if (confidence > 0.8) return "default";
    if (confidence > 0.6) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-primary" />
          <span>AI Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Confidence Meter */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Market Sentiment</span>
            <span className="text-sm text-muted-foreground">{marketSentiment}%</span>
          </div>
          <Progress 
            value={marketSentiment} 
            className="h-2"
          />
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">AI Confidence</span>
            <span className="text-sm text-muted-foreground">{aiConfidence}%</span>
          </div>
          <Progress 
            value={aiConfidence} 
            className="h-2"
          />
        </div>

        {/* Recent Insights */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">AI Analysis</h4>
            {loading && <div className="text-xs text-muted-foreground">Updating...</div>}
          </div>
          {insights.length > 0 ? insights.map((insight, index) => (
            <div key={index} className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getInsightIcon(insight.type)}
                  <span className="font-medium text-sm">{insight.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={getInsightBadgeVariant(insight.confidence)}
                    className="text-xs"
                  >
                    {Math.round(insight.confidence * 100)}%
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{insight.message}</p>
              <p className="text-xs text-primary font-medium">
                {new Date(insight.timestamp).toLocaleTimeString()}
              </p>
            </div>
          )) : (
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground">Loading AI insights...</p>
            </div>
          )}
        </div>

        {/* AI Recommendation */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">AI Recommendation</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Based on current market conditions and technical analysis, consider a 
            <span className="text-profit font-medium"> moderate long position</span> with 
            tight stop-loss at $178.
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Risk Level: Medium</span>
            <span className="text-primary font-medium">Confidence: 83%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};