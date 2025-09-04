import { AbstractSlashCommand, CommandContext, CommandUtils } from "../../utils/index.js";
import { UserState } from "../../schemas/User.js";
import { inlineKeyboards, replyKeyboards } from "../../utils/keyboards.js";

export class StartCommand extends AbstractSlashCommand {
  constructor(utils: CommandUtils) {
    super("start", utils);
  }

  async execute(ctx: CommandContext) {
    if (!ctx.user) return;

    if (ctx.newUser) {
        await ctx.reply(
            "👋 Добро пожаловать в бот расписания БГАС!\n\n" +
            "Для начала работы выберите свою роль:",
            {
                reply_markup: inlineKeyboards.chooseRole
            }
        );
    } else {
        ctx.user.state = UserState.MainMenu;
        await ctx.user.save();
        
        await ctx.reply(
            "🎓 Добро пожаловать обратно!\n\n" +
            "Выберите действие:",
            {
                reply_markup: replyKeyboards[UserState.MainMenu]
            }
        );
    }
  }
}