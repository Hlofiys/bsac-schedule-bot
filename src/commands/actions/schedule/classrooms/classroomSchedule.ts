import { Composer } from "grammy";
import { EnhancedContext } from "../../../../utils/index.js";
import { callbackIdBuild, ClassroomScheduleType, inlineKeyboards } from "../../../../utils/keyboards.js";

export const classroomScheduleHandler = new Composer<EnhancedContext>();

classroomScheduleHandler.callbackQuery('classroom_schedule', async (ctx) => {
  // For now, we'll just show the classroom schedule type options
  await ctx.editMessageText('🥏 Выбери что тебе нужно найти', {
    reply_markup: inlineKeyboards.classroomScheduleType
  });
});

classroomScheduleHandler.callbackQuery(callbackIdBuild('classroom_schedule', [ClassroomScheduleType.Free]), async (ctx) => {
  // For now, we'll just show a simple message about free classrooms
  await ctx.editMessageText('🪙 Свободные аудитории:\n\nК сожалению, эта функция пока не реализована в BSAC боте.');
});