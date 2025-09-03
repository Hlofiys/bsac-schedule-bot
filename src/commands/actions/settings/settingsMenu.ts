import { Composer } from "grammy";
import { EnhancedContext } from "../../../utils/context";
import { UserRole, UserState } from "../../../schemas/User";
import { callbackIdParse, inlineKeyboards, replyKeyboards } from "../../../utils/keyboards";
import { InlineKeyboard } from "grammy";

export const settingsMenuHandler = new Composer<EnhancedContext>();

settingsMenuHandler.callbackQuery(/settings.*/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  
  // If match is an array (from regex), get the full match string
  const matchString = Array.isArray(match) ? match[0] : match;
  const [, ...args] = callbackIdParse(matchString);
  const [settingName, chosenRole] = args;
  
  if (!ctx.user) return;

  switch (settingName) {
    case 'role': {
      if (chosenRole?.length) {
        const role = chosenRole === 'teacher' ? UserRole.Teacher : UserRole.Student;
        ctx.user.role = role;
        ctx.user.state = UserState.AskingFollowingEntity;
        // Clear selections
        ctx.user.selectedGroup = undefined;
        ctx.user.selectedTeacher = undefined;
        ctx.user.selectedSubject = undefined;
        ctx.user.subgroup = undefined;
        // Clear temporary arrays
        ctx.user.choosing_groups = [];
        ctx.user.choosing_teachers = [];
        await ctx.user.save();
        
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
      ctx.user.state = UserState.AskingFollowingEntity;
      // Clear previous selections
      ctx.user.selectedGroup = undefined;
      ctx.user.selectedTeacher = undefined;
      ctx.user.selectedSubject = undefined;
      ctx.user.subgroup = undefined;
      // Clear temporary arrays
      ctx.user.choosing_groups = [];
      ctx.user.choosing_teachers = [];
      await ctx.user.save();
      
      const isStudent = ctx.user.role !== UserRole.Teacher;
      const askingText = isStudent
        ? 'Напиши номер группы'
        : 'Напиши инициалы преподавателя или их часть';
      
      return await ctx.editMessageText('🤺 ' + askingText);
    }
    case 'change_subgroup': {
      if (ctx.user.role !== UserRole.Teacher && ctx.user.selectedGroup) {
        ctx.user.state = UserState.AskingSubgroup;
        await ctx.user.save();
        
        await ctx.editMessageText('🔢 Выбери свою подгруппу:');
        return await ctx.reply('Выбери подгруппу:', {
          reply_markup: replyKeyboards[UserState.AskingSubgroup]
        });
      }
      
      return await ctx.editMessageText('❌ Ошибка: подгруппу можно менять только студентам с выбранной группой.');
    }
 }
});