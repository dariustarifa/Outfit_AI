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
