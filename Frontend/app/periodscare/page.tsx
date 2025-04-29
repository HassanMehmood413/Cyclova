'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import '../styles/periodscare.css';
import { toast } from 'react-hot-toast';

interface PeriodHistory {
  start_date: string;
  end_date: string | null;
  cycle_length: number;
  period_length: number;
}

interface SymptomData {
  date: string;
  symptom_type: string;
  severity: number;
  notes: string;
}

interface InsightData {
  type: string;
  title: string;
  description: string;
  recommendation?: string;
}

export default function PeriodsCare() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [periodData, setPeriodData] = useState({
    start_date: '',
    end_date: '',
    cycle_length: 28,
    period_length: 5
  });
  const [symptomData, setSymptomData] = useState({
    date: '',
    symptom_type: '',
    severity: 1,
    notes: ''
  });
  const [appointmentData, setAppointmentData] = useState({
    appointment_date: '',
    appointment_time: '',
    doctor_name: '',
    doctor_email: '',
    reason: '',
    location: ''
  });
  
  // Data for insights
  const [periodHistory, setPeriodHistory] = useState<PeriodHistory[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomData[]>([]);
  const [insights, setInsights] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<InsightData[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [nextPeriodDate, setNextPeriodDate] = useState<string | null>(null);
  const [fertileWindow, setFertileWindow] = useState<{start: string, end: string} | null>(null);
  
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    // Fetch data from the database
    Promise.all([
      fetchPeriodHistory(),
      fetchSymptoms()
    ]).then(() => {
      setLoading(false);
      // Generate insights after data is loaded
      generateInsights();
    }).catch(err => {
      console.error('Error loading data:', err);
      setError('Failed to load period data');
      setLoading(false);
    });
  }, [token]);

  const fetchPeriodHistory = async () => {
    if (!token) {
      setError('You must be logged in to view your period history');
      return;
    }
    
    try {
      const response = await fetch('/periodcare/history/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch period history');
      }
      
      const data = await response.json();
      
      if (data.period_history && Array.isArray(data.period_history)) {
        // Sort by most recent first
        const sortedHistory = data.period_history.sort((a: any, b: any) => 
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        );
        
        setPeriodHistory(sortedHistory);
        
        // If we have period history, trigger insights generation
        if (sortedHistory.length > 0) {
          // Calculate cycle regularity for better insights
          const cycleLengths: number[] = [];
          for (let i = 1; i < sortedHistory.length; i++) {
            const currentStart = new Date(sortedHistory[i].start_date);
            const prevStart = new Date(sortedHistory[i-1].start_date);
            const daysDiff = Math.round(Math.abs((prevStart.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)));
            
            if (daysDiff > 0 && daysDiff < 60) { // Ignore outliers
              cycleLengths.push(daysDiff);
            }
          }
          
          // Wait for symptoms to be fetched before generating insights
          setTimeout(() => generateInsights(), 500);
        }
      } else {
        setPeriodHistory([]);
        setInsights("Start tracking your periods to get personalized insights about your cycle.");
      }
    } catch (err) {
      console.error('Error fetching period history:', err);
      setError('Failed to fetch your period history. Please try again later.');
      toast.error('Failed to load period data. Please try again later.');
    }
  };

  const fetchSymptoms = async () => {
    if (!token) {
      setError('You must be logged in to view your symptoms');
      return;
    }
    
    try {
      // First attempt to use the primary API endpoint
      let response;
      try {
        response = await fetch('/periodcare/symptoms/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.log('Primary API endpoint failed, trying fallback');
        // If primary endpoint fails, try the fallback endpoint
        response = await fetch('/api/symptoms?email=' + encodeURIComponent(token), {
          method: 'GET'
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch symptoms');
      }
      
      const data = await response.json();
      
      // Check which response format we got (primary or fallback API)
      const symptomsList = data.symptoms || data.symptoms?.symptoms || [];
      
      if (symptomsList && Array.isArray(symptomsList)) {
        // Sort by most recent first
        const sortedSymptoms = symptomsList.sort((a: any, b: any) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        // Group symptoms by type for analysis
        const symptomsByType: Record<string, any[]> = {};
        const symptomFrequency: Record<string, number> = {};
        
        sortedSymptoms.forEach((symptom: any) => {
          const symptomType = symptom.symptom_type || symptom.symptoms; // Handle different API response formats
          
          // Count frequency
          symptomFrequency[symptomType] = (symptomFrequency[symptomType] || 0) + 1;
          
          // Group by type
          if (!symptomsByType[symptomType]) {
            symptomsByType[symptomType] = [];
          }
          
          symptomsByType[symptomType].push({
            ...symptom,
            symptom_type: symptomType, // Ensure consistent property name
            date: new Date(symptom.date)
          });
        });
        
        // Store most frequent symptoms for insights
        const frequentSymptoms = Object.entries(symptomFrequency)
          .sort((a, b) => b[1] - a[1])
          .map(([type]) => type);
        
        // Enhanced data for better insights
        const enhancedSymptoms = {
          raw: sortedSymptoms,
          byType: symptomsByType,
          mostFrequent: frequentSymptoms,
          severityByType: {} as Record<string, number>
        };
        
        // Calculate average severity by symptom type
        Object.keys(symptomsByType).forEach(type => {
          const symptoms = symptomsByType[type];
          const totalSeverity = symptoms.reduce((sum, s) => sum + (s.severity || 0), 0);
          enhancedSymptoms.severityByType[type] = totalSeverity / symptoms.length;
        });
        
        setSymptoms(sortedSymptoms);
        
        // Store enhanced data for AI analysis
        localStorage.setItem('enhancedSymptomData', JSON.stringify({
          mostFrequent: frequentSymptoms.slice(0, 3),
          severityByType: enhancedSymptoms.severityByType
        }));
      } else {
        // If we didn't get a proper response but no error was thrown
        console.log('No symptoms found or invalid response format:', data);
        setSymptoms([]);
      }
    } catch (err) {
      console.error('Error fetching symptoms:', err);
      setError('Failed to fetch your symptoms. Please try again later.');
      toast.error('Failed to load symptom data. Please try again later.');
      
      // Set empty symptoms array to prevent undefined errors
      setSymptoms([]);
    }
  };

  const generateInsights = async () => {
    if (periodHistory.length === 0) return;
    
    setLoadingInsights(true);
    
    try {
      // Prepare enhanced data for better insights
      const enhancedData = {
        period_history: periodHistory,
        symptoms: symptoms,
        analysis: {
          cycleRegularity: calculateCycleRegularity(periodHistory),
          symptomPatterns: analyzeSymptomPatterns(symptoms, periodHistory),
          recentTrends: identifyRecentTrends(periodHistory, symptoms)
        }
      };
      
      const response = await fetch('/periodcare/insights/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(enhancedData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate insights');
      }
      
      const data = await response.json();
      setInsights(data.insights);
      
      // Process advanced insights if available
      if (data.advanced_insights) {
        setAiInsights(data.advanced_insights);
      } else {
        // Generate fallback insights if API doesn't provide them
        const fallbackInsights = generateFallbackInsights(periodHistory, symptoms);
        setAiInsights(fallbackInsights);
      }
      
      // Calculate next period date
      if (periodHistory.length > 0) {
        const lastPeriod = new Date(periodHistory[0].start_date);
        const avgCycleLength = Math.round(periodHistory.reduce((sum, period) => sum + period.cycle_length, 0) / periodHistory.length);
        const nextPeriod = new Date(lastPeriod);
        nextPeriod.setDate(lastPeriod.getDate() + avgCycleLength);
        setNextPeriodDate(nextPeriod.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }));
        
        // Calculate fertile window (typically 5 days before ovulation plus ovulation day)
        const ovulationDay = Math.round(avgCycleLength / 2) - 2; // Approximate
        const fertileStart = new Date(lastPeriod);
        fertileStart.setDate(lastPeriod.getDate() + ovulationDay - 5);
        
        const fertileEnd = new Date(lastPeriod);
        fertileEnd.setDate(lastPeriod.getDate() + ovulationDay + 1);
        
        setFertileWindow({
          start: fertileStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          end: fertileEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        });
      }
    } catch (err) {
      console.error('Error generating insights:', err);
      setInsights('Unable to generate insights at this time. Please try again later.');
      toast.error('Failed to generate insights. Please try again later.');
      
      // Generate basic fallback insights even if API fails
      if (periodHistory.length > 0) {
        const fallbackInsights = generateFallbackInsights(periodHistory, symptoms);
        setAiInsights(fallbackInsights);
      }
    } finally {
      setLoadingInsights(false);
    }
  };

  // Helper functions for enhanced insights
  const calculateCycleRegularity = (periods: any[]) => {
    if (periods.length < 3) return { regular: false, message: "Need more data" };
    
    const sortedPeriods = [...periods].sort((a: any, b: any) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    
    const cycleLengths: number[] = [];
    for (let i = 1; i < sortedPeriods.length; i++) {
      const currentStart = new Date(sortedPeriods[i].start_date);
      const prevStart = new Date(sortedPeriods[i-1].start_date);
      const daysDiff = Math.round(Math.abs((prevStart.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)));
      
      if (daysDiff > 0 && daysDiff < 60) { // Ignore outliers
        cycleLengths.push(daysDiff);
      }
    }
    
    if (cycleLengths.length < 2) return { regular: false, message: "Need more data" };
    
    const avg = cycleLengths.reduce((sum, len) => sum + len, 0) / cycleLengths.length;
    const variations = cycleLengths.map(len => Math.abs(len - avg));
    const avgVariation = variations.reduce((sum, v) => sum + v, 0) / variations.length;
    
    return {
      regular: avgVariation <= 5,
      avgCycle: Math.round(avg),
      avgVariation: Math.round(avgVariation),
      message: avgVariation <= 2 ? "Very regular" : avgVariation <= 5 ? "Somewhat regular" : "Irregular"
    };
  };

  const analyzeSymptomPatterns = (symptoms: any[], periods: any[]) => {
    if (symptoms.length === 0 || periods.length === 0) return {};
    
    // Group symptoms by type
    const symptomsByType: Record<string, any[]> = {};
    symptoms.forEach((symptom: any) => {
      if (!symptomsByType[symptom.symptom_type]) {
        symptomsByType[symptom.symptom_type] = [];
      }
      symptomsByType[symptom.symptom_type].push({
        ...symptom,
        date: new Date(symptom.date)
      });
    });
    
    // Analyze when symptoms occur in relation to period
    const patternsByType: Record<string, any> = {};
    
    Object.keys(symptomsByType).forEach(type => {
      const typeSymptoms = symptomsByType[type];
      let beforePeriod = 0;
      let duringPeriod = 0;
      let afterPeriod = 0;
      
      typeSymptoms.forEach(symptom => {
        let relation = "unknown";
        
        for (const period of periods) {
          const periodStart = new Date(period.start_date);
          const periodEnd = period.end_date ? new Date(period.end_date) : new Date(period.start_date);
          periodEnd.setDate(periodEnd.getDate() + (period.period_length || 5));
          
          const symptomDate = new Date(symptom.date);
          
          // Check if symptom is before period (within 5 days)
          const daysBefore = (periodStart.getTime() - symptomDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysBefore > 0 && daysBefore <= 5) {
            relation = "before";
            break;
          }
          
          // Check if symptom is during period
          if (symptomDate >= periodStart && symptomDate <= periodEnd) {
            relation = "during";
            break;
          }
          
          // Check if symptom is after period (within 5 days)
          const daysAfter = (symptomDate.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24);
          if (daysAfter > 0 && daysAfter <= 5) {
            relation = "after";
            break;
          }
        }
        
        if (relation === "before") beforePeriod++;
        else if (relation === "during") duringPeriod++;
        else if (relation === "after") afterPeriod++;
      });
      
      const total = beforePeriod + duringPeriod + afterPeriod;
      if (total > 0) {
        patternsByType[type] = {
          beforePeriod: Math.round((beforePeriod / total) * 100),
          duringPeriod: Math.round((duringPeriod / total) * 100),
          afterPeriod: Math.round((afterPeriod / total) * 100),
          mostCommon: Math.max(beforePeriod, duringPeriod, afterPeriod) === beforePeriod ? "before" :
                      Math.max(beforePeriod, duringPeriod, afterPeriod) === duringPeriod ? "during" : "after"
        };
      }
    });
    
    return patternsByType;
  };

  const identifyRecentTrends = (periods: any[], symptoms: any[]) => {
    // Only analyze if we have enough data
    if (periods.length < 3) return { enough: false };
    
    // Compare recent cycles with earlier ones
    const recentPeriods = periods.slice(0, Math.min(3, periods.length));
    const olderPeriods = periods.slice(Math.min(3, periods.length));
    
    const recentAvgCycle = recentPeriods.reduce((sum, p) => sum + p.cycle_length, 0) / recentPeriods.length;
    const olderAvgCycle = olderPeriods.length > 0 
      ? olderPeriods.reduce((sum, p) => sum + p.cycle_length, 0) / olderPeriods.length 
      : recentAvgCycle;
    
    const cycleTrend = Math.abs(recentAvgCycle - olderAvgCycle) < 2 
      ? "stable" 
      : recentAvgCycle > olderAvgCycle 
        ? "lengthening" 
        : "shortening";
    
    // Analyze if symptoms severity is changing
    let symptomTrend = "stable";
    if (symptoms.length >= 6) {
      const recentSymptoms = symptoms.slice(0, symptoms.length/2);
      const olderSymptoms = symptoms.slice(symptoms.length/2);
      
      const recentAvgSeverity = recentSymptoms.reduce((sum, s) => sum + s.severity, 0) / recentSymptoms.length;
      const olderAvgSeverity = olderSymptoms.reduce((sum, s) => sum + s.severity, 0) / olderSymptoms.length;
      
      symptomTrend = Math.abs(recentAvgSeverity - olderAvgSeverity) < 0.5 
        ? "stable" 
        : recentAvgSeverity > olderAvgSeverity 
          ? "increasing" 
          : "decreasing";
    }
    
    return {
      enough: true,
      cycleTrend,
      symptomTrend,
      cycleChange: Math.abs(recentAvgCycle - olderAvgCycle).toFixed(1)
    };
  };

  const calculateHormonalPhases = (periods: any[]) => {
    if (periods.length < 2) return { phases: [] };
    
    const sortedPeriods = [...periods].sort((a: any, b: any) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    
    const avgCycleLength = Math.round(periods.reduce((sum, p) => sum + p.cycle_length, 0) / periods.length);
    
    // Calculate average phase lengths based on a standard cycle
    const phaseInfo: Record<string, any> = {
      follicular: { 
        avgLength: Math.round(avgCycleLength * 0.45),
        description: "Estrogen rises, preparing for ovulation"
      },
      ovulation: { 
        avgLength: 1, 
        description: "Egg is released, peak fertility"
      },
      luteal: { 
        avgLength: Math.round(avgCycleLength * 0.55) - 1,
        description: "Progesterone rises, preparing for possible pregnancy"
      }
    };
    
    // Calculate current phase if possible
    let currentPhase = null;
    if (periods.length > 0) {
      const lastPeriod = new Date(periods[0].start_date);
      const today = new Date();
      const daysSincePeriod = Math.round((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSincePeriod < periods[0].period_length) {
        currentPhase = "menstrual";
      } else if (daysSincePeriod < phaseInfo.follicular.avgLength + periods[0].period_length) {
        currentPhase = "follicular";
      } else if (daysSincePeriod < phaseInfo.follicular.avgLength + phaseInfo.ovulation.avgLength + periods[0].period_length) {
        currentPhase = "ovulation";
      } else if (daysSincePeriod < avgCycleLength) {
        currentPhase = "luteal";
      }
    }
    
    return {
      phases: phaseInfo,
      currentPhase,
      dayOfCycle: periods.length > 0 ? 
        Math.round((new Date().getTime() - new Date(periods[0].start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1 : null
    };
  };

  const generateNutritionRecommendations = (symptoms: any[], periods: any[]) => {
    // Default recommendations
    const recommendations = {
      general: "Focus on a balanced diet with plenty of fruits, vegetables, and whole grains.",
      specific: [] as Array<{nutrient: string, foods: string, reason: string}>
    };
    
    // Check if we have enough data
    if (periods.length === 0) return recommendations;
    
    // Get hormonal phase information
    const hormonal = calculateHormonalPhases(periods);
    
    // Phase-specific recommendations
    if (hormonal.currentPhase) {
      switch (hormonal.currentPhase) {
        case "menstrual":
          recommendations.specific.push({
            nutrient: "Iron",
            foods: "Leafy greens, lentils, beans, red meat",
            reason: "Helps replenish iron lost during menstruation"
          });
          recommendations.specific.push({
            nutrient: "Magnesium",
            foods: "Dark chocolate, nuts, seeds, bananas",
            reason: "May help reduce menstrual cramps"
          });
          break;
          
        case "follicular":
          recommendations.specific.push({
            nutrient: "B vitamins",
            foods: "Eggs, whole grains, leafy greens",
            reason: "Supports energy levels and estrogen metabolism"
          });
          recommendations.specific.push({
            nutrient: "Zinc",
            foods: "Oysters, pumpkin seeds, chickpeas",
            reason: "Supports ovulation and fertility"
          });
          break;
          
        case "ovulation":
          recommendations.specific.push({
            nutrient: "Antioxidants",
            foods: "Berries, citrus fruits, bell peppers",
            reason: "Support healthy egg quality"
          });
          break;
          
        case "luteal":
          recommendations.specific.push({
            nutrient: "Complex carbs",
            foods: "Sweet potatoes, oats, quinoa",
            reason: "Helps stabilize blood sugar and mood"
          });
          recommendations.specific.push({
            nutrient: "Calcium",
            foods: "Yogurt, cheese, fortified plant milks",
            reason: "May help reduce PMS symptoms"
          });
          break;
      }
    }
    
    // Symptom-specific recommendations
    if (symptoms && symptoms.length > 0) {
      // Group symptoms by type
      const symptomsByType: Record<string, any[]> = {};
      symptoms.forEach((symptom: any) => {
        if (!symptomsByType[symptom.symptom_type]) {
          symptomsByType[symptom.symptom_type] = [];
        }
        symptomsByType[symptom.symptom_type].push(symptom);
      });
      
      // Add recommendations for frequent symptoms
      if (symptomsByType['cramps'] && symptomsByType['cramps'].length > 0) {
        recommendations.specific.push({
          nutrient: "Omega-3 fatty acids",
          foods: "Fatty fish, flaxseeds, walnuts",
          reason: "Has anti-inflammatory properties that may help reduce cramps"
        });
      }
      
      if (symptomsByType['bloating'] && symptomsByType['bloating'].length > 0) {
        recommendations.specific.push({
          nutrient: "Potassium",
          foods: "Bananas, avocados, sweet potatoes",
          reason: "Helps reduce water retention and bloating"
        });
      }
      
      if (symptomsByType['fatigue'] && symptomsByType['fatigue'].length > 0) {
        recommendations.specific.push({
          nutrient: "Iron & Vitamin C",
          foods: "Spinach with citrus fruits, bell peppers",
          reason: "Vitamin C helps with iron absorption to combat fatigue"
        });
      }
    }
    
    return recommendations;
  };

  const generateExerciseRecommendations = (symptoms: any[], periods: any[]) => {
    // Default recommendation
    const recommendations = {
      general: "Aim for 150 minutes of moderate activity per week, adjusting intensity based on your cycle phase.",
      specific: [] as Array<{type: string, examples: string, benefit: string}>
    };
    
    // Check if we have enough data
    if (periods.length === 0) return recommendations;
    
    // Get hormonal phase information
    const hormonal = calculateHormonalPhases(periods);
    
    // Phase-specific recommendations
    if (hormonal.currentPhase) {
      switch (hormonal.currentPhase) {
        case "menstrual":
          recommendations.specific.push({
            type: "Light cardio",
            examples: "Walking, light yoga, gentle swimming",
            benefit: "Helps with cramp relief and improves mood through endorphin release"
          });
          break;
          
        case "follicular":
          recommendations.specific.push({
            type: "High-intensity workouts",
            examples: "HIIT, strength training, running",
            benefit: "Energy levels are higher, making this a good time for challenging workouts"
          });
          break;
          
        case "ovulation":
          recommendations.specific.push({
            type: "Strength and power",
            examples: "Weight training, plyometrics, sprint intervals",
            benefit: "Estrogen peaks, potentially improving muscle gains and performance"
          });
          break;
          
        case "luteal":
          recommendations.specific.push({
            type: "Moderate intensity",
            examples: "Pilates, strength training, hiking",
            benefit: "Helps manage PMS symptoms while working with changing energy levels"
          });
          break;
      }
    }
    
    // Symptom-specific recommendations
    if (symptoms && symptoms.length > 0) {
      // Group symptoms by type
      const symptomsByType: Record<string, any[]> = {};
      symptoms.forEach((symptom: any) => {
        if (!symptomsByType[symptom.symptom_type]) {
          symptomsByType[symptom.symptom_type] = [];
        }
        symptomsByType[symptom.symptom_type].push(symptom);
      });
      
      // Add recommendations for specific symptoms
      if (symptomsByType['cramps'] && symptomsByType['cramps'].length > 0) {
        recommendations.specific.push({
          type: "Gentle stretching",
          examples: "Cat-cow pose, child's pose, hip openers",
          benefit: "Helps relieve tension in the lower abdomen and back"
        });
      }
      
      if (symptomsByType['mood_swings'] && symptomsByType['mood_swings'].length > 0) {
        recommendations.specific.push({
          type: "Mindful movement",
          examples: "Yoga, tai chi, outdoor walking",
          benefit: "Combines physical activity with stress reduction"
        });
      }
    }
    
    return recommendations;
  };

  const analyzeMoodPatterns = (symptoms: any[], periods: any[]) => {
    if (!symptoms || symptoms.length === 0 || !periods || periods.length === 0) {
      return { patterns: [] };
    }
    
    // Look for symptoms related to mood
    const moodRelated = ['mood_swings', 'anxiety', 'depression', 'irritability'];
    const moodSymptoms = symptoms.filter((s: any) => 
      moodRelated.includes(s.symptom_type) || 
      (s.notes && moodRelated.some(term => s.notes.toLowerCase().includes(term)))
    );
    
    if (moodSymptoms.length === 0) return { patterns: [] };
    
    // Analyze when mood symptoms occur in the cycle
    const patterns: Array<{
      type: string;
      strength: string;
      description: string;
      recommendation: string;
    }> = [];
    
    let preMenstrualMoodCount = 0;
    let duringPeriodMoodCount = 0;
    let midCycleMoodCount = 0;
    
    moodSymptoms.forEach((symptom: any) => {
      const symptomDate = new Date(symptom.date);
      
      // Check relation to periods
      for (const period of periods) {
        const periodStart = new Date(period.start_date);
        const periodEnd = period.end_date ? new Date(period.end_date) : 
          new Date(new Date(period.start_date).setDate(periodStart.getDate() + (period.period_length || 5)));
        
        // Calculate days before period
        const daysBefore = (periodStart.getTime() - symptomDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Check if symptom is pre-menstrual (1-7 days before period)
        if (daysBefore > 0 && daysBefore <= 7) {
          preMenstrualMoodCount++;
          break;
        }
        
        // Check if symptom is during period
        if (symptomDate >= periodStart && symptomDate <= periodEnd) {
          duringPeriodMoodCount++;
          break;
        }
        
        // Check if symptom is mid-cycle (around ovulation)
        const midCycleStart = new Date(periodStart);
        midCycleStart.setDate(periodStart.getDate() + Math.floor(period.cycle_length / 2) - 2);
        const midCycleEnd = new Date(midCycleStart);
        midCycleEnd.setDate(midCycleStart.getDate() + 4); // ~4 day window
        
        if (symptomDate >= midCycleStart && symptomDate <= midCycleEnd) {
          midCycleMoodCount++;
          break;
        }
      }
    });
    
    const totalMoodObservations = preMenstrualMoodCount + duringPeriodMoodCount + midCycleMoodCount;
    
    if (totalMoodObservations > 0) {
      // Identify dominant pattern
      const preMenstrualPercentage = (preMenstrualMoodCount / totalMoodObservations) * 100;
      const duringPeriodPercentage = (duringPeriodMoodCount / totalMoodObservations) * 100;
      const midCyclePercentage = (midCycleMoodCount / totalMoodObservations) * 100;
      
      if (preMenstrualPercentage > 40) {
        patterns.push({
          type: "premenstrual",
          strength: preMenstrualPercentage > 70 ? "strong" : "moderate",
          description: `Your mood changes appear to occur most frequently in the week before your period (${Math.round(preMenstrualPercentage)}% of the time).`,
          recommendation: "This is consistent with PMS. Consider tracking specific triggers and talking to your healthcare provider if symptoms are severe."
        });
      }
      
      if (duringPeriodPercentage > 40) {
        patterns.push({
          type: "menstrual",
          strength: duringPeriodPercentage > 70 ? "strong" : "moderate",
          description: `Your mood changes often coincide with your menstruation (${Math.round(duringPeriodPercentage)}% of the time).`,
          recommendation: "This is common and may be related to hormonal fluctuations. Self-care during this time may be particularly important."
        });
      }
      
      if (midCyclePercentage > 30) {
        patterns.push({
          type: "ovulatory",
          strength: midCyclePercentage > 60 ? "strong" : "moderate",
          description: `You experience mood changes around mid-cycle (${Math.round(midCyclePercentage)}% of the time).`,
          recommendation: "Some people experience mood changes during ovulation. Being aware of this pattern can help you prepare."
        });
      }
    }
    
    return { 
      patterns,
      totalObservations: totalMoodObservations
    };
  };

  const generateFallbackInsights = (periods: any[], symptoms: any[]) => {
    const insights = [];
    
    // Only generate insights if we have enough data
    if (periods.length < 2) {
      insights.push({
        type: 'info',
        title: 'Keep Tracking',
        description: 'Track at least 2 periods to get personalized cycle insights.'
      });
      return insights;
    }
    
    // Calculate cycle regularity
    const regularity = calculateCycleRegularity(periods);
    insights.push({
      type: 'cycle',
      title: 'Cycle Pattern',
      description: `Your cycles appear to be ${regularity.message} with an average length of ${regularity.avgCycle} days.`
    });
    
    // Analyze symptoms if available
    if (symptoms.length > 0) {
      const symptomPatterns = analyzeSymptomPatterns(symptoms, periods);
      const mostFrequentSymptom = Object.keys(symptomPatterns).reduce((a, b) => 
        (symptomPatterns[a]?.beforePeriod || 0) > (symptomPatterns[b]?.beforePeriod || 0) ? a : b, ''
      );
      
      if (mostFrequentSymptom && symptomPatterns[mostFrequentSymptom]) {
        const pattern = symptomPatterns[mostFrequentSymptom];
        insights.push({
          type: 'symptom',
          title: 'Symptom Pattern Detected',
          description: `${mostFrequentSymptom.replace('_', ' ')} most frequently occurs ${pattern.mostCommon} your period, appearing ${pattern[pattern.mostCommon + 'Period']}% of the time in this pattern.`,
          recommendation: pattern.mostCommon === 'before' 
            ? 'This symptom could serve as a natural warning sign that your period is approaching.' 
            : 'Tracking this symptom may help you better predict and prepare for your cycle phases.'
        });
      }
    }
    
    // Add trend insights if available
    const trends = identifyRecentTrends(periods, symptoms);
    if (trends.enough) {
      insights.push({
        type: 'trend',
        title: 'Recent Cycle Trends',
        description: `Your cycle length appears to be ${trends.cycleTrend} ${trends.cycleTrend !== 'stable' ? `by approximately ${trends.cycleChange} days` : ''}.`,
        recommendation: trends.cycleTrend !== 'stable' 
          ? 'Continue tracking to see if this trend persists. Significant changes in cycle length can sometimes be related to stress, lifestyle changes, or other factors.' 
          : 'Your cycle appears to be quite consistent, which is generally a good sign of reproductive health.'
      });
    }
    
    // Add hormonal phase information
    const hormonal = calculateHormonalPhases(periods);
    if (hormonal.currentPhase) {
      insights.push({
        type: 'hormonal',
        title: 'Current Hormonal Phase',
        description: `You're currently in your ${hormonal.currentPhase} phase (day ${hormonal.dayOfCycle} of your cycle).`,
        recommendation: hormonal.phases[hormonal.currentPhase]?.description || 
          "Understanding your hormonal phases can help you work with your body's natural rhythms."
      });
    }
    
    // Add nutrition recommendations
    const nutrition = generateNutritionRecommendations(symptoms, periods);
    if (nutrition.specific.length > 0) {
      insights.push({
        type: 'nutrition',
        title: 'Nutrition Recommendations',
        description: `Based on your current cycle phase, consider foods rich in ${nutrition.specific[0].nutrient} like ${nutrition.specific[0].foods}.`,
        recommendation: nutrition.specific[0].reason
      });
    }
    
    // Add exercise recommendations
    const exercise = generateExerciseRecommendations(symptoms, periods);
    if (exercise.specific.length > 0) {
      insights.push({
        type: 'exercise',
        title: 'Exercise Suggestions',
        description: `This may be a good time for ${exercise.specific[0].type} activities like ${exercise.specific[0].examples}.`,
        recommendation: exercise.specific[0].benefit
      });
    }
    
    // Add mood analysis
    const mood = analyzeMoodPatterns(symptoms, periods);
    if (mood.patterns.length > 0) {
      insights.push({
        type: 'mood',
        title: 'Mood Pattern Detected',
        description: mood.patterns[0].description,
        recommendation: mood.patterns[0].recommendation
      });
    }
    
    return insights;
  };

  const handlePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('You must be logged in to submit period data');
      toast.error('You must be logged in to submit period data');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/periodcare/period/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(periodData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save period data');
      }
      
      // Reset form
      setPeriodData({
        start_date: '',
        end_date: '',
        cycle_length: 28,
        period_length: 5
      });
      
      // Close form and refresh data
      setActiveForm(null);
      toast.success('Period data saved successfully!');
      
      // Refresh data and generate insights
      await fetchPeriodHistory();
      await fetchSymptoms();
      generateInsights();
    } catch (err) {
      console.error('Error saving period data:', err);
      setError('Failed to save period data. Please try again.');
      toast.error('Failed to save period data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('You must be logged in to submit symptom data');
      toast.error('You must be logged in to submit symptom data');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/periodcare/symptom/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(symptomData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save symptom data');
      }
      
      // Reset form
      setSymptomData({
        date: '',
        symptom_type: '',
        severity: 1,
        notes: ''
      });
      
      // Close form and refresh data
      setActiveForm(null);
      toast.success('Symptom data saved successfully!');
      
      // Refresh data and generate insights
      await fetchSymptoms();
      generateInsights();
    } catch (err) {
      console.error('Error saving symptom data:', err);
      setError('Failed to save symptom data. Please try again.');
      toast.error('Failed to save symptom data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/periodcare/appointments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(appointmentData)
      });
      
      if (!response.ok) throw new Error('Failed to schedule appointment');
      
      // Reset form
      setActiveForm(null);
      alert('Appointment scheduled successfully!');
    } catch (err) {
      setError('Error scheduling appointment');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="period-care-container">
      <h1 className="page-title">Period Care</h1>
      
      <div className="feature-cards">
        <Link href="/period" className="feature-card">
          <div className="card-icon period-tracker-icon"></div>
          <h2>Period Tracker</h2>
          <p>Track your cycle, symptoms, and moods</p>
        </Link>
        
        <div className="feature-card" onClick={() => setActiveForm('symptom')}>
          <div className="card-icon symptom-icon"></div>
          <h2>Track Symptoms</h2>
          <p>Record your period symptoms and moods</p>
        </div>
        
      </div>
      
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button 
            className="action-button" 
            onClick={() => setActiveForm('period')}
          >
            Log Period
          </button>
          <button 
            className="action-button" 
            onClick={() => setActiveForm('symptom')}
          >
            Record Symptom
          </button>

        </div>
      </div>

      {/* Period Data Summary Card */}
      {periodHistory.length > 0 && (
        <div className="data-summary-card">
          <h2>Your Period Summary</h2>
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-value">{periodHistory.length}</div>
              <div className="stat-label">Cycles Tracked</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {Math.round(periodHistory.reduce((sum, period) => sum + period.cycle_length, 0) / periodHistory.length)}
              </div>
              <div className="stat-label">Avg. Cycle Length</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {Math.round(periodHistory.reduce((sum, period) => sum + period.period_length, 0) / periodHistory.length)}
              </div>
              <div className="stat-label">Avg. Period Length</div>
            </div>
            {periodHistory.length > 1 && (
              <div className="stat-item">
                <div className="stat-value">
                  {new Date(periodHistory[0].start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="stat-label">Last Period</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeForm === 'period' && (
        <div className="input-form-container">
          <h2>Track Your Period</h2>
          <form onSubmit={handlePeriodSubmit}>
            <div className="form-group">
              <label htmlFor="start_date">Start Date:</label>
              <input 
                type="date" 
                id="start_date" 
                value={periodData.start_date} 
                onChange={(e) => setPeriodData({...periodData, start_date: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="end_date">End Date (optional):</label>
              <input 
                type="date" 
                id="end_date" 
                value={periodData.end_date} 
                onChange={(e) => setPeriodData({...periodData, end_date: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label htmlFor="cycle_length">Cycle Length (days):</label>
              <input 
                type="number" 
                id="cycle_length" 
                min="21" 
                max="40" 
                value={periodData.cycle_length} 
                onChange={(e) => setPeriodData({...periodData, cycle_length: parseInt(e.target.value)})} 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="period_length">Period Length (days):</label>
              <input 
                type="number" 
                id="period_length" 
                min="1" 
                max="10" 
                value={periodData.period_length} 
                onChange={(e) => setPeriodData({...periodData, period_length: parseInt(e.target.value)})} 
                required 
              />
            </div>
            <div className="form-buttons">
              <button type="submit" className="submit-btn">Save</button>
              <button type="button" className="cancel-btn" onClick={() => setActiveForm(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {activeForm === 'symptom' && (
        <div className="input-form-container">
          <h2>Record Symptoms</h2>
          <form onSubmit={handleSymptomSubmit}>
            <div className="form-group">
              <label htmlFor="symptom_date">Date:</label>
              <input 
                type="date" 
                id="symptom_date" 
                value={symptomData.date} 
                onChange={(e) => setSymptomData({...symptomData, date: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="symptom_type">Symptom:</label>
              <select 
                id="symptom_type" 
                value={symptomData.symptom_type} 
                onChange={(e) => setSymptomData({...symptomData, symptom_type: e.target.value})} 
                required
              >
                <option value="">Select a symptom</option>
                <option value="cramps">Cramps</option>
                <option value="headache">Headache</option>
                <option value="bloating">Bloating</option>
                <option value="fatigue">Fatigue</option>
                <option value="backache">Backache</option>
                <option value="nausea">Nausea</option>
                <option value="breast_tenderness">Breast Tenderness</option>
                <option value="acne">Acne</option>
                <option value="mood_swings">Mood Swings</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="severity">Severity (1-5):</label>
              <input 
                type="range" 
                id="severity" 
                min="1" 
                max="5" 
                value={symptomData.severity} 
                onChange={(e) => setSymptomData({...symptomData, severity: parseInt(e.target.value)})} 
              />
              <span>{symptomData.severity}</span>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes:</label>
              <textarea 
                id="notes" 
                value={symptomData.notes} 
                onChange={(e) => setSymptomData({...symptomData, notes: e.target.value})}
              ></textarea>
            </div>
            <div className="form-buttons">
              <button type="submit" className="submit-btn">Save</button>
              <button type="button" className="cancel-btn" onClick={() => setActiveForm(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {activeForm === 'appointment' && (
        <div className="input-form-container">
          <h2>Schedule Appointment</h2>
          <form onSubmit={handleAppointmentSubmit}>
            <div className="form-group">
              <label htmlFor="appointment_date">Date:</label>
              <input 
                type="date" 
                id="appointment_date" 
                value={appointmentData.appointment_date} 
                onChange={(e) => setAppointmentData({...appointmentData, appointment_date: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="appointment_time">Time:</label>
              <input 
                type="time" 
                id="appointment_time" 
                value={appointmentData.appointment_time} 
                onChange={(e) => setAppointmentData({...appointmentData, appointment_time: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="doctor_name">Doctor's Name:</label>
              <input 
                type="text" 
                id="doctor_name" 
                value={appointmentData.doctor_name} 
                onChange={(e) => setAppointmentData({...appointmentData, doctor_name: e.target.value})} 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="doctor_email">Doctor's Email:</label>
              <input 
                type="email" 
                id="doctor_email" 
                value={appointmentData.doctor_email} 
                onChange={(e) => setAppointmentData({...appointmentData, doctor_email: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label htmlFor="location">Location:</label>
              <input 
                type="text" 
                id="location" 
                value={appointmentData.location} 
                onChange={(e) => setAppointmentData({...appointmentData, location: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label htmlFor="reason">Reason for Visit:</label>
              <textarea 
                id="reason" 
                value={appointmentData.reason} 
                onChange={(e) => setAppointmentData({...appointmentData, reason: e.target.value})}
              ></textarea>
            </div>
            <div className="form-buttons">
              <button type="submit" className="submit-btn">Schedule</button>
              <button type="button" className="cancel-btn" onClick={() => setActiveForm(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      {/* AI Insights Section */}
      <section id="insights" className="insights-section">
        <h2>AI-Powered Cycle Insights</h2>
        
        {periodHistory.length === 0 ? (
          <div className="no-data-message">
            <p>Start tracking your period to receive personalized AI insights about your cycle patterns and symptoms.</p>
            <button className="action-button" onClick={() => setActiveForm('period')}>
              Log First Period
            </button>
          </div>
        ) : loadingInsights ? (
          <div className="loading-insights">
            <div className="loading-spinner"></div>
            <p>Analyzing your cycle data...</p>
          </div>
        ) : (
          <div className="insights-content">
            <div className="insight-card primary">
              <div className="insight-icon"></div>
              <div className="insight-text">
                <h3>Personalized Insights</h3>
                <p>{insights || "Based on your cycle data, our AI analysis will appear here after you've tracked a few cycles."}</p>
              </div>
            </div>
            
            {nextPeriodDate && (
              <div className="insight-card">
                <div className="insight-icon prediction-icon"></div>
                <div className="insight-text">
                  <h3>Next Period Prediction</h3>
                  <p>Based on your data, your next period is likely to start around <strong>{nextPeriodDate}</strong>.</p>
                  {fertileWindow && (
                    <p className="sub-insight">Your fertile window is estimated to be from <strong>{fertileWindow.start}</strong> to <strong>{fertileWindow.end}</strong>.</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Current Cycle Phase Card (New) */}
            {periodHistory.length > 0 && (
              <div className="insight-card phase-card">
                <div className="insight-icon phase-icon"></div>
                <div className="insight-text">
                  <h3>Current Cycle Phase</h3>
                  {(() => {
                    const hormonal = calculateHormonalPhases(periodHistory);
                    if (hormonal.currentPhase && hormonal.dayOfCycle) {
                      return (
                        <>
                          <p>You're currently in your <strong>{hormonal.currentPhase} phase</strong> (Day {hormonal.dayOfCycle} of your cycle).</p>
                          <div className="cycle-phases-visualization">
                            {['menstrual', 'follicular', 'ovulation', 'luteal'].map(phase => (
                              <div 
                                key={phase}
                                className={`phase-segment ${phase} ${hormonal.currentPhase === phase ? 'active' : ''}`}
                                title={phase.charAt(0).toUpperCase() + phase.slice(1)}
                              ></div>
                            ))}
                          </div>
                          <p className="phase-description">{
                            hormonal.currentPhase === 'menstrual' ? 'Period phase: Your body is shedding the uterine lining.' :
                            hormonal.currentPhase === 'follicular' ? 'Follicular phase: Your body is preparing eggs for potential release.' :
                            hormonal.currentPhase === 'ovulation' ? 'Ovulation phase: An egg is being released from the ovary.' :
                            'Luteal phase: Your body is preparing for possible pregnancy.'
                          }</p>
                        </>
                      );
                    } else {
                      return <p>Continue tracking to see your current cycle phase.</p>;
                    }
                  })()}
                </div>
              </div>
            )}
            
            {symptoms.length > 0 && (
              <div className="insight-card">
                <div className="insight-icon symptom-analysis-icon"></div>
                <div className="insight-text">
                  <h3>Symptom Analysis</h3>
                  <p>Your most common symptoms appear to be {symptoms.slice(0, 3).map(s => s.symptom_type.replace('_', ' ')).join(', ')}. 
                  These typically occur {symptoms[0].date ? 
                  `around day ${Math.round((new Date(symptoms[0].date).getTime() - new Date(periodHistory[0].start_date).getTime()) / (1000 * 60 * 60 * 24))} of your cycle.` : 
                  'at various points in your cycle.'}</p>
                </div>
              </div>
            )}
            
            {/* Nutrition Recommendations (New) */}
            {periodHistory.length > 0 && (
              <div className="insight-card nutrition-card">
                <div className="insight-icon nutrition-icon"></div>
                <div className="insight-text">
                  <h3>Nutrition Recommendations</h3>
                  {(() => {
                    const nutrition = generateNutritionRecommendations(symptoms, periodHistory);
                    return (
                      <>
                        <p>{nutrition.general}</p>
                        {nutrition.specific.length > 0 && (
                          <div className="recommendation-pills">
                            {nutrition.specific.slice(0, 2).map((rec, i) => (
                              <div key={i} className="pill">
                                <strong>{rec.nutrient}</strong>: {rec.foods}
                                <span className="tooltip">{rec.reason}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            
            {/* Exercise Recommendations (New) */}
            {periodHistory.length > 0 && (
              <div className="insight-card exercise-card">
                <div className="insight-icon exercise-icon"></div>
                <div className="insight-text">
                  <h3>Exercise Suggestions</h3>
                  {(() => {
                    const exercise = generateExerciseRecommendations(symptoms, periodHistory);
                    return (
                      <>
                        <p>{exercise.general}</p>
                        {exercise.specific.length > 0 && (
                          <div className="recommendation-box">
                            <p><strong>Recommended now:</strong> {exercise.specific[0].type}</p>
                            <p><em>Examples:</em> {exercise.specific[0].examples}</p>
                            <p className="benefit">{exercise.specific[0].benefit}</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            
            {aiInsights.length > 0 && aiInsights.map((insight, index) => (
              <div className={`insight-card ai-generated ${insight.type}`} key={index}>
                <div className={`insight-icon ${insight.type}-icon`}></div>
                <div className="insight-text">
                  <h3>{insight.title}</h3>
                  <p>{insight.description}</p>
                  {insight.recommendation && (
                    <div className="insight-recommendation">
                      <h4>Recommendation:</h4>
                      <p>{insight.recommendation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <div className="insights-action-buttons">
              <button className="refresh-insights" onClick={generateInsights}>
                Refresh Insights
              </button>
              <button className="action-button secondary" onClick={() => setActiveForm('period')}>
                Log New Period
              </button>
            </div>
          </div>
        )}
      </section>
      
      <section id="resources" className="resources-section">
        <h2>Menstrual Health Resources</h2>
        
        <div className="resource-cards">
          <div className="resource-card">
            <h3>Understanding Your Cycle</h3>
            <p>Your menstrual cycle is more than just your period. Learn about the four phases of the menstrual cycle and how they affect your body and mood.</p>
            <ul>
              <li>Menstrual phase: When bleeding occurs</li>
              <li>Follicular phase: When eggs mature</li>
              <li>Ovulation phase: When an egg is released</li>
              <li>Luteal phase: When the body prepares for possible pregnancy</li>
            </ul>
          </div>
          
          <div className="resource-card">
            <h3>Managing Period Pain</h3>
            <p>Period pain (dysmenorrhea) is common but shouldn't disrupt your life. Try these methods for relief:</p>
            <ul>
              <li>Heat therapy with warm compresses or heating pads</li>
              <li>Gentle exercise like walking or yoga</li>
              <li>Over-the-counter pain relievers as directed</li>
              <li>Relaxation techniques such as deep breathing</li>
              <li>Consult your doctor if pain is severe or worsening</li>
            </ul>
          </div>
          
          <div className="resource-card">
            <h3>Sustainable Period Products</h3>
            <p>Consider these eco-friendly alternatives to traditional period products:</p>
            <ul>
              <li>Menstrual cups: Reusable silicone cups that collect blood</li>
              <li>Period underwear: Absorbent, washable underwear</li>
              <li>Reusable cloth pads: Washable fabric pads</li>
              <li>Organic cotton products: Biodegradable tampons and pads</li>
            </ul>
          </div>
        </div>
      </section>
      
      <section className="faq-section">
        <h2>Frequently Asked Questions</h2>
        
        <div className="faq-items">
          <div className="faq-item">
            <h3>How long should my period last?</h3>
            <p>Most periods last between 3-7 days. If your period regularly lasts longer than 7 days, consult with your healthcare provider.</p>
          </div>
          
          <div className="faq-item">
            <h3>Is it normal to have irregular periods?</h3>
            <p>Some variation in cycle length is normal. Factors like stress, weight changes, excessive exercise, and certain medical conditions can cause irregularity. If you're concerned about your cycle, speak with your doctor.</p>
          </div>
          
          <div className="faq-item">
            <h3>When should I see a doctor about period concerns?</h3>
            <p>Consider consulting your healthcare provider if you experience: periods lasting longer than 7 days, severe pain, very heavy bleeding, significant irregularity, or missed periods (if not pregnant).</p>
          </div>
        </div>
      </section>
    </div>
  );
} 