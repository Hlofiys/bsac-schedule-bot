import { Composer } from "grammy";
import { EnhancedContext } from "../../../utils/context.js";
import { UserRole, UserState } from "../../../schemas/User.js";
import { callbackIdParse, replyKeyboards } from "../../../utils/keyboards.js";

export const selectEntityHandler = new Composer<EnhancedContext>();

selectEntityHandler.callbackQuery(/select_entity.*/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  
  // If match is an array (from regex), get the full match string
  const matchString = Array.isArray(match) ? match[0] : match;
  const [, ...args] = callbackIdParse(matchString);
  
  if (!ctx.user) return;
  const isStudent = ctx.user.role !== UserRole.Teacher;
  
  if (isStudent) {
    // Handle group selection
    const groupId = args[0]; // Keep as string for new API
    if (!groupId) {
      ctx.user.choosing_groups = [];
      ctx.user.state = UserState.AskingFollowingEntity;
      await ctx.user.save();
      
      return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе группы. Попробуй поискать новую группу, отправив её номер');
    }
    
    // Update user with selected group and ask for subgroup
    try {
      ctx.user.selectedGroup = groupId;
      ctx.user.choosing_groups = [];
      ctx.user.choosing_teachers = [];
      ctx.user.selectedTeacher = undefined;
      ctx.user.state = UserState.AskingSubgroup;
      await ctx.user.save();
      
      await ctx.deleteMessage().catch(() => {});
      
      await ctx.reply(`🫔 Выбрана группа *${groupId}*`);
      return await ctx.reply('🔢 Теперь выбери свою подгруппу:', {
        reply_markup: replyKeyboards[UserState.AskingSubgroup]
      });
    } catch (error) {
      console.error("Error selecting group:", error);
      return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе группы. Попробуй поискать новую группу, отправив её номер');
    }
  } else {
    // Handle teacher selection
    const teacherName = args[0];
    if (!teacherName) {
      ctx.user.choosing_teachers = [];
      ctx.user.state = UserState.AskingFollowingEntity;
      await ctx.user.save();
      return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе преподавателя. Попробуй поискать другого');
    }
    
    // Update user with selected teacher
    ctx.user.selectedTeacher = teacherName;
    ctx.user.choosing_teachers = [];
    ctx.user.choosing_groups = [];
    ctx.user.selectedGroup = undefined;
    ctx.user.state = UserState.MainMenu;
    await ctx.user.save();
    
    await ctx.deleteMessage().catch(() => {});
    
    return await ctx.reply(`🕺 Выбран преподаватель *${teacherName.replace(/\\./g, '\\\\.')}*`, {
      reply_markup: replyKeyboards[UserState.MainMenu]
    });
  }
});