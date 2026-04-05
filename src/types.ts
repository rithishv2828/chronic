export type Diagnosis = 'Type 2 Diabetes' | 'Hypertension' | 'Both';

export interface UserProfile {
  uid: string;
  displayName: string;
  diagnosis: Diagnosis;
  age?: number;
  weight?: number;
  targetBPSystolic?: number;
  targetBPDiastolic?: number;
  targetGlucose?: number;
  createdAt: string;
}

export type VitalType = 'blood_pressure' | 'glucose' | 'weight';

export interface VitalLog {
  id?: string;
  userId: string;
  timestamp: string;
  type: VitalType;
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  weight?: number;
  notes?: string;
}

export interface MedicationLog {
  id?: string;
  userId: string;
  timestamp: string;
  medicationName: string;
  dosage: string;
  taken: boolean;
}

export interface MedicationSchedule {
  id?: string;
  userId: string;
  medicationName: string;
  dosage: string;
  reminderTime: string; // HH:mm
  days: string[]; // ['Mon', 'Tue', ...]
  isActive: boolean;
  lastNotified?: string; // ISO string
  snoozedUntil?: string; // ISO string
}

export interface MealLog {
  id?: string;
  userId: string;
  timestamp: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  timestamp: string;
  activityType: string;
  durationMinutes: number;
  intensity: 'low' | 'medium' | 'high';
}

export interface Appointment {
  id?: string;
  userId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
}

export interface HealthNudge {
  id?: string;
  userId: string;
  timestamp: string;
  message: string;
  category: 'lifestyle' | 'medication' | 'nutrition' | 'activity';
}
