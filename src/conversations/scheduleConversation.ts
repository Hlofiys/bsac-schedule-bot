import { Context } from "grammy";
import { ScheduleService } from "../services/scheduleService";

// Define conversation states
export enum ScheduleState {
  IDLE = "idle",
  AWAITING_CHOICE = "awaiting_choice",
  AWAITING_GROUP_ID = "awaiting_group_id",
  AWAITING_TEACHER_ID = "awaiting_teacher_id"
}

// Extend context with session data
export interface SessionData {
  scheduleState: ScheduleState;
  selectedGroupId?: number;
  selectedTeacherId?: number;
}

// Type for our context with session
export type MyContext = Context & { 
  session?: SessionData;
};

const API_BASE_URL = process.env.API_BASE_URL || "https://bsac.hlofiys.xyz";
const scheduleService = new ScheduleService();

// Function to start the schedule conversation
export async function startScheduleConversation(ctx: MyContext) {
  // Initialize session if it doesn't exist
  if (!ctx.session) {
    ctx.session = {
      scheduleState: ScheduleState.AWAITING_CHOICE
    };
  } else {
    ctx.session.scheduleState = ScheduleState.AWAITING_CHOICE;
  }
  
  const scheduleMessage = `
Для получения расписания, пожалуйста, выберите один из вариантов:

1. Расписание для группы
2. Расписание для преподавателя

Введите номер варианта (1 или 2):
  `.trim();

  await ctx.reply(scheduleMessage);
}

// Function to handle user responses during the schedule conversation
export async function handleScheduleResponse(ctx: MyContext) {
  // If no session or not in a schedule conversation, ignore
  if (!ctx.session || ctx.session.scheduleState === ScheduleState.IDLE) {
    return;
  }
  
  const userInput = ctx.message?.text;
  if (!userInput) return;
  
  switch (ctx.session.scheduleState) {
    case ScheduleState.AWAITING_CHOICE:
      if (userInput === "1") {
        await handleGroupChoice(ctx);
      } else if (userInput === "2") {
        await handleTeacherChoice(ctx);
      } else {
        await ctx.reply("Неверный выбор. Пожалуйста, введите 1 или 2.");
      }
      break;
      
    case ScheduleState.AWAITING_GROUP_ID:
      const groupId = parseInt(userInput);
      if (isNaN(groupId)) {
        await ctx.reply("Пожалуйста, введите корректный числовой ID группы.");
        return;
      }
      await handleGroupScheduleRequest(ctx, groupId);
      break;
      
    case ScheduleState.AWAITING_TEACHER_ID:
      const teacherId = parseInt(userInput);
      if (isNaN(teacherId)) {
        await ctx.reply("Пожалуйста, введите корректный числовой ID преподавателя.");
        return;
      }
      await handleTeacherScheduleRequest(ctx, teacherId);
      break;
  }
}

async function handleGroupChoice(ctx: MyContext) {
  try {
    // Get all groups
    const groups = await scheduleService.getAllGroups();
    
    // Format and send groups list
    const groupsMessage = scheduleService.formatGroupsList(groups);
    await ctx.reply(groupsMessage);
    
    // Ask user to select a group
    await ctx.reply("Пожалуйста, введите ID группы из списка выше:");
    
    // Update state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.AWAITING_GROUP_ID;
    }
  } catch (error) {
    console.error("Error in group choice handler:", error);
    await ctx.reply("Произошла ошибка при получении списка групп. Пожалуйста, попробуйте позже.");
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  }
}

async function handleTeacherChoice(ctx: MyContext) {
  try {
    // Get all teachers
    const teachers = await scheduleService.getAllTeachers();
    
    // Format and send teachers list
    const teachersMessage = scheduleService.formatTeachersList(teachers);
    await ctx.reply(teachersMessage);
    
    // Ask user to select a teacher
    await ctx.reply("Пожалуйста, введите ID преподавателя из списка выше:");
    
    // Update state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.AWAITING_TEACHER_ID;
    }
  } catch (error) {
    console.error("Error in teacher choice handler:", error);
    await ctx.reply("Произошла ошибка при получении списка преподавателей. Пожалуйста, попробуйте позже.");
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  }
}

async function handleGroupScheduleRequest(ctx: MyContext, groupId: number) {
  try {
    // Get all groups to validate the selected group
    const groups = await scheduleService.getAllGroups();
    const selectedGroup = groups.find(group => group.id === groupId);
    
    if (!selectedGroup) {
      await ctx.reply("Неверный ID группы. Пожалуйста, начните заново с команды /schedule");
      
      // Reset state
      if (ctx.session) {
        ctx.session.scheduleState = ScheduleState.IDLE;
      }
      return;
    }
    
    // Get schedule for the selected group
    // For simplicity, we'll get schedule for today and next few days
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // Format as YYYY-MM-DD
    }
    
    const schedule = await scheduleService.getGroupSchedule(groupId, dates);
    const scheduleMessage = scheduleService.formatSchedule(schedule);
    
    // Send the schedule
    await ctx.reply(scheduleMessage);
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  } catch (error) {
    console.error("Error in group schedule handler:", error);
    await ctx.reply("Произошла ошибка при получении расписания. Пожалуйста, попробуйте позже.");
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  }
}

async function handleTeacherScheduleRequest(ctx: MyContext, teacherId: number) {
  try {
    // Get all teachers to validate the selected teacher
    const teachers = await scheduleService.getAllTeachers();
    const selectedTeacher = teachers.find(teacher => teacher.id === teacherId);
    
    if (!selectedTeacher) {
      await ctx.reply("Неверный ID преподавателя. Пожалуйста, начните заново с команды /schedule");
      
      // Reset state
      if (ctx.session) {
        ctx.session.scheduleState = ScheduleState.IDLE;
      }
      return;
    }
    
    // Get schedule for the selected teacher
    // For simplicity, we'll get schedule for today and next few days
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // Format as YYYY-MM-DD
    }
    
    const schedule = await scheduleService.getTeacherSchedule(teacherId, dates);
    // We can reuse the same formatting method for teachers
    const scheduleMessage = scheduleService.formatSchedule(schedule);
    
    // Send the schedule
    await ctx.reply(scheduleMessage);
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  } catch (error) {
    console.error("Error in teacher schedule handler:", error);
    await ctx.reply("Произошла ошибка при получении расписания. Пожалуйста, попробуйте позже.");
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  }
}