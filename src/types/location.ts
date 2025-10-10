// src/types/location.ts
export interface City {
  id: string;
  name: string;
  state: string;
  tier: 1 | 2 | 3; // 1 = Metro, 2 = Major, 3 = Growing
  latitude?: number;
  longitude?: number;
  population?: number;
  created_at?: string;
}

export interface CityGroup {
  tier: 1 | 2 | 3;
  label: string;
  cities: City[];
}

export interface CityPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySelect?: (city: City) => void;
}
