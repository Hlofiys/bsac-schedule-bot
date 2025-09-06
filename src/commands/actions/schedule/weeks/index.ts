import { Composer, InlineKeyboard } from "grammy";
import { EnhancedContext } from "../../../../utils/context.js";
import {
  callbackIdBuild,
  callbackIdParse,
  dateToCallback,
} from "../../../../utils/keyboards.js";
import { UserState } from "../../../../schemas/User.js";
import { ScheduleApi, GetScheduleForOneGroup } from "../../../../api/index.js";

export const weeksHandler = new Composer<EnhancedContext>();

const scheduleApi = new ScheduleApi(process.env.API_BASE_URL!);

// Note: This is inefficient as it fetches all entities, but the current API doesn't support fetching a single one by ID.
async function findEntityName(
  entityId: string,
  isGroup: boolean
): Promise<string | undefined> {
  if (isGroup) {
    const groups = await scheduleApi.getGroups();
    return (
      groups.find((g) => g.id?.toString() === entityId)?.groupNumber ??
      undefined
    );
  } else {
    const teachers = await scheduleApi.getTeachers();
    return (
      teachers.find((t) => t.id?.toString() === entityId)?.fio ?? undefined
    );
  }
}

weeksHandler.callbackQuery(/^(group_week|teacher_week)/, async (ctx) => {
  if (!ctx.from || !ctx.user) return;
  const callbackData = ctx.callbackQuery.data;

  const [action, ...args] = callbackIdParse(callbackData);
  let entityId = args[0];
  const weekStartRaw = args[1];

  const isGroup = action === "group_week";

  if (!entityId) {
    if (isGroup && ctx.user.selectedGroup) {
      entityId = ctx.user.selectedGroup;
    } else if (!isGroup && ctx.user.selectedTeacher) {
      entityId = ctx.user.selectedTeacher;
    } else {
      ctx.user.state = isGroup
        ? UserState.AskingWeekGroup
        : UserState.AskingWeekTeacher;
      await ctx.user.save();

      await ctx.answerCallbackQuery();
      await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

      const message = isGroup
        ? "✏️ Напиши номер группы для поиска расписания"
        : "🧄 Напиши инициалы преподавателя или его часть\n\nОбычно они в формате Фамилия И. О.";
      await ctx.reply(message);
      return;
    }
  }

  if (!weekStartRaw) {
    try {
      const entityName = await findEntityName(entityId, isGroup);
      if (!entityName) {
        await ctx.answerCallbackQuery({
          text: "Сущность не найдена",
          show_alert: true,
        });
        return;
      }

      const buttons = generateWeekButtons(entityId, isGroup);
      await ctx.editMessageText(`🌟 Выбери неделю для ${entityName}`);
      await ctx.editMessageReplyMarkup({ reply_markup: buttons });
      await ctx.answerCallbackQuery();
    } catch (e) {
      console.error(e);
      await ctx.answerCallbackQuery({
        text: "🤖 Произошла какая-то ошибка",
        show_alert: true,
      });
    }
  } else {
    try {
      const entityName = await findEntityName(entityId, isGroup);
      if (!entityName) {
        await ctx.answerCallbackQuery({
          text: "Сущность не найдена",
          show_alert: true,
        });
        return;
      }

      const weekStart = new Date(weekStartRaw + "T00:00:00.000Z");
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        weekDates.push(date.toISOString().split("T")[0]);
      }

      const scheduleForWeek = await scheduleApi.getScheduleForDates({
        [isGroup ? "groupId" : "teacherId"]: entityId,
        dates: weekDates,
      });

      if (!scheduleForWeek || scheduleForWeek.length === 0) {
        await ctx.answerCallbackQuery();
        return await ctx.editMessageText(
          `🏖️ Расписания на неделю для ${entityName} нету`
        );
      }

      const scheduleMessage = formatWeekSchedule(
        scheduleForWeek,
        entityName,
        ctx.user.subgroup
      );
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(scheduleMessage, {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard(),
      });
    } catch (e) {
      console.error(e);
      await ctx.answerCallbackQuery({
        text: "🏖️ Расписания на неделю нету",
        show_alert: true,
      });
    }
  }
});

function generateWeekButtons(
  entityId: string,
  isGroup: boolean
): InlineKeyboard {
  const today = new Date();
  const currentWeekStart = new Date(today);
  const day = currentWeekStart.getDay();
  const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
  currentWeekStart.setDate(diff);
  currentWeekStart.setHours(0, 0, 0, 0);

  const buttons = new InlineKeyboard();
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() + i * 7);

    const weekLabel =
      i === 0
        ? "Текущая неделя"
        : i === 1
          ? "Следующая неделя"
          : `Через ${i} недели`;

    const action = isGroup ? "group_week" : "teacher_week";
    buttons
      .text(
        weekLabel,
        callbackIdBuild(action, [entityId, dateToCallback(weekStart)])
      )
      .row();
  }
  return buttons;
}

function formatWeekSchedule(
  scheduleForWeek: GetScheduleForOneGroup[],
  entityName: string,
  subgroup?: number
): string {
  let message = `🎯 <b>Расписание на неделю для ${entityName}</b>\n\n`;

  const sortedDays = scheduleForWeek.sort(
    (a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime()
  );

  for (const day of sortedDays) {
    if (!day.schedules || day.schedules.length === 0) continue;

    const displayDate = new Date(day.date!).toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    message += `📆 <b>${displayDate}</b>\n`;

    const lessons = day.schedules.filter(
      (lesson) =>
        !(
          subgroup &&
          lesson.lessonSchedule?.subGroup &&
          lesson.lessonSchedule.subGroup !== subgroup
        )
    );

    lessons
      .sort(
        (a, b) =>
          (a.lessonSchedule?.lessonNumber || 0) -
          (b.lessonSchedule?.lessonNumber || 0)
      )
      .forEach((lessonWithWork) => {
        const lesson = lessonWithWork.lessonSchedule;
        if (!lesson) return;

        const timeSlot = getLessonTime(lesson.lessonNumber);
        const lessonName = lesson.lesson?.name || "Не указано";
        const teacherName = lesson.teacher?.fio || "Не указано";
        const cabinet = lesson.cabinet;
        const cabinetDisplay =
          cabinet === 0
            ? "🏃‍♂️ Спортзал"
            : cabinet
              ? `🚪 Ауд. ${cabinet}`
              : "🚪 Ауд. ?";
        const lessonType = lesson.staticLessonType || "Не указано";
        const translatedType = translateLessonType(lessonType);

        message += `  ⚡ <b>${timeSlot}</b> 🧠 ${lessonName} (${translatedType})\n`;
        message += `     🤓 <i>${teacherName}</i>, ${cabinetDisplay}\n`;
      });
    message += "\n";
  }

  return message;
}

function getLessonTime(lessonNumber: number | undefined): string {
  const times: { [key: number]: string } = {
    1: "08:00-09:40",
    2: "09:55-11:35",
    3: "12:15-13:55",
    4: "14:10-15:50",
    5: "16:20-18:00",
    6: "18:15-19:55",
  };
  return lessonNumber
    ? times[lessonNumber] || "Время не указано"
    : "Время не указано";
}

function translateLessonType(type: string): string {
  const translations: { [key: string]: string } = {
    Lecture: "Лекция",
    Practical: "Практика",
    Laboratory: "Лабораторная",
  };
  return translations[type] || type;
}
