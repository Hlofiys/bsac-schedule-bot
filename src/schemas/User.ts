import { Context, SessionFlavor } from "grammy";

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

export interface IUser {
  telegramId: number;
  username?: string;
  state: UserState;
  role?: UserRole;
  
  choosing_groups: Array<{ id: number; groupNumber: string }>;
  group?: { id: number; groupNumber: string };
  subgroup?: number;
  
  choosing_teachers: string[];
  teacher_name?: string;
}

// Extend the context with our user data
export type MyContext = Context & SessionFlavor<IUser>;