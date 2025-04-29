import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/insights - Get AI insights based on period and symptom data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Fetch periods data
    const periods = await db
      .collection('periods')
      .find({ email })
      .sort({ startDate: -1 })
      .limit(6) // Get last 6 periods for analysis
      .toArray();
      
    // Fetch symptoms data
    const symptoms = await db
      .collection('symptoms')
      .find({ email })
      .sort({ date: -1 })
      .limit(20) // Get recent symptoms
      .toArray();

    // Generate insights based on the data
    const insights = generateInsights(periods, symptoms);

    return NextResponse.json({ insights }, { status: 200 });
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

// POST /api/insights - Generate enhanced AI insights
export async function POST(request) {
  try {
    const data = await request.json();
    
    // Extract period and symptom data
    const { period_history, symptoms, analysis } = data;
    
    if (!period_history || !Array.isArray(period_history)) {
      return NextResponse.json(
        { error: 'Valid period history data is required' },
        { status: 400 }
      );
    }
    
    // Generate enhanced insights with more detailed analysis
    const enhancedInsights = generateEnhancedInsights(period_history, symptoms, analysis);
    
    return NextResponse.json({
      insights: "Based on your cycle data, we've generated personalized insights to help you understand your menstrual health better.",
      advanced_insights: enhancedInsights
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating enhanced insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate enhanced insights' },
      { status: 500 }
    );
  }
}

// Helper function to generate insights based on period and symptom data
function generateInsights(periods, symptoms) {
  const insights = [];

  // Only proceed if we have enough data
  if (periods.length < 2) {
    insights.push({
      type: 'info',
      title: 'Not enough data',
      description: 'Track at least 2 periods to get cycle insights.'
    });
    return insights;
  }

  // Calculate cycle length consistency
  const cycleLengths = [];
  for (let i = 0; i < periods.length - 1; i++) {
    const currentStart = new Date(periods[i].startDate);
    const nextStart = new Date(periods[i + 1].startDate);
    const daysDiff = Math.round((currentStart - nextStart) / (1000 * 60 * 60 * 24));
    cycleLengths.push(daysDiff);
  }

  // Calculate average cycle length
  const avgCycleLength = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
  insights.push({
    type: 'cycle',
    title: 'Cycle Length',
    description: `Your average cycle length is ${Math.round(avgCycleLength)} days.`
  });

  // Check cycle regularity
  const maxDeviation = Math.max(...cycleLengths) - Math.min(...cycleLengths);
  if (maxDeviation <= 3) {
    insights.push({
      type: 'positive',
      title: 'Regular Cycles',
      description: 'Your cycles appear to be regular, which is great for your reproductive health.'
    });
  } else if (maxDeviation > 7) {
    insights.push({
      type: 'warning',
      title: 'Irregular Cycles',
      description: 'Your cycles show significant variation. This can be normal, but might be worth discussing with your healthcare provider.'
    });
  }

  // Period length insights
  const periodLengths = periods.map(p => {
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  });
  const avgPeriodLength = periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length;
  insights.push({
    type: 'period',
    title: 'Period Duration',
    description: `Your periods typically last ${Math.round(avgPeriodLength)} days.`
  });

  // Calculate current phase
  const lastPeriodStart = new Date(periods[0].startDate);
  const today = new Date();
  const daysDiff = Math.round((today - lastPeriodStart) / (1000 * 60 * 60 * 24));
  let currentPhase = '';
  let currentDayOfCycle = daysDiff + 1;
  
  if (daysDiff < avgPeriodLength) {
    currentPhase = 'menstrual';
  } else if (daysDiff < avgCycleLength * 0.45) {
    currentPhase = 'follicular';
  } else if (daysDiff < avgCycleLength * 0.5) {
    currentPhase = 'ovulation';
  } else {
    currentPhase = 'luteal';
  }
  
  insights.push({
    type: 'phase',
    title: 'Current Cycle Phase',
    description: `You're currently in your ${currentPhase} phase (day ${currentDayOfCycle} of your cycle).`,
    recommendation: getPhaseRecommendation(currentPhase)
  });

  // Symptom analysis
  if (symptoms.length > 0) {
    // Find most common symptoms
    const symptomCounts = {};
    symptoms.forEach(record => {
      if (Array.isArray(record.symptoms)) {
        record.symptoms.forEach(s => {
          symptomCounts[s] = (symptomCounts[s] || 0) + 1;
        });
      } else if (typeof record.symptoms === 'string') {
        symptomCounts[record.symptoms] = (symptomCounts[record.symptoms] || 0) + 1;
      }
    });

    const sortedSymptoms = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([symptom]) => symptom);
      
    if (sortedSymptoms.length > 0) {
      insights.push({
        type: 'symptom',
        title: 'Common Symptoms',
        description: `Your most frequent symptoms are: ${sortedSymptoms.join(', ')}.`
      });
    }
  }

  // Add nutrition recommendations based on current phase
  insights.push({
    type: 'nutrition',
    title: `Nutrition for ${currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Phase`,
    description: getNutritionRecommendation(currentPhase),
    recommendation: "Adjusting your diet according to your cycle phases may help manage symptoms."
  });
  
  // Add exercise recommendations based on current phase
  insights.push({
    type: 'exercise',
    title: `Exercise for ${currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Phase`,
    description: getExerciseRecommendation(currentPhase),
    recommendation: "Listen to your body and adjust intensity based on how you feel."
  });

  return insights;
}

// Function to generate enhanced insights for the POST endpoint
function generateEnhancedInsights(periods, symptoms, analysis) {
  // Start with regular insights
  const baseInsights = [];
  
  // Calculate current cycle phase
  let currentPhase = "unknown";
  let dayOfCycle = null;
  
  if (periods.length > 0) {
    // Get the most recent period
    const latestPeriod = periods[0];
    const lastPeriodStart = new Date(latestPeriod.start_date);
    const today = new Date();
    const daysSincePeriod = Math.round((today - lastPeriodStart) / (1000 * 60 * 60 * 24));
    dayOfCycle = daysSincePeriod + 1;
    
    // Calculate average cycle length
    const avgCycleLength = periods.reduce((sum, p) => sum + (p.cycle_length || 28), 0) / periods.length;
    const avgPeriodLength = periods.reduce((sum, p) => sum + (p.period_length || 5), 0) / periods.length;
    
    // Determine current phase
    if (daysSincePeriod < avgPeriodLength) {
      currentPhase = "menstrual";
    } else if (daysSincePeriod < avgCycleLength * 0.45) {
      currentPhase = "follicular";
    } else if (daysSincePeriod < avgCycleLength * 0.5) {
      currentPhase = "ovulation";
    } else {
      currentPhase = "luteal";
    }
    
    // Calculate cycle regularity
    let regularity = "unknown";
    if (periods.length >= 3) {
      const cycleLengths = [];
      for (let i = 1; i < periods.length; i++) {
        const current = new Date(periods[i].start_date);
        const previous = new Date(periods[i-1].start_date);
        const daysDiff = Math.abs((previous - current) / (1000 * 60 * 60 * 24));
        if (daysDiff > 0 && daysDiff < 60) {
          cycleLengths.push(daysDiff);
        }
      }
      
      if (cycleLengths.length > 1) {
        const variation = Math.max(...cycleLengths) - Math.min(...cycleLengths);
        if (variation <= 2) {
          regularity = "very regular";
        } else if (variation <= 5) {
          regularity = "regular";
        } else if (variation <= 10) {
          regularity = "somewhat irregular";
        } else {
          regularity = "irregular";
        }
      }
    }
    
    // Add cycle pattern insight
    baseInsights.push({
      type: "cycle",
      title: "Your Cycle Pattern",
      description: `Your cycles appear to be ${regularity} with an average length of ${Math.round(avgCycleLength)} days.`,
      recommendation: "Regular cycles generally indicate good hormonal balance, though some variation is normal."
    });
    
    // Add current phase insight
    baseInsights.push({
      type: "phase",
      title: `Current ${currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Phase`,
      description: getPhaseDescription(currentPhase, dayOfCycle),
      recommendation: getPhaseRecommendation(currentPhase)
    });
  } else {
    baseInsights.push({
      type: "info",
      title: "Not enough data",
      description: "Track at least one period to get personalized cycle insights.",
      recommendation: "Regular tracking helps identify patterns in your cycle and symptoms."
    });
    return baseInsights;
  }
  
  // Add symptom insights if available
  if (symptoms && symptoms.length > 0) {
    // Count frequency of each symptom
    const symptomCounts = {};
    symptoms.forEach(s => {
      const type = s.symptom_type || s.symptoms;
      if (type) {
        symptomCounts[type] = (symptomCounts[type] || 0) + 1;
      }
    });
    
    const topSymptoms = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type.replace('_', ' '));
    
    if (topSymptoms.length > 0) {
      baseInsights.push({
        type: "symptom",
        title: "Your Common Symptoms",
        description: `Your most frequently tracked symptoms are ${topSymptoms.join(', ')}.`,
        recommendation: "Consider tracking the severity and timing of these symptoms to identify patterns."
      });
    }
  }
  
  // Add nutrition insight
  baseInsights.push({
    type: "nutrition",
    title: `Nutrition for ${currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Phase`,
    description: getNutritionRecommendation(currentPhase),
    recommendation: "Adjusting your diet according to your cycle phases may help manage symptoms."
  });
  
  // Add exercise insight
  baseInsights.push({
    type: "exercise",
    title: `Exercise for ${currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Phase`,
    description: getExerciseRecommendation(currentPhase),
    recommendation: "Listen to your body and adjust exercise intensity based on your energy levels."
  });
  
  return baseInsights;
}

// Helper functions for insights
function getPhaseDescription(phase, dayOfCycle) {
  if (phase === "menstrual") {
    return `You're currently on day ${dayOfCycle} of your cycle, in your menstrual phase. Your body is shedding the uterine lining as your period.`;
  } else if (phase === "follicular") {
    return `You're on day ${dayOfCycle} of your cycle, in the follicular phase. Your body is preparing eggs for possible release and rebuilding the uterine lining.`;
  } else if (phase === "ovulation") {
    return `You're on day ${dayOfCycle} of your cycle, in your ovulation phase. An egg is being released from the ovary, making this your most fertile time.`;
  } else if (phase === "luteal") {
    return `You're on day ${dayOfCycle} of your cycle, in the luteal phase. Your body is preparing for possible pregnancy, and if the egg isn't fertilized, you'll begin your period.`;
  } else {
    return `You're on day ${dayOfCycle} of your cycle.`;
  }
}

function getPhaseRecommendation(phase) {
  if (phase === "menstrual") {
    return "Focus on rest and gentle activities. Iron-rich foods can help replenish what's lost during menstruation.";
  } else if (phase === "follicular") {
    return "This is a great time for new projects and higher intensity workouts as energy levels rise with estrogen.";
  } else if (phase === "ovulation") {
    return "If you're trying to conceive, this is your most fertile time. If not, be mindful of protection during sexual activity.";
  } else if (phase === "luteal") {
    return "Self-care is important as PMS symptoms may appear. Complex carbs can help with mood stability.";
  } else {
    return "Pay attention to how your body feels and adjust activities accordingly.";
  }
}

function getNutritionRecommendation(phase) {
  if (phase === "menstrual") {
    return "Focus on iron-rich foods like leafy greens, lentils, and grass-fed red meat to replenish what's lost during bleeding.";
  } else if (phase === "follicular") {
    return "Emphasize foods high in B vitamins and zinc such as eggs, legumes, and whole grains to support follicle development.";
  } else if (phase === "ovulation") {
    return "Incorporate antioxidant-rich fruits and vegetables, healthy fats from avocados and olive oil, and fermented foods.";
  } else if (phase === "luteal") {
    return "Choose complex carbs like sweet potatoes, calcium-rich foods, and magnesium-rich foods like dark chocolate to help manage PMS symptoms.";
  } else {
    return "Maintain a balanced diet with plenty of fruits, vegetables, lean proteins, and whole grains.";
  }
}

function getExerciseRecommendation(phase) {
  if (phase === "menstrual") {
    return "Gentle activities like walking, light yoga, or swimming can help relieve cramps and boost mood without overtaxing your body.";
  } else if (phase === "follicular") {
    return "Take advantage of increasing energy with high-intensity workouts, strength training, or cardio activities that challenge you.";
  } else if (phase === "ovulation") {
    return "Your body is at peak performance with higher testosterone levels. Great time for strength training, HIIT, or group fitness classes.";
  } else if (phase === "luteal") {
    return "As energy decreases, moderate activities like pilates, light strength training, or hiking can help manage mood changes and bloating.";
  } else {
    return "Listen to your body and choose activities that match your energy levels while maintaining consistency.";
  }
}
