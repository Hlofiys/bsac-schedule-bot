import { Composer } from "grammy";
import { MyContext } from "../../../../schemas/User";
import { InlineKeyboard } from "grammy";

export const subjectScheduleHandler = new Composer<MyContext>();

subjectScheduleHandler.callbackQuery('subject_schedule', async (ctx) => {
  // For now, we'll just show a simple message about subjects
  await ctx.editMessageText('📚 Расписание по дисциплинам:\n\nК сожалению, эта функция пока не реализована в BSAC боте.');
});