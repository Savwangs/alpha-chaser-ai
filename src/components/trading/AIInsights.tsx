import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, AlertTriangle, Target } from "lucide-react";

interface AIInsight {
  type: "bullish" | "bearish" | "neutral";
  confidence: number;
  title: string;
  description: string;
  timeframe: string;
}

const insights: AIInsight[] = [
  {
    type: "bullish",
    confidence: 85,
    title: "Strong Momentum Pattern",
    description: "Technical indicators suggest continued upward momentum with RSI showing healthy levels.",
    timeframe: "1-3 days"
  },
  {
    type: "bearish",
    confidence: 72,
    title: "Resistance Level Approaching",
    description: "Price approaching key resistance at $185. High probability of short-term pullback.",
    timeframe: "24 hours"
  },
  {
    type: "bullish",
    confidence: 91,
    title: "Volume Confirmation",
    description: "Increasing volume confirms bullish sentiment. Institutional buying detected.",
    timeframe: "1 week"
  }
];

export const AIInsights = () => {
  const [marketSentiment, setMarketSentiment] = useState(78);
  const [aiConfidence, setAiConfidence] = useState(83);

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketSentiment(prev => Math.max(0, Math.min(100, prev + (Math.random() - 0.5) * 5)));
      setAiConfidence(prev => Math.max(0, Math.min(100, prev + (Math.random() - 0.5) * 3)));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "bullish":
        return <TrendingUp className="h-4 w-4 text-profit" />;
      case "bearish":
        return <AlertTriangle className="h-4 w-4 text-loss" />;
      default:
        return <Target className="h-4 w-4 text-warning" />;
    }
  };

  const getInsightBadgeVariant = (type: string) => {
    switch (type) {
      case "bullish":
        return "default";
      case "bearish":
        return "destructive";
      default:
        return "secondary";
    }
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
          <h4 className="font-semibold text-sm">Recent Analysis</h4>
          {insights.map((insight, index) => (
            <div key={index} className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getInsightIcon(insight.type)}
                  <span className="font-medium text-sm">{insight.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={getInsightBadgeVariant(insight.type)}
                    className="text-xs"
                  >
                    {insight.confidence}%
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{insight.description}</p>
              <p className="text-xs text-primary font-medium">{insight.timeframe}</p>
            </div>
          ))}
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