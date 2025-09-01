import { Context, InlineKeyboard } from "grammy";

export const scheduleCommand = async (ctx: Context) => {
  const scheduleMessage = `
📅 Выберите тип расписания:
  `.trim();

  // Create inline keyboard with options
  const keyboard = new InlineKeyboard()
    .text("👥 Группа", "group_schedule")
    .row()
    .text("👨‍🏫 Преподаватель", "teacher_schedule");

  await ctx.reply(scheduleMessage, { reply_markup: keyboard });
};