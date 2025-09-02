import { Composer } from "grammy";
import { MyContext } from "../../../../schemas/User";
import { callbackIdBuild, callbackIdParse, dateToCallback } from "../../../../utils/keyboards";
import { InlineKeyboard } from "grammy";
import { ScheduleService } from "../../../../services/scheduleService";
import { UserState } from "../../../../schemas/User";

export const teacherWeekHandler = new Composer<MyContext>();

const scheduleService = new ScheduleService();

teacherWeekHandler.callbackQuery(/^teacher_week/, async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  if (!callbackData) return;
  
  const [, ...args] = callbackIdParse(callbackData);
  const [teacherId, weekStartRaw] = args;

  if (!teacherId) {
    if (ctx.session) {
      ctx.session.state = UserState.AskingWeekTeacher;
    }

    await ctx.answerCallbackQuery();
    // Clear the inline keyboard
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

    await ctx.reply('🤨');
    await ctx.reply('🧄 Напиши инициалы преподавателя или его часть\n\nОбычно они в формате Фамилия И. О.');
 } else if (!weekStartRaw) {
    // Get teacher info
    try {
      const teachers = await scheduleService.getAllTeachers();
      const teacher = teachers.find(t => t.id === parseInt(teacherId));
      
      if (!teacher) {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        return await ctx.reply('😭 Преподаватель не найден');
      }

      // Generate weeks for selection
      const today = new Date();
      const currentWeekStart = new Date(today);
      const day = currentWeekStart.getDay();
      const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      currentWeekStart.setDate(diff);
      currentWeekStart.setHours(0, 0, 0, 0);

      // Create buttons for current and next few weeks
      const buttons = new InlineKeyboard();
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(weekStart.getDate() + (i * 7));
        
        const weekLabel = i === 0 ? 'Текущая неделя' :
                         i === 1 ? 'Следующая неделя' :
                         `Через ${i} недели`;
        
        buttons.text(weekLabel, callbackIdBuild('teacher_week', [teacherId, dateToCallback(weekStart)])).row();
      }

      await ctx.editMessageText('🚸 Выбери неделю');
      await ctx.editMessageReplyMarkup({ reply_markup: buttons });
    } catch (e) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      return await ctx.reply('📸 Произошла какая-то ошибка');
    }
  } else {
    // Show schedule for the selected week
    try {
      const teachers = await scheduleService.getAllTeachers();
      const teacher = teachers.find(t => t.id === parseInt(teacherId));
      
      if (!teacher) {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        return await ctx.reply('😭 Преподаватель не найден');
      }

      // Parse the date string properly
      const weekStart = new Date(weekStartRaw + 'T00:00:00.000Z');
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Changed from 7 to 6 to get exactly 7 days (0-6)

      // Get dates for the week
      const dates = [];
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      const schedule = await scheduleService.getTeacherSchedule(parseInt(teacherId), dates);
      const scheduleMessage = scheduleService.formatSchedule(schedule);

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(`Расписание на неделю для ${teacher.fio}\n\n${scheduleMessage}`, {
        reply_markup: new InlineKeyboard()
      });
    } catch (e) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      return await ctx.reply('🪤 Емае, неловко как-то вышло)');
    }
  }
});