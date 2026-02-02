export interface Allergen {
  code: string;
  name: string;
  emoji: string;
  description: string;
}

export interface UserAllergen {
  id: string;
  user_id: string;
  allergen_code: string;
  allergen_name: string;
  severity: "high" | "medium" | "low";
  created_at: string;
}

export interface FoodResult {
  foodCode: string;
  foodName: string;
  manufacturer: string;
  weight: string;
  allergens: string[];
  userAllergens: string[];
  detectedAllergens: DetectedAllergen[];
  ingredients: string[];
  nutrition: NutritionInfo;
  isSafe: boolean;
}

export interface DetectedAllergen {
  name: string;
  amount: string;
  severity: string;
}

export interface NutritionInfo {
  calories: number;
  sodium: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface GuideData {
  allergen: string;
  immediateActions: string[];
  emergencySymptoms: string[];
  hospitalSymptoms: string[];
  alternatives: AlternativeFood[];
}

export interface AlternativeFood {
  name: string;
  emoji: string;
}
