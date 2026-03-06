import { create } from "zustand";

// ── 공통 타입 (컴포넌트에서 import하여 사용) ──

export interface RecentCheck {
  foodName: string;
  isSafe: boolean;
  checkedAt: string;
}

export interface Restaurant {
  name: string;
  category: string;
  categoryFull: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  phone: string;
  link: string;
  riskLevel: "safe" | "caution" | "danger";
  matchedAllergens: string[];
  categoryAllergens: string[];
  distance?: string;
  distanceKm?: number;
}

export interface Medicine {
  id: string;
  name: string;
  company: string;
  efficacy: string;
  usage: string;
  warningPrecaution: string;
  precaution: string;
  interaction: string;
  sideEffect: string;
  storage: string;
  image: string;
}

// ── 탭별 상태 타입 ──

interface FoodTabData {
  searchQuery: string;
  searchResults: RecentCheck[];
  recentSearches: RecentCheck[];
}

interface RestaurantTabData {
  searchQuery: string;
  searchResults: Restaurant[];
}

interface MedicineTabData {
  searchQuery: string;
  searchResults: Medicine[];
}

type Updater<T> = Partial<T> | ((state: T) => Partial<T>);

interface TabStateStore {
  food: FoodTabData;
  restaurant: RestaurantTabData;
  medicine: MedicineTabData;
  setFoodTab: (partial: Updater<FoodTabData>) => void;
  setRestaurantTab: (partial: Updater<RestaurantTabData>) => void;
  setMedicineTab: (partial: Updater<MedicineTabData>) => void;
}

export const useTabStateStore = create<TabStateStore>()((set) => ({
  food: { searchQuery: "", searchResults: [], recentSearches: [] },
  restaurant: { searchQuery: "", searchResults: [] },
  medicine: { searchQuery: "", searchResults: [] },

  setFoodTab: (partial) =>
    set((state) => ({
      food: {
        ...state.food,
        ...(typeof partial === "function" ? partial(state.food) : partial),
      },
    })),

  setRestaurantTab: (partial) =>
    set((state) => ({
      restaurant: {
        ...state.restaurant,
        ...(typeof partial === "function" ? partial(state.restaurant) : partial),
      },
    })),

  setMedicineTab: (partial) =>
    set((state) => ({
      medicine: {
        ...state.medicine,
        ...(typeof partial === "function" ? partial(state.medicine) : partial),
      },
    })),
}));
