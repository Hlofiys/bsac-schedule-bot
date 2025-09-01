import { UserRole, UserState } from '../../schemas/User';
import { callbackIdBuild } from '../../utils/keyboards';
import { MyContext } from "../../schemas/User";
import { InlineKeyboard } from "grammy";

export class SettingsCommand {
  async execute(ctx: MyContext) {
    if (!ctx.session || ctx.session.state !== UserState.MainMenu) return;

    const isStudent = ctx.session.role !== UserRole.Teacher;

    const settingsButtons = new InlineKeyboard()
      .text('Сменить роль', callbackIdBuild('settings', [ 'role' ]))
      .text(isStudent ? 'Сменить группу' : 'Сменить преподавателя',
        callbackIdBuild('settings', [ 'change_following' ]));

    await ctx.reply('⚙️ Выбери что хочешь настроить', {
      reply_markup: settingsButtons
    });
  }
}