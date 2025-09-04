import mongoose from "mongoose";

export enum UserState {
  MainMenu = "MainMenu",
  AskingFollowingEntity = "AskingFollowingEntity",
  AskingWeekTeacher = "AskingWeekTeacher",
  AskingWeekGroup = "AskingWeekGroup",
  ChoosingFollowingEntity = "ChoosingFollowingEntity",
  AskingSubgroup = "AskingSubgroup"
}

export enum UserRole {
  Student = "Student",
  Teacher = "Teacher"
}

export interface User {
  telegramId: number;
  username?: string;
  state: UserState;
  role?: UserRole;
  
  // Selected entities for schedule queries
  selectedGroup?: string;
  selectedTeacher?: string;
  selectedSubject?: string;
  subgroup?: number;
  
  // Temporary selection arrays for multi-step selection
  choosing_groups?: Array<{ id: number; groupNumber: string }>;
  choosing_teachers?: string[];
  
  // Mongoose document methods
  save(): Promise<this>;
}

const userSchema = new mongoose.Schema<User>({
  telegramId: { type: Number, required: true, unique: true },
  username: String,
  state: { type: String, enum: Object.values(UserState), required: true },
  role: { type: String, enum: Object.values(UserRole) },
  
  // Selected entities for schedule queries
  selectedGroup: String,
  selectedTeacher: String,
  selectedSubject: String,
  subgroup: Number,
  
  // Temporary selection arrays for multi-step selection
  choosing_groups: [{ id: Number, groupNumber: String }],
  choosing_teachers: [String]
}, {
  collection: 'users' // Explicitly set collection name
});

export const User = mongoose.model<User>("User", userSchema);