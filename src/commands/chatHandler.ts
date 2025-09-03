import { Composer } from "grammy";
import { EnhancedContext } from "../utils/context";
import { UserRole, UserState } from "../schemas/User";
import { replyKeyboards, batchButtons, callbackIdBuild } from "../utils/keyboards";
import { InlineKeyboard } from "grammy";

export const chatHandler = new Composer<EnhancedContext>();

chatHandler.on("message:text", async (ctx) => {
  if (!ctx.user) return;

  // Handle new user setup
  if (ctx.newUser) {
    await ctx.reply(
      "👋 Добро пожаловать в бот расписания БГЭУ!\n\n" +
      "Для начала работы выберите свою роль:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "👨‍🎓 Студент", callback_data: "role:student" },
              { text: "👨‍🏫 Преподаватель", callback_data: "role:teacher" }
            ]
          ]
        }
      }
    );
    return;
  }

  // Handle entity selection states
  if (ctx.user.state === UserState.AskingFollowingEntity) {
    const searchText = ctx.message.text;
    
    if (searchText.length < 2) {
      return await ctx.reply("😨 Давай конкретнее, слишком маленький запрос");
    }

    const isStudent = ctx.user.role !== UserRole.Teacher;
    
    if (isStudent) {
      // Handle group search
      try {
        // For now, create a mock group selection
        // In real implementation, you would call the API to search groups
        const mockGroups = [
          { id: searchText, name: searchText },
          { id: searchText + "А", name: searchText + "А" },
          { id: searchText + "Б", name: searchText + "Б" }
        ];

        if (mockGroups.length === 0) {
          return await ctx.reply("🩼 Таких групп я не видал. Попробуй другой номер");
        }

        ctx.user.choosing_groups = mockGroups.map(g => ({ id: parseInt(g.id) || 0, groupNumber: g.name }));
        ctx.user.state = UserState.ChoosingFollowingEntity;
        await ctx.user.save();

        const buttons = batchButtons(
          mockGroups.map(g => 
            InlineKeyboard.text(g.name, callbackIdBuild("select_entity", [g.id]))
          )
        );

        await ctx.reply("👞 Выбери группу", {
          reply_markup: buttons
        });

        await ctx.reply("🤨", {
          reply_markup: replyKeyboards[ctx.user.state]
        });

      } catch (error) {
        console.error("Error searching groups:", error);
        return await ctx.reply("🏌️‍♂️ ГООООООЛ выбор группы пока недоступен, напиши свою группу чуть позже");
      }
    } else {
      // Handle teacher search
      try {
        // For now, create a mock teacher selection
        // In real implementation, you would call the API to search teachers
        const mockTeachers = [
          searchText,
          searchText + " И.И.",
          searchText + " П.П."
        ];

        if (mockTeachers.length === 0) {
          return await ctx.reply("🫐 Таких я не видал. Попробуй написать другого преподавателя");
        }

        ctx.user.choosing_teachers = mockTeachers;
        ctx.user.state = UserState.ChoosingFollowingEntity;
        await ctx.user.save();

        const buttons = batchButtons(
          mockTeachers.map(t => 
            InlineKeyboard.text(t, callbackIdBuild("select_entity", [t]))
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
  }
});