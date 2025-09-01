import { UserState } from '../../schemas/User';
import { inlineKeyboards } from '../../utils/keyboards';
import { MyContext } from "../../schemas/User";

export class OtherSchedulesCommand {
  async execute(ctx: MyContext) {
    if (!ctx.session || ctx.session.state !== UserState.MainMenu) return;

    await ctx.reply('📅 Выбери какое расписание тебе нужно', {
      reply_markup: inlineKeyboards.otherSchedules
    });
  }
}