import { AbstractHearsCommand, CommandContext, CommandUtils } from "../../utils/index.js";
import { UserRole, UserState } from '../../schemas/User.js';
import { callbackIdBuild } from '../../utils/keyboards.js';
import { InlineKeyboard } from "grammy";

export class SettingsCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super(["Настройки"], utils);
  }

  async execute(ctx: CommandContext) {
    if (ctx.user?.state !== UserState.MainMenu) return;

    const isStudent = ctx.user?.role !== UserRole.Teacher;

    const settingsButtons = new InlineKeyboard()
      .text('Сменить роль', callbackIdBuild('settings', [ 'role' ]))
      .text(isStudent ? 'Сменить группу' : 'Сменить преподавателя',
        callbackIdBuild('settings', [ 'change_following' ]));
    
    // Add subgroup option for students
    if (isStudent && ctx.user?.selectedGroup) {
      settingsButtons.row().text('Сменить подгруппу', callbackIdBuild('settings', [ 'change_subgroup' ]));
    }

    await ctx.reply('⚙️ Выбери что хочешь настроить', {
      reply_markup: settingsButtons
    });
  }
}