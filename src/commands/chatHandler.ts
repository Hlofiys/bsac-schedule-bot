import { Composer } from "grammy";
import { EnhancedContext } from "../utils/context";
import { UserRole, UserState } from "../schemas/User";
import { replyKeyboards, batchButtons, callbackIdBuild, inlineKeyboards } from "../utils/keyboards";
import { InlineKeyboard } from "grammy";
import { ScheduleApi } from "../api/ScheduleApi";

export const chatHandler = new Composer<EnhancedContext>();

chatHandler.on("message:text", async (ctx, next) => {
  if (!ctx.user) return;

  // Handle new user setup
  if (ctx.newUser) {
    await ctx.reply(
      "👋 Добро пожаловать в бот расписания БГАС!\n\n" +
      "Для начала работы выберите свою роль:",
      {
        reply_markup: inlineKeyboards.chooseRole
      }
    );
    return;
  }

  // Only handle specific states, let other messages pass through to hears commands
  if (ctx.user.state === UserState.AskingFollowingEntity) {
    const searchText = ctx.message.text;
    
    if (searchText.length < 2) {
      return await ctx.reply("😨 Давай конкретнее, слишком маленький запрос");
    }

    const isStudent = ctx.user.role !== UserRole.Teacher;
    
    if (isStudent) {
      // Handle group search
      try {
        const scheduleApi = new ScheduleApi(process.env.API_BASE_URL!);
        // Try both with and without search parameter to see if API search works
        const allGroups = await scheduleApi.getGroups({ limit: 100 });
        
        // Filter groups client-side to ensure proper matching
        const searchLower = searchText.toLowerCase();
        let groups = allGroups.filter(g => 
          g.groupNumber?.toLowerCase().includes(searchLower)
        );

        // Sort by relevance: exact matches first, then starts with, then contains
        groups.sort((a, b) => {
          const aGroup = a.groupNumber?.toLowerCase() || '';
          const bGroup = b.groupNumber?.toLowerCase() || '';
          
          // Exact match gets highest priority
          if (aGroup === searchLower) return -1;
          if (bGroup === searchLower) return 1;
          
          // Starts with gets second priority
          if (aGroup.startsWith(searchLower) && !bGroup.startsWith(searchLower)) return -1;
          if (bGroup.startsWith(searchLower) && !aGroup.startsWith(searchLower)) return 1;
          
          // Otherwise alphabetical
          return aGroup.localeCompare(bGroup);
        });

        // Limit results to top 10 most relevant
        groups = groups.slice(0, 10);
        
        if (groups.length === 0) {
          return await ctx.reply("🩼 Таких групп я не видал. Попробуй другой номер");
        }

        // If only one group found, select it automatically
        if (groups.length === 1) {
          const group = groups[0];
          ctx.user.selectedGroup = group.id?.toString() || searchText;
          ctx.user.choosing_groups = [];
          ctx.user.choosing_teachers = [];
          ctx.user.selectedTeacher = undefined;
          ctx.user.state = UserState.AskingSubgroup;
          await ctx.user.save();
          
          await ctx.reply(`🫔 Выбрана группа *${group.groupNumber || searchText}*`, { parse_mode: "Markdown" });
          return await ctx.reply('🔢 Теперь выбери свою подгруппу:', {
            reply_markup: replyKeyboards[UserState.AskingSubgroup]
          });
        }

        // Multiple groups found, show selection
        ctx.user.choosing_groups = groups.map(g => ({ 
          id: g.id || 0, 
          groupNumber: g.groupNumber || searchText 
        }));
        ctx.user.state = UserState.ChoosingFollowingEntity;
        await ctx.user.save();

        const buttons = batchButtons(
          groups.map(g => 
            InlineKeyboard.text(g.groupNumber || 'Группа', callbackIdBuild("select_entity", [g.id?.toString() || searchText]))
          )
        );

        return await ctx.reply("👞 Найдено несколько групп, выбери нужную:", {
          reply_markup: buttons
        });

      } catch (error) {
        console.error("Error searching groups:", error);
        return await ctx.reply("🏌️‍♂️ ГООООООЛ выбор группы пока недоступен, напиши свою группу чуть позже");
      }
    } else {
      // Handle teacher search
      try {
        const scheduleApi = new ScheduleApi(process.env.API_BASE_URL!);
        const teachers = await scheduleApi.getTeachers({ search: searchText, limit: 10 });

        if (teachers.length === 0) {
          return await ctx.reply("🫐 Таких я не видал. Попробуй написать другого преподавателя");
        }

        ctx.user.choosing_teachers = teachers.map(t => t.fio || searchText);
        ctx.user.state = UserState.ChoosingFollowingEntity;
        await ctx.user.save();

        const buttons = batchButtons(
          teachers.map(t => 
            InlineKeyboard.text(t.fio || 'Преподаватель', callbackIdBuild("select_entity", [t.fio || searchText]))
          )
        );

        await ctx.reply("👞 Выбери преподавателя", {
          reply_markup: buttons
        });

        await ctx.reply("🤨", {
          reply_markup: replyKeyboards[ctx.user.state]
        });

      } catch (error) {
        console.error("Error searching teachers:", error);
        return await ctx.reply("🫐 Поиск преподавателей временно недоступен");
      }
    }
    return;
  }

  // Handle subgroup selection
  if (ctx.user.state === UserState.AskingSubgroup) {
    const subgroupText = ctx.message.text;
    
    if (subgroupText === "1" || subgroupText === "2") {
      ctx.user.subgroup = parseInt(subgroupText);
      ctx.user.state = UserState.MainMenu;
      await ctx.user.save();

      await ctx.reply(`✅ Подгруппа ${subgroupText} выбрана!`, {
        reply_markup: replyKeyboards[UserState.MainMenu]
      });
    } else if (subgroupText === "Отмена") {
      ctx.user.state = UserState.MainMenu;
      await ctx.user.save();

      await ctx.reply("❌ Отменено", {
        reply_markup: replyKeyboards[UserState.MainMenu]
      });
    } else {
      await ctx.reply("🔢 Пожалуйста, выберите 1 или 2");
    }
    return;
  }

  // Handle week group/teacher search
  if (ctx.user.state === UserState.AskingWeekGroup) {
    const searchText = ctx.message.text;
    
    if (searchText.length < 2) {
      return await ctx.reply("😨 Давай конкретнее, слишком маленький запрос");
    }

    // Mock group search for week schedule
    const mockGroups = [
      { id: searchText, display: searchText }
    ];

    if (mockGroups.length === 0) {
      return await ctx.reply("🥺 Такой группы не нашлось. Попробуй другой номер группы");
    }

    ctx.user.state = UserState.MainMenu;
    await ctx.user.save();

    await ctx.reply("🤨", {
      reply_markup: replyKeyboards[ctx.user.state]
    });

    const buttons = batchButtons(
      mockGroups.map(g => 
        InlineKeyboard.text(g.display, callbackIdBuild("group_week", [g.id]))
      ),
      3
    );

    await ctx.reply("🍍 Выбери группу", {
      reply_markup: buttons
    });
    return;
  }

  if (ctx.user.state === UserState.AskingWeekTeacher) {
    const searchText = ctx.message.text;
    
    if (searchText.length < 3) {
      return await ctx.reply("😨 Давай конкретнее, слишком маленький запрос");
    }

    // Mock teacher search for week schedule
    const mockTeachers = [searchText, searchText + " И.И."];

    if (mockTeachers.length === 0) {
      return await ctx.reply("🥺 Такого преподавателя не нашлось. Попробуй написать по-другому");
    }

    ctx.user.state = UserState.MainMenu;
    await ctx.user.save();

    await ctx.reply("🤨", {
      reply_markup: replyKeyboards[ctx.user.state]
    });

    const buttons = batchButtons(
      mockTeachers.map(t => 
        InlineKeyboard.text(t, callbackIdBuild("teacher_week", [t]))
      ),
      3
    );

    await ctx.reply("🍍 Выбери преподавателя", {
      reply_markup: buttons
    });
    return;
  }

  // Let other messages pass through to hears commands
  await next();
});