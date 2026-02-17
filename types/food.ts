export interface Allergen {
  code: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  severity: "high" | "medium" | "low";
  commonNames?: string[];
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
  foodCode: string | undefined;
  foodName: string;
  manufacturer: string;
  weight: string;
  allergens: string[];
  allergyWarning?: string;
  crossContamination?: string[];
  crossContaminationRisks?: DetectedAllergen[];
  userAllergens: string[];
  detectedAllergens: DetectedAllergen[];
  ingredients: string[];
  nutritionDetails?: NutritionDetail[];
  servingSize?: string;
  isSafe: boolean;
  hasNutritionInfo?: boolean;
  detectedIngredients?: string[];
  dataSource?: "openapi" | "database" | "ai";
  alternatives?: AlternativeProduct[];
}

export interface DetectedAllergen {
  name: string;
  amount: string;
  severity: string;
  type?: string;
  code?: string | null;
}

// ✅ 새로 추가
export interface NutritionDetail {
  name: string;
  content: string;
  unit: string;
  percentage?: string;
}

export interface NutritionInfo {
  calories?: string;
  sodium?: string;
  carbs?: string;
  protein?: string;
  fat?: string;
  sugars?: string;
  servingSize?: string;
}

export interface AlternativeProduct {
  barcode: string;
  productName: string;
  manufacturer?: string;
  category: string;
  reason?: string;
  dataSource?: string;
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

// 검색 결과 타입
export interface SearchResult {
  foodCode: string;
  foodName: string;
  manufacturer: string;
  allergens: string[];
  hasAllergen: boolean;
  searchType?: string;
  dataSource?: string;
  rawMaterials?: string;
  weight?: string;
  ingredients?: string[];
  detectedIngredients?: string[];
  nutritionInfo?: NutritionInfo;
  matchedUserAllergens?: string[];
}

// 즐겨찾기 타입
export interface FoodFavorite {
  id: string;
  food_code: string;
  food_name: string;
  manufacturer: string;
  is_safe: boolean;
  created_at: string;
}

// 검색 기록 타입
export interface SearchHistory {
  query: string;
  timestamp: number;
}

// 최근 확인 제품 타입
export interface RecentProduct {
  foodCode: string;
  foodName: string;
  isSafe: boolean;
  checkedAt: string;
  manufacturer?: string;
}
