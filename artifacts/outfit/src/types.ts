export interface Profile {
  name: string;
  age: number;
  heightCm: number;
  bodyPhotoUri: string;
  city: string;
  latitude: number;
  longitude: number;
  onboardingCompleted: boolean;
}

export interface WardrobeItem {
  id: string;
  imageUri: string;
  note: string;
  createdAt: number;
}

export interface WeatherSnapshot {
  temperatureC: number;
  condition: string;
  updatedAt: number;
}

export interface StoredAppData {
  profile: Profile | null;
  wardrobe: WardrobeItem[];
}
