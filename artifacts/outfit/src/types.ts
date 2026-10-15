export type Gender = "male" | "female" | "nonbinary" | "other";

export interface Profile {
  name: string;
  preferredName?: string;
  gender?: Gender;
  age: number;
  heightCm: number;
  bodyPhotoUri: string;
  city: string;
  latitude?: number;
  longitude?: number;
  photoConsent?: boolean;
  onboardingCompleted: boolean;
}

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface OnboardingDraft {
  name: string;
  preferredName: string;
  age: string;
  heightCm: string;
  city: string;
  bodyPhotoUri: string;
  photoConsent: boolean;
  step: OnboardingStep;
  selectedCity: {
    name: string;
    latitude: number;
    longitude: number;
  } | null;
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | "name"
    | "preferredName"
    | "gender"
    | "age"
    | "heightCm"
    | "bodyPhotoUri"
    | "city"
    | "latitude"
    | "longitude"
  >
>;

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
  minTemperatureC: number;
  maxTemperatureC: number;
  precipitationProbability: number;
}

export interface StoredAppData {
  profile: Profile | null;
  wardrobe: WardrobeItem[];
}
