import { GoogleGenAI } from "@google/genai";
import { UserProfile, VitalLog, MedicationLog, MealLog, ActivityLog } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY! });

export async function generateHealthNudge(
  profile: UserProfile,
  recentVitals: VitalLog[],
  recentMeds: MedicationLog[],
  recentMeals: MealLog[],
  recentActivity: ActivityLog[]
) {
  const prompt = `
    As a health assistant for a patient with ${profile.diagnosis}, analyze their recent data and provide a short, encouraging health nudge (max 2 sentences).
    
    Patient Profile:
    - Diagnosis: ${profile.diagnosis}
    - Age: ${profile.age || 'N/A'}
    - Targets: BP < ${profile.targetBPSystolic || 130}/${profile.targetBPDiastolic || 80}, Glucose < ${profile.targetGlucose || 140}
    
    Recent Data:
    - Vitals: ${JSON.stringify(recentVitals.slice(0, 3))}
    - Medications: ${JSON.stringify(recentMeds.slice(0, 3))}
    - Meals: ${JSON.stringify(recentMeals.slice(0, 3))}
    - Activity: ${JSON.stringify(recentActivity.slice(0, 3))}
    
    Provide a specific, evidence-based nudge. Focus on one area (lifestyle, medication, nutrition, or activity).
    Format: JSON with "message" and "category" fields.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error generating health nudge:", error);
    return {
      message: "Keep up the great work monitoring your health! Consistency is key.",
      category: "lifestyle"
    };
  }
}

export async function estimateMealNutrition(description: string) {
  const prompt = `
    Estimate the calories and carbohydrates (in grams) for the following meal description:
    "${description}"
    
    Format: JSON with "calories" (number) and "carbs" (number) fields. 
    If you cannot estimate, provide reasonable defaults (e.g., 0).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || '{"calories": 0, "carbs": 0}');
  } catch (error) {
    console.error("Error estimating meal nutrition:", error);
    return { calories: 0, carbs: 0 };
  }
}
