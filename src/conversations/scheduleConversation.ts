import { Context, InlineKeyboard } from "grammy";
import { ScheduleService } from "../services/scheduleService";
import { MyContext } from "../schemas/User";

// Define conversation states
export enum ScheduleState {
  IDLE = "idle",
  AWAITING_CHOICE = "awaiting_choice",
  AWAITING_GROUP_ID = "awaiting_group_id",
  AWAITING_TEACHER_ID = "awaiting_teacher_id"
}

// Extend the main session data with conversation-specific fields
declare module "../schemas/User" {
  interface IUser {
    scheduleState?: ScheduleState;
    selectedGroupId?: number;
    selectedTeacherId?: number;
  }
}

const API_BASE_URL = process.env.API_BASE_URL || "https://bsac.hlofiys.xyz";
const scheduleService = new ScheduleService();

// Function to start the schedule conversation
export async function startScheduleConversation(ctx: MyContext) {
  // Initialize session conversation state
  if (ctx.session) {
    ctx.session.scheduleState = ScheduleState.AWAITING_CHOICE;
  }
  
  const scheduleMessage = `
📅 Для получения расписания, пожалуйста, выберите один из вариантов:
  `.trim();

  // Create inline keyboard with options
  const keyboard = new InlineKeyboard()
    .text("👥 Расписание для группы", "group_schedule")
    .row()
    .text("👨‍🏫 Расписание для преподавателя", "teacher_schedule");

  await ctx.reply(scheduleMessage, { reply_markup: keyboard });
}

// Function to handle user responses during the schedule conversation
export async function handleScheduleResponse(ctx: MyContext) {
  // If no session or not in a schedule conversation, ignore
  if (!ctx.session || ctx.session.scheduleState === ScheduleState.IDLE) {
    return;
  }
  
  const userInput = ctx.message?.text;
  if (!userInput) return;
  
  // Handle text input for group/teacher ID if needed
  switch (ctx.session.scheduleState) {
    case ScheduleState.AWAITING_GROUP_ID:
      await handleGroupInput(ctx, userInput);
      break;
      
    case ScheduleState.AWAITING_TEACHER_ID:
      await handleTeacherInput(ctx, userInput);
      break;
  }
}

// Function to handle group input and find similar matches
async function handleGroupInput(ctx: MyContext, input: string) {
  try {
    // Get all groups
    const groups = await scheduleService.getAllGroups();
    
    // Filter groups that match the input
    const matchingGroups = groups.filter(group =>
      group.groupNumber && group.groupNumber.includes(input)
    );
    
    if (matchingGroups.length === 0) {
      await ctx.reply("❌ Группа не найдена. Пожалуйста, проверьте введенный номер группы.");
      return;
    }
    
    if (matchingGroups.length === 1) {
      // If only one match, directly get the schedule
      await handleGroupScheduleRequest(ctx, matchingGroups[0].id!);
      return;
    }
    
    // If multiple matches, show buttons for selection
    const keyboard = new InlineKeyboard();
    for (const group of matchingGroups) {
      keyboard.text(`👥 ${group.groupNumber || 'Не указано'}`, `select_group_${group.id}`).row();
    }
    
    // Add a back button
    keyboard.text("⬅️ Назад", "back_to_main");
    
    await ctx.reply("Найдено несколько групп. Пожалуйста, выберите нужную:", { reply_markup: keyboard });
  } catch (error) {
    console.error("Error in group input handler:", error);
    await ctx.reply("❌ Произошла ошибка. Пожалуйста, попробуйте позже.");
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  }
}

// Function to handle teacher input and find similar matches
async function handleTeacherInput(ctx: MyContext, input: string) {
  try {
    // Get all teachers
    const teachers = await scheduleService.getAllTeachers();
    
    // Filter teachers that match the input (case insensitive)
    const matchingTeachers = teachers.filter(teacher =>
      teacher.fio && teacher.fio.toLowerCase().includes(input.toLowerCase())
    );
    
    if (matchingTeachers.length === 0) {
      await ctx.reply("❌ Преподаватель не найден. Пожалуйста, проверьте введенную фамилию.");
      return;
    }
    
    if (matchingTeachers.length === 1) {
      // If only one match, directly get the schedule
      await handleTeacherScheduleRequest(ctx, matchingTeachers[0].id!);
      return;
    }
    
    // If multiple matches, show buttons for selection
    const keyboard = new InlineKeyboard();
    for (const teacher of matchingTeachers) {
      keyboard.text(`👨‍🏫 ${teacher.fio || 'Не указано'}`, `select_teacher_${teacher.id}`).row();
    }
    
    // Add a back button
    keyboard.text("⬅️ Назад", "back_to_main");
    
    await ctx.reply("Найдено несколько преподавателей. Пожалуйста, выберите нужного:", { reply_markup: keyboard });
  } catch (error) {
    console.error("Error in teacher input handler:", error);
    await ctx.reply("❌ Произошла ошибка. Пожалуйста, попробуйте позже.");
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  }
}

export async function handleGroupChoice(ctx: MyContext) {
  try {
    await ctx.reply("👥 Пожалуйста, введите номер вашей группы (например, 123):");
    
    // Update state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.AWAITING_GROUP_ID;
    }
  } catch (error) {
    console.error("Error in group choice handler:", error);
    await ctx.reply("❌ Произошла ошибка. Пожалуйста, попробуйте позже.");
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  }
}

export async function handleTeacherChoice(ctx: MyContext) {
  try {
    await ctx.reply("👨‍🏫 Пожалуйста, введите фамилию преподавателя:");
    
    // Update state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.AWAITING_TEACHER_ID;
    }
  } catch (error) {
    console.error("Error in teacher choice handler:", error);
    await ctx.reply("❌ Произошла ошибка. Пожалуйста, попробуйте позже.");
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  }
}

export async function handleGroupScheduleRequest(ctx: MyContext, groupId: number) {
  try {
    // Get all groups to validate the selected group
    const groups = await scheduleService.getAllGroups();
    const selectedGroup = groups.find(group => group.id === groupId);
    
    if (!selectedGroup) {
      await ctx.reply("❌ Неверный ID группы. Пожалуйста, начните заново с команды /schedule");
      
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
    const scheduleMessage = scheduleService.formatSchedule(schedule, ctx.session?.subgroup);
    
    // Send the schedule
    await ctx.reply(scheduleMessage);
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  } catch (error) {
    console.error("Error in group schedule handler:", error);
    await ctx.reply("❌ Произошла ошибка при получении расписания. Пожалуйста, попробуйте позже.");
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  }
}

export async function handleTeacherScheduleRequest(ctx: MyContext, teacherId: number) {
  try {
    // Get all teachers to validate the selected teacher
    const teachers = await scheduleService.getAllTeachers();
    const selectedTeacher = teachers.find(teacher => teacher.id === teacherId);
    
    if (!selectedTeacher) {
      await ctx.reply("❌ Неверный ID преподавателя. Пожалуйста, начните заново с команды /schedule");
      
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
    await ctx.reply("❌ Произошла ошибка при получении расписания. Пожалуйста, попробуйте позже.");
    
    // Reset state
    if (ctx.session) {
      ctx.session.scheduleState = ScheduleState.IDLE;
    }
  }
}