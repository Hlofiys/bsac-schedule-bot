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
import { FileAdapter } from "@grammyjs/storage-file";
import { ScheduleService } from "./services/scheduleService";
import { replyKeyboards } from "./utils/keyboards";

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
  } as IUser),
  storage: new FileAdapter<IUser>({
    dirName: "sessions",
  })
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
        await ctx.reply("🤔 Пожалуйста, сначала выберите роль (студент или преподаватель).");
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
            
            // Check if user is selecting from a list of multiple matches
            if (ctx.session.choosing_groups && ctx.session.choosing_groups.length > 0) {
              const selectedIndex = parseInt(groupNumber) - 1;
              if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < ctx.session.choosing_groups.length) {
                // User selected a group from the list
                const selectedGroup = ctx.session.choosing_groups[selectedIndex];
                ctx.session.group = { id: selectedGroup.id, groupNumber: selectedGroup.groupNumber };
                ctx.session.choosing_groups = [];
                ctx.session.state = UserState.AskingSubgroup;
                await ctx.reply(`🎉 Спасибо! Теперь выбери свою подгруппу:`, {
                  reply_markup: replyKeyboards[UserState.AskingSubgroup]
                });
                return;
              } else {
                // Invalid selection, show the list again
                let message = `❌ Неверный выбор. Пожалуйста, выберите номер группы из списка:\n\n`;
                message += ctx.session.choosing_groups.map((group, index) =>
                  `${index + 1}. ${group.groupNumber || 'Не указано'}`
                ).join('\n');
                message += '\n\nВведите номер группы из списка (например, 1, 2, 3...)';
                await ctx.reply(message);
                return;
              }
            }
            
            // Filter groups that match the input (case insensitive partial matching)
            const matchingGroups = groups.filter(group =>
              group.groupNumber && group.groupNumber.toLowerCase().includes(groupNumber.toLowerCase())
            );
            
            if (matchingGroups.length === 0) {
              await ctx.reply(`👻 Группа ${groupNumber} не найдена. Пожалуйста, введите правильный номер группы.`);
              return;
            } else if (matchingGroups.length === 1) {
              // If only one match, directly select it
              const group = matchingGroups[0];
              // Save the group information to session and ask for subgroup
              ctx.session.group = { id: group.id!, groupNumber: group.groupNumber || '' };
              ctx.session.state = UserState.AskingSubgroup;
              await ctx.reply(`🎉 Спасибо! Теперь выбери свою подгруппу:`, {
                reply_markup: replyKeyboards[UserState.AskingSubgroup]
              });
            } else {
              // If multiple matches, show buttons for selection
              let message = `📋 Найдено несколько групп по запросу "${groupNumber}". Пожалуйста, выберите нужную:\n\n`;
              message += matchingGroups.map((group, index) =>
                `${index + 1}. ${group.groupNumber || 'Не указано'}`
              ).join('\n');
              message += '\n\nВведите номер группы из списка (например, 1, 2, 3...)';
              
              // Store matching groups in session for later selection
              ctx.session.choosing_groups = matchingGroups.map(g => ({ id: g.id!, groupNumber: g.groupNumber || '' }));
              ctx.session.state = UserState.AskingFollowingEntity;
              
              await ctx.reply(message);
              return;
            }
          } catch (error) {
            console.error("Error fetching group information:", error);
            await ctx.reply("🤖 Произошла ошибка при поиске группы. Пожалуйста, попробуйте позже.");
            return;
          }
        } else {
          await ctx.reply("✏️ Пожалуйста, введите номер группы.");
          return;
        }
      } else {
        // Handle teacher name input
        const teacherName = ctx.message.text.trim();
        if (teacherName) {
          // Save the teacher name to session
          ctx.session.teacher_name = teacherName;
          ctx.session.state = UserState.MainMenu;
          await ctx.reply(`🎉 Спасибо! Теперь я буду показывать расписание для преподавателя ${teacherName}.`);
        } else {
          await ctx.reply("✏️ Пожалуйста, введите инициалы преподавателя.");
          return;
        }
      }
      break;
    }
    case UserState.AskingSubgroup: {
      // Handle subgroup selection
      const text = ctx.message.text.trim();
      
      if (text === "Отмена") {
        ctx.session.state = UserState.AskingFollowingEntity;
        await ctx.reply("↩️ Отменено. Введите номер группы заново.");
        return;
      }
      
      let subgroup: number;
      if (text === "1") {
        subgroup = 1;
      } else if (text === "2") {
        subgroup = 2;
      } else {
        await ctx.reply("🤔 Пожалуйста, выберите подгруппу из предложенных вариантов.");
        return;
      }
      
      ctx.session.subgroup = subgroup;
      ctx.session.state = UserState.MainMenu;
      
      await ctx.reply(`👻 Настройка завершена! Буду показывать расписание подгруппы ${subgroup} группы ${ctx.session.group?.groupNumber}.`, {
        reply_markup: replyKeyboards[UserState.MainMenu]
      });
      break;
    }
    case UserState.AskingWeekGroup: {
      // Handle week schedule group input
      const groupNumber = ctx.message.text.trim();
      if (groupNumber) {
        try {
          // Fetch the real group ID from the API
          const scheduleService = new ScheduleService();
          const groups = await scheduleService.getAllGroups();
          
          // Check if user is selecting from a list of multiple matches
          if (ctx.session.choosing_groups && ctx.session.choosing_groups.length > 0) {
            const selectedIndex = parseInt(groupNumber) - 1;
            if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < ctx.session.choosing_groups.length) {
              // User selected a group from the list
              const selectedGroup = ctx.session.choosing_groups[selectedIndex];
              ctx.session.group = { id: selectedGroup.id, groupNumber: selectedGroup.groupNumber };
              ctx.session.choosing_groups = [];
              ctx.session.state = UserState.MainMenu;
              await ctx.reply(`🎉 Спасибо! Теперь вы можете использовать меню для дальнейших действий.`);
              return;
            } else {
              // Invalid selection, show the list again
              let message = `❌ Неверный выбор. Пожалуйста, выберите номер группы из списка:\n\n`;
              message += ctx.session.choosing_groups.map((group, index) =>
                `${index + 1}. ${group.groupNumber || 'Не указано'}`
              ).join('\n');
              message += '\n\nВведите номер группы из списка (например, 1, 2, 3...)';
              await ctx.reply(message);
              return;
            }
          }
          
          // Filter groups that match the input (case insensitive partial matching)
          const matchingGroups = groups.filter(group =>
            group.groupNumber && group.groupNumber.toLowerCase().includes(groupNumber.toLowerCase())
          );
          
          if (matchingGroups.length === 0) {
            await ctx.reply(`👻 Группа ${groupNumber} не найдена. Пожалуйста, введите правильный номер группы.`);
            return;
          } else if (matchingGroups.length === 1) {
            // If only one match, directly select it
            const group = matchingGroups[0];
            // Save the group information to session
            ctx.session.group = { id: group.id!, groupNumber: group.groupNumber || '' };
            ctx.session.state = UserState.MainMenu;
            await ctx.reply(`🎉 Спасибо! Теперь вы можете использовать меню для дальнейших действий.`);
          } else {
            // If multiple matches, show buttons for selection
            let message = `📋 Найдено несколько групп по запросу "${groupNumber}". Пожалуйста, выберите нужную:\n\n`;
            message += matchingGroups.map((group, index) =>
              `${index + 1}. ${group.groupNumber || 'Не указано'}`
            ).join('\n');
            message += '\n\nВведите номер группы из списка (например, 1, 2, 3...)';
            
            // Store matching groups in session for later selection
            ctx.session.choosing_groups = matchingGroups.map(g => ({ id: g.id!, groupNumber: g.groupNumber || '' }));
            ctx.session.state = UserState.AskingWeekGroup;
            
            await ctx.reply(message);
            return;
          }
        } catch (error) {
          console.error("Error fetching group information:", error);
          await ctx.reply("🤖 Произошла ошибка при поиске группы. Пожалуйста, попробуйте позже.");
          return;
        }
      } else {
        await ctx.reply("✏️ Пожалуйста, введите номер группы.");
        return;
      }
      break;
    }
    case UserState.AskingWeekTeacher: {
      // Handle week schedule teacher input
      await ctx.reply("🎉 Спасибо за информацию! Вы можете использовать меню для дальнейших действий.");
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