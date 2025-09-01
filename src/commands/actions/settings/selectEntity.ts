import { Composer } from "grammy";
import { MyContext, UserRole, UserState } from "../../../schemas/User";
import { callbackIdParse } from "../../../utils/keyboards";
import { ScheduleService } from "../../../services/scheduleService";
import { InlineKeyboard } from "grammy";
import { replyKeyboards } from "../../../utils/keyboards";

export const selectEntityHandler = new Composer<MyContext>();

const scheduleService = new ScheduleService();

selectEntityHandler.callbackQuery(/select_entity.*/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  
  // If match is an array (from regex), get the full match string
  const matchString = Array.isArray(match) ? match[0] : match;
  const [, ...args] = callbackIdParse(matchString);
  
  if (!ctx.session) return;
  const isStudent = ctx.session.role !== UserRole.Teacher;
  
  if (isStudent) {
    // Handle group selection
    const groupId = parseInt(args[0]);
    if (isNaN(groupId)) {
      ctx.session.choosing_groups = [];
      ctx.session.state = UserState.AskingFollowingEntity;
      
      return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе группы. Попробуй поискать новую группу, отправив её номер');
    }
    
    // Get group info
    try {
      const groups = await scheduleService.getAllGroups();
      const selectedGroup = groups.find(g => g.id === groupId);
      
      if (!selectedGroup) {
        ctx.session.choosing_groups = [];
        ctx.session.state = UserState.AskingFollowingEntity;
        return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе группы. Попробуй поискать новую группу, отправив её номер');
      }
      
      // Update session with selected group
      ctx.session.choosing_groups = [];
      ctx.session.choosing_teachers = [];
      ctx.session.teacher_name = undefined;
      ctx.session.group = { id: selectedGroup.id!, groupNumber: selectedGroup.groupNumber || '' };
      ctx.session.state = UserState.MainMenu;
      
      await ctx.deleteMessage().catch(() => {});
      
      return await ctx.reply(`🫔 Выбрана группа *${selectedGroup.groupNumber}*`, {
        reply_markup: replyKeyboards[UserState.MainMenu]
      });
    } catch (error) {
      console.error("Error selecting group:", error);
      return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе группы. Попробуй поискать новую группу, отправив её номер');
    }
  } else {
    // Handle teacher selection
    const teacherName = args[0];
    if (!teacherName) {
      ctx.session.choosing_teachers = [];
      ctx.session.state = UserState.AskingFollowingEntity;
      return await ctx.reply('😵‍💫 Кажется произошла какая-то ошибка при выборе преподавателя. Попробуй поискать другого');
    }
    
    // Update session with selected teacher
    ctx.session.choosing_teachers = [];
    ctx.session.choosing_groups = [];
    ctx.session.group = undefined;
    ctx.session.teacher_name = teacherName;
    ctx.session.state = UserState.MainMenu;
    
    await ctx.deleteMessage().catch(() => {});
    
    return await ctx.reply(`🕺 Выбран преподаватель *${teacherName.replace(/\./g, '\\.')}*`, {
      reply_markup: replyKeyboards[UserState.MainMenu]
    });
  }
});