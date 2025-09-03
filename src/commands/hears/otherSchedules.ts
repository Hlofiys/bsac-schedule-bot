import { AbstractHearsCommand, CommandContext, CommandUtils } from "../../utils";
import { UserState } from '../../schemas/User';
import { inlineKeyboards } from '../../utils/keyboards';

export class OtherSchedulesCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super(["Другие расписания"], utils);
  }

  async execute(ctx: CommandContext) {
    if (ctx.user?.state !== UserState.MainMenu) return;

    await ctx.reply('📅 Выбери какое расписание тебе нужно', {
      reply_markup: inlineKeyboards.otherSchedules
    });
  }
}