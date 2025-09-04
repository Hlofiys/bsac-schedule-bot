import { Composer } from "grammy";
import { EnhancedContext } from "../../../../utils/index.js";

export const subjectScheduleHandler = new Composer<EnhancedContext>();

subjectScheduleHandler.callbackQuery('subject_schedule', async (ctx) => {
  // For now, we'll just show a simple message about subjects
  await ctx.editMessageText('📚 Расписание по дисциплинам:\n\nК сожалению, эта функция пока не реализована в BSAC боте.');
});