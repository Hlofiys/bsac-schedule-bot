import { Bot } from "grammy";
import { GroupChat } from "../schemas/Group.js";
import {
  ScheduleApi,
  GetScheduleForOneGroup,
  LessonSchedule,
} from "../api/index.js";
import { EnhancedContext } from "../utils/index.js";
import { format, toZonedTime } from "date-fns-tz";

const timeZone = "Europe/Minsk";

export class ScheduleScheduler {
  private bot: Bot<EnhancedContext>;
  private scheduleApi: ScheduleApi;
  private intervalId?: NodeJS.Timeout;

  constructor(bot: Bot<EnhancedContext>, scheduleApi: ScheduleApi) {
    this.bot = bot;
    this.scheduleApi = scheduleApi;
  }

  start() {
    // Check every minute for groups that need schedule updates
    this.intervalId = setInterval(() => {
      this.checkAndSendSchedules();
    }, 60000); // 1 minute interval

    console.log("📅 Schedule scheduler started");
    console.log(
      "🕐 Current time:",
      toZonedTime(new Date(), timeZone).toLocaleString()
    );
    console.log("🌍 Timezone:", timeZone);
    console.log("🌍 TZ env var:", process.env.TZ);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log("📅 Schedule scheduler stopped");
    }
  }

  private async checkAndSendSchedules() {
    try {
      const now = toZonedTime(new Date(), timeZone);
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      // Find all active groups that should receive schedule at this time
      const groupsToNotify = await GroupChat.find({
        isActive: true,
        scheduleTime: currentTime,
        $or: [
          { selectedGroup: { $exists: true, $ne: null } },
          { selectedTeacher: { $exists: true, $ne: null } },
        ],
      });

      if (groupsToNotify.length > 0) {
        console.log(
          "📋 Groups to notify:",
          groupsToNotify.map((g) => ({
            chatId: g.chatId,
            scheduleTime: g.scheduleTime,
            selectedGroup: g.selectedGroup,
            isActive: g.isActive,
          }))
        );
      }

      for (const group of groupsToNotify) {
        console.log(`📤 Sending schedule to group ${group.chatId}`);
        await this.sendDailySchedule(group);
      }
    } catch (error) {
      console.error("Error in schedule scheduler:", error);
    }
  }

  private async sendDailySchedule(group: GroupChat) {
    try {
      const tomorrow = toZonedTime(new Date(), timeZone);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = format(tomorrow, "yyyy-MM-dd", { timeZone });

      let scheduleForDay: GetScheduleForOneGroup[] = [];

      if (group.selectedGroup) {
        scheduleForDay = await this.scheduleApi.getScheduleForDates({
          groupId: group.selectedGroup.toString(),
          dates: [dateString],
        });
      } else if (group.selectedTeacher) {
        scheduleForDay = await this.scheduleApi.getScheduleForDates({
          teacherId: group.selectedTeacher,
          dates: [dateString],
        });
      }

      const lessons = scheduleForDay.flatMap((day) => day.schedules || []);

      if (lessons.length === 0) {
        await this.bot.api.sendMessage(
          group.chatId,
          "🎉 На завтра занятий нет!"
        );
        return;
      }

      if (group.sendBothSubgroups) {
        // Send schedule for both subgroups
        const subgroup1Schedule = this.formatSchedule(lessons, "завтра", 1);
        const subgroup2Schedule = this.formatSchedule(lessons, "завтра", 2);

        if (subgroup1Schedule) {
          await this.bot.api.sendMessage(
            group.chatId,
            `📚 <b>Подгруппа 1</b>\n\n${subgroup1Schedule}`,
            { parse_mode: "HTML" }
          );
        }

        if (subgroup2Schedule) {
          await this.bot.api.sendMessage(
            group.chatId,
            `📚 <b>Подгруппа 2</b>\n\n${subgroup2Schedule}`,
            { parse_mode: "HTML" }
          );
        }

        // Also send common lessons (no subgroup specified)
        const commonSchedule = this.formatSchedule(lessons, "завтра");
        if (commonSchedule) {
          await this.bot.api.sendMessage(
            group.chatId,
            `📚 <b>Общие занятия</b>\n\n${commonSchedule}`,
            { parse_mode: "HTML" }
          );
        }
      } else {
        // Send all lessons without subgroup filtering
        const allSchedule = this.formatSchedule(lessons, "завтра");
        if (allSchedule) {
          await this.bot.api.sendMessage(group.chatId, allSchedule, {
            parse_mode: "HTML",
          });
        }
      }
    } catch (error) {
      console.error(`Error sending schedule to group ${group.chatId}:`, error);
    }
  }

  private formatSchedule(
    lessonsWithWork: LessonSchedule[],
    dayText: string,
    subgroup?: number
  ): string {
    const lessons = lessonsWithWork.filter((lesson) => {
      if (!subgroup) {
        // For common lessons, show only those without subgroup specification
        return !lesson.lessonSchedule?.subGroup;
      }
      // For specific subgroup, show only lessons for that subgroup
      return lesson.lessonSchedule?.subGroup === subgroup;
    });

    if (lessons.length === 0) {
      return "";
    }

    let message = `🎯 <b>Расписание на ${dayText}</b>\n\n`;

    lessons
      .sort(
        (a, b) =>
          (a.lessonSchedule?.lessonNumber || 0) -
          (b.lessonSchedule?.lessonNumber || 0)
      )
      .forEach((lessonWithWork, index) => {
        const lesson = lessonWithWork.lessonSchedule;
        if (!lesson) return;

        const timeSlot = this.getLessonTime(lesson.lessonNumber);
        const lessonName = lesson.lesson?.name || "Не указано";
        const teacherName = lesson.teacher?.fio || "Не указано";
        const cabinet = lesson.cabinet;
        const lessonType = lesson.staticLessonType || "Не указано";

        const cabinetDisplay =
          cabinet === 0
            ? "🏃‍♂️ Спортзал"
            : cabinet
              ? `🚪 Ауд. ${cabinet}`
              : "🚪 Ауд. ?";
        const translatedType = this.translateLessonType(lessonType);

        message += `⚡ <b>${timeSlot}</b> | ${translatedType}\n`;
        message += `   🧠 ${lessonName}\n`;
        message += `   🤓 ${teacherName}\n`;
        message += `   ${cabinetDisplay}\n`;

        if (index < lessons.length - 1) {
          message += "\n";
        }
      });

    return message;
  }

  private getLessonTime(lessonNumber: number | undefined): string {
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

  private translateLessonType(type: string): string {
    const translations: { [key: string]: string } = {
      Lecture: "Лекция",
      Practical: "Практика",
      Laboratory: "Лабораторная",
    };

    return translations[type] || type;
  }
}
