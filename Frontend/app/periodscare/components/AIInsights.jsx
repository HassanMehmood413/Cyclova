'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  Activity, 
  Thermometer, 
  Brain, 
  Info
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function AIInsights() {
  const { data: session } = useSession();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!session?.user?.email) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/insights?email=${encodeURIComponent(session.user.email)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch insights');
        }
        
        const data = await response.json();
        setInsights(data.insights || []);
      } catch (err) {
        console.error('Error fetching insights:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [session?.user?.email]);

  const getIconByType = (type) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-amber-500" />;
      case 'cycle':
        return <Calendar className="h-6 w-6 text-blue-500" />;
      case 'period':
        return <Activity className="h-6 w-6 text-purple-500" />;
      case 'symptom':
        return <Thermometer className="h-6 w-6 text-orange-500" />;
      case 'prediction':
        return <Brain className="h-6 w-6 text-indigo-500" />;
      default:
        return <Info className="h-6 w-6 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Health Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Health Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Unable to load insights. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Health Insights</CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Start tracking your periods to receive personalized health insights.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getIconByType(insight.type)}
                </div>
                <div>
                  <h4 className="font-medium text-base">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 