import { Context } from "grammy";

export const scheduleCommand = async (ctx: Context) => {
  const scheduleMessage = `
Для получения расписания, пожалуйста, выберите один из вариантов:

1. Расписание для группы
2. Расписание для преподавателя

Введите номер варианта (1 или 2):
  `.trim();

  await ctx.reply(scheduleMessage);
};