import { Bot, session } from "grammy";
import dotenv from "dotenv";
import { MyContext, UserState, IUser, UserRole } from "./schemas/User";
import { StartCommand } from "./commands/slash/start";
import { SettingsCommand } from "./commands/hears/settings";
import { OtherSchedulesCommand } from "./commands/hears/otherSchedules";
import { DayScheduleCommand } from "./commands/hears/daySchedule";
import { WeekScheduleCommand } from "./commands/hears/weekSchedule";
import { weeksHandler } from "./commands/actions/schedule/weeks";
import { settingsHandler } from "./commands/actions/settings";
import { classroomScheduleMasterHandler } from "./commands/actions/schedule/classrooms";
import { subjectScheduleMasterHandler } from "./commands/actions/schedule/subjects";
import { freeStorage } from "@grammyjs/storage-free";
import { ScheduleService } from "./services/scheduleService";

// Load environment variables
dotenv.config();

// Create a bot instance
const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN is not set in environment variables");
}

const bot = new Bot<MyContext>(token);

// Install session middleware
bot.use(session({
  initial: () => ({
    telegramId: 0,
    state: UserState.AskingFollowingEntity,
    choosing_groups: [],
    choosing_teachers: []
  } as IUser)
}));

// Create command instances
const startCommand = new StartCommand();
const settingsCommand = new SettingsCommand();
const otherSchedulesCommand = new OtherSchedulesCommand();
const dayScheduleCommand = new DayScheduleCommand();
const weekScheduleCommand = new WeekScheduleCommand();

// Register command handlers
bot.command("start", (ctx) => startCommand.execute(ctx));

// Handle text messages for hears commands
bot.hears("Сегодня", (ctx) => dayScheduleCommand.execute(ctx));
bot.hears("Завтра", (ctx) => dayScheduleCommand.execute(ctx));
bot.hears("Неделя", (ctx) => weekScheduleCommand.execute(ctx));
bot.hears("Другие расписания", (ctx) => otherSchedulesCommand.execute(ctx));
bot.hears("Настройки", (ctx) => settingsCommand.execute(ctx));

// Handle callback queries
bot.use(weeksHandler);
bot.use(settingsHandler);
bot.use(classroomScheduleMasterHandler);
bot.use(subjectScheduleMasterHandler);

// Handle text messages
bot.on("message:text", async (ctx) => {
  if (!ctx.session) return;
  
  // Handle different states
  switch (ctx.session.state) {
    case UserState.AskingFollowingEntity: {
      // Handle group or teacher input
      if (ctx.session.role === undefined) {
        await ctx.reply("Пожалуйста, сначала выберите роль (студент или преподаватель).");
        return;
      }
      
      // Process the user's group or teacher input
      if (ctx.session.role === UserRole.Student) {
        // Handle student group input
        const groupNumber = ctx.message.text.trim();
        if (groupNumber) {
          try {
            // Fetch the real group ID from the API
            const scheduleService = new ScheduleService();
            const groups = await scheduleService.getAllGroups();
            const group = groups.find((g: any) => g.groupNumber === groupNumber);
            
            if (group && group.id !== undefined) {
              // Save the group information to session
              ctx.session.group = { id: group.id, groupNumber };
              ctx.session.state = UserState.MainMenu;
              await ctx.reply(`Спасибо! Теперь я буду показывать расписание для группы ${groupNumber}.`);
            } else {
              await ctx.reply(`Группа ${groupNumber} не найдена. Пожалуйста, введите правильный номер группы.`);
              return;
            }
          } catch (error) {
            console.error("Error fetching group information:", error);
            await ctx.reply("Произошла ошибка при поиске группы. Пожалуйста, попробуйте позже.");
            return;
          }
        } else {
          await ctx.reply("Пожалуйста, введите номер группы.");
          return;
        }
      } else {
        // Handle teacher name input
        const teacherName = ctx.message.text.trim();
        if (teacherName) {
          // Save the teacher name to session
          ctx.session.teacher_name = teacherName;
          ctx.session.state = UserState.MainMenu;
          await ctx.reply(`Спасибо! Теперь я буду показывать расписание для преподавателя ${teacherName}.`);
        } else {
          await ctx.reply("Пожалуйста, введите инициалы преподавателя.");
          return;
        }
      }
      break;
    }
    case UserState.AskingWeekGroup:
    case UserState.AskingWeekTeacher: {
      // Handle week schedule input
      await ctx.reply("Спасибо за информацию! Вы можете использовать меню для дальнейших действий.");
      ctx.session.state = UserState.MainMenu;
      break;
    }
    default: {
      // Regular message handling
      await ctx.reply("❌ Извините, я не понимаю эту команду. Используйте меню для взаимодействия с ботом.");
    }
  }
});

// Error handling
bot.catch((err) => {
  console.error("Error in bot:", err);
});

// Start the bot
bot.start();

console.log("BSAC Schedule Bot is running...");