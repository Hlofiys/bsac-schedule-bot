import { InlineKeyboard } from "grammy";
import { UserRole, UserState } from '../../schemas/User';
import { inlineKeyboards, replyKeyboards } from '../../utils/keyboards';
import { MyContext } from "../../schemas/User";

export class StartCommand {
  async execute(ctx: MyContext) {
    // Check if this is a new user
    const isNewUser = !ctx.session || ctx.session.state === UserState.AskingFollowingEntity;
    
    if (isNewUser && ctx.session) {
      // For new users, the session is already initialized with AskingFollowingEntity state
      // We just need to send the initial messages
      await ctx.reply('🍉 Привет! Я бот расписания БГАС.\nТолько мне для этого нужно знать кто ты 😫');
      return await ctx.reply('🤨 Давай определимся от какого лица ты тут', {
        reply_markup: inlineKeyboards.chooseRole
      });
    }
  
    // Existing user
    if (!ctx.session) return;
    const state = ctx.session.state;
  
    switch (state) {
      case UserState.MainMenu: {
        return await ctx.reply('🍉 Хватай меню', {
          reply_markup: replyKeyboards[UserState.MainMenu]
        });
      }
      case UserState.AskingFollowingEntity: {
        const askingText = ctx.session.role !== UserRole.Teacher
          ? 'Погоди, я пока жду от тебя номер группы'
          : 'Погоди, я пока жду от тебя инициалы преподавателя';
        return await ctx.reply('🍆 ' + askingText, {
          reply_markup: replyKeyboards[UserState.AskingFollowingEntity]
        });
      }
      case UserState.ChoosingFollowingEntity: {
        // Implementation will be completed when we add the full entity selection functionality
        if (ctx.session.role !== undefined) {
          return await ctx.reply('👞 Выбери ' + (ctx.session.role === UserRole.Teacher ? 'преподавателя' : 'группу'));
        }
        break;
      }
      case UserState.AskingWeekGroup: {
        await ctx.reply('🥥 Напиши номер группы, расписание которой ты хочешь узнать', {
          reply_markup: replyKeyboards[UserState.AskingWeekGroup]
        });
        return;
      }
      case UserState.AskingWeekTeacher: {
        await ctx.reply('📛 Напиши инициалы преподавателя, расписание которого ты хочешь узнать', {
          reply_markup: replyKeyboards[UserState.AskingWeekTeacher]
        });
        return;
      }
    }
  }
}