import { Composer } from "grammy";
import { MyContext, UserRole, UserState } from "../../../schemas/User";
import { callbackIdParse, inlineKeyboards } from "../../../utils/keyboards";
import { InlineKeyboard } from "grammy";
import { ScheduleService } from "../../../services/scheduleService";

export const settingsMenuHandler = new Composer<MyContext>();

const scheduleService = new ScheduleService();

settingsMenuHandler.callbackQuery(/settings.*/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  
  // If match is an array (from regex), get the full match string
  const matchString = Array.isArray(match) ? match[0] : match;
  const [, ...args] = callbackIdParse(matchString);
  const [settingName, chosenRole] = args;
  
  if (!ctx.session) return;

  switch (settingName) {
    case 'role': {
      if (chosenRole?.length) {
        const role = chosenRole === 'teacher' ? UserRole.Teacher : UserRole.Student;
        ctx.session.role = role;
        ctx.session.state = UserState.AskingFollowingEntity;
        // Initialize choosing arrays
        ctx.session.choosing_groups = [];
        ctx.session.choosing_teachers = [];
        ctx.session.group = undefined;
        ctx.session.teacher_name = undefined;
        
        const askingText = role === UserRole.Student
          ? 'Теперь напиши свою группу'
          : 'Теперь напиши инициалы преподавателя (или их часть)';
        
        // Remove keyboard
        await ctx.reply('🤨', {
          reply_markup: new InlineKeyboard()
        });
        
        return await ctx.editMessageText('🦫 ' + askingText);
      }
      
      return await ctx.editMessageText('🤸 Выбери новую роль', {
        reply_markup: inlineKeyboards.chooseRole
      });
    }
    case 'change_following': {
      ctx.session.state = UserState.AskingFollowingEntity;
      // Clear previous selections
      ctx.session.choosing_groups = [];
      ctx.session.choosing_teachers = [];
      ctx.session.group = undefined;
      ctx.session.teacher_name = undefined;
      
      const isStudent = ctx.session.role !== UserRole.Teacher;
      const askingText = isStudent
        ? 'Напиши номер группы'
        : 'Напиши инициалы преподавателя или их часть';
      
      return await ctx.editMessageText('🤺 ' + askingText);
    }
 }
});