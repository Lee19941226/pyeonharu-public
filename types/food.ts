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
  crossContaminationRisks?: Array<{
    name: string;
    type: string;
    severity: string;
  }>;
  userAllergens: string[];
  detectedAllergens: Array<{
    name: string;
    amount: string;
    severity: string;
  }>;
  ingredients: string[];
  nutritionDetails?: Array<{
    name: string;
    content: string;
    unit: string;
    percentage?: string;
  }>;
  servingSize?: string;
  isSafe: boolean;
  hasNutritionInfo?: boolean;
  detectedIngredients?: string[];
  dataSource?: string;
  alternatives?: Array<{
    barcode: string;
    productName: string;
    manufacturer?: string;
    category: string;
    reason?: string;
  }>;
}

export interface DetectedAllergen {
  name: string;
  amount: string;
  severity: string;
  type?: string;
  code?: string | null;
}

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
  foodCode: string;
  foodName: string;
  manufacturer: string;
  isSafe: boolean;
  createdAt: string;
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

// AI 분석 결과 타입
export interface AIAnalysisResult {
  productName?: string;
  manufacturer?: string;
  detectedIngredients: string[];
  allergens: string[];
  hasUserAllergen: boolean;
  matchedUserAllergens: string[];
  foodCode?: string;
  dataSource?: string;
  rawMaterials?: string;
  nutritionInfo?: NutritionInfo;
  ingredients?: string[];
  weight?: string;
  isProcessing: boolean;
}

// 제품 후보 타입 (select 페이지)
export interface Candidate {
  foodCode: string;
  foodName: string;
  manufacturer?: string;
  matchedIngredient?: string;
}

// ✅ 연속 스캔 결과 타입 (camera 페이지)
export interface ScannedResult {
  foodCode: string;
  foodName: string;
  manufacturer?: string;
  isSafe: boolean;
  detectedAllergens: string[];
  scannedAt: string;
}

// ✅ 온보딩 데모 결과 타입
export interface DemoResult {
  foodName: string;
  allergens: string[];
  detectedAllergens: Array<{
    name: string;
    severity: string;
  }>;
  isSafe: boolean;
}
export interface HistoryItem {
  foodCode: string;
  foodName: string;
  manufacturer?: string;
  checkedAt: string;
  isSafe: boolean;
}
