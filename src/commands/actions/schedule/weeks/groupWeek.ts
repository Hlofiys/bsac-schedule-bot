import { Composer } from "grammy";
import { MyContext } from "../../../../schemas/User";
import { callbackIdBuild, callbackIdParse, dateToCallback } from "../../../../utils/keyboards";
import { InlineKeyboard } from "grammy";
import { ScheduleService } from "../../../../services/scheduleService";
import { UserState } from "../../../../schemas/User";

export const groupWeekHandler = new Composer<MyContext>();

const scheduleService = new ScheduleService();

groupWeekHandler.callbackQuery(/^group_week*/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  
  // If match is an array (from regex), get the full match string
  const matchString = Array.isArray(match) ? match[0] : match;
  const [, ...args] = callbackIdParse(matchString);
  const [groupId, weekStartRaw] = args;

  if (!groupId) {
    if (ctx.session) {
      ctx.session.state = UserState.AskingWeekGroup;
    }

    await ctx.answerCallbackQuery();
    // Clear the inline keyboard
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

    await ctx.reply('🤨');
    await ctx.reply('🥕 Напиши номер группы для поиска расписания');
  } else if (!weekStartRaw) {
    // Get group info
    try {
      const groups = await scheduleService.getAllGroups();
      const group = groups.find(g => g.id === parseInt(groupId));
      
      if (!group) {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        return await ctx.reply('😭 Группа не найдена');
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
        
        buttons.text(weekLabel, callbackIdBuild('group_week', [groupId, dateToCallback(weekStart)])).row();
      }

      await ctx.editMessageText('🛗 Выбери неделю');
      await ctx.editMessageReplyMarkup({ reply_markup: buttons });
    } catch (e) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      return await ctx.reply('📸 Произошла какая-то ошибка');
    }
  } else {
    // Show schedule for the selected week
    try {
      const groups = await scheduleService.getAllGroups();
      const group = groups.find(g => g.id === parseInt(groupId));
      
      if (!group) {
        await ctx.answerCallbackQuery();
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        return await ctx.reply('😭 Группа не найдена');
      }

      const weekStart = new Date(weekStartRaw);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Get dates for the week
      const dates = [];
      for (let d = new Date(weekStart); d < weekEnd; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      const schedule = await scheduleService.getGroupSchedule(parseInt(groupId), dates);
      const scheduleMessage = scheduleService.formatSchedule(schedule);

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(`Расписание на неделю для ${group.groupNumber}\n\n${scheduleMessage}`);
    } catch (e) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      return await ctx.reply('🥥 Расписания на неделю для группы нету');
    }
  }
});