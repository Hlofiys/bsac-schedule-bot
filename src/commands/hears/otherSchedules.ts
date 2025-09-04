import {
  AbstractHearsCommand,
  CommandContext,
  CommandUtils,
} from "../../utils/index.js";
import { UserState } from "../../schemas/User.js";
import { inlineKeyboards } from "../../utils/keyboards.js";

export class OtherSchedulesCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super(["Другие расписания"], utils);
  }

  async execute(ctx: CommandContext) {
    if (ctx.user?.state !== UserState.MainMenu) return;

    await ctx.reply("📅 Выбери какое расписание тебе нужно", {
      reply_markup: inlineKeyboards.otherSchedules,
    });
  }
}
