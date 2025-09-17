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

      // Process groups in parallel with controlled concurrency to avoid overwhelming the API
      const maxConcurrentRequests = 3;
      const chunks = [];
      for (let i = 0; i < groupsToNotify.length; i += maxConcurrentRequests) {
        chunks.push(groupsToNotify.slice(i, i + maxConcurrentRequests));
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async (group) => {
          try {
            console.log(`📤 Sending schedule to group ${group.chatId}`);
            await this.sendDailySchedule(group);
            console.log(
              `✅ Successfully sent schedule to group ${group.chatId}`
            );
          } catch (error) {
            console.error(
              `❌ Failed to send schedule to group ${group.chatId}:`,
              error
            );
            // Continue with other groups even if one fails
          }
        });

        // Wait for current chunk to complete before processing next chunk
        await Promise.allSettled(promises);

        // Small delay between chunks to avoid overwhelming the API
        if (chunks.indexOf(chunk) < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error("Critical error in schedule scheduler:", error);
      // Log additional details for debugging
      console.error("Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async sendDailySchedule(group: GroupChat) {
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxRetries; attempt++) {
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
          await this.sendMessageWithRetry(
            group.chatId,
            "🎉 На завтра занятий нет!"
          );
          return;
        }

        // Check if there are any subgroup-specific lessons
        const hasSubgroupSpecificLessons = lessons.some(
          (lesson) =>
            lesson.lessonSchedule?.subGroup !== undefined &&
            lesson.lessonSchedule?.subGroup !== null
        );

        if (group.sendBothSubgroups) {
          // Mode 1: Check if we should send separate messages for subgroups
          // Generate schedules for both subgroups to compare them

          const subgroup1Message = this.formatSubgroupSchedule(
            lessons,
            "завтра",
            1
          );
          const subgroup2Message = this.formatSubgroupSchedule(
            lessons,
            "завтра",
            2
          );

          // Check if both subgroup schedules are identical
          if (
            subgroup1Message &&
            subgroup2Message &&
            subgroup1Message === subgroup2Message
          ) {
            // Send one combined message if schedules are identical
            await this.sendMessageWithRetry(group.chatId, subgroup1Message, {
              parse_mode: "HTML",
            });
          } else {
            // Send separate messages if schedules are different
            if (subgroup1Message) {
              await this.sendMessageWithRetry(
                group.chatId,
                `📚 <b>Подгруппа 1</b>\n\n${subgroup1Message}`,
                { parse_mode: "HTML" }
              );
            }

            if (subgroup2Message) {
              await this.sendMessageWithRetry(
                group.chatId,
                `📚 <b>Подгруппа 2</b>\n\n${subgroup2Message}`,
                { parse_mode: "HTML" }
              );
            }
          }
        } else {
          // Mode 2: Send one message with all schedules
          // Either because sendBothSubgroups is false
          const allScheduleMessage = hasSubgroupSpecificLessons
            ? this.formatAllScheduleWithSubgroupMarks(lessons, "завтра")
            : this.formatSchedule(lessons, "завтра");

          if (allScheduleMessage) {
            await this.sendMessageWithRetry(group.chatId, allScheduleMessage, {
              parse_mode: "HTML",
            });
          }
        }

        // If we reach here, the operation was successful
        return;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        const isTimeoutError =
          error instanceof Error &&
          (error.name === "AbortError" ||
            error.message.includes("timeout") ||
            error.message.includes("TIMEOUT_ERR"));

        if (isLastAttempt) {
          console.error(
            `Failed to send schedule to group ${group.chatId} after ${maxRetries} attempts:`,
            error
          );

          // Send error message to the group as a last resort
          try {
            await this.sendMessageWithRetry(
              group.chatId,
              "❌ Извините, не удалось получить расписание на завтра. Проверьте позже или обратитесь к администратору.",
              undefined,
              1 // Only 1 retry for error message
            );
          } catch (errorMsgError) {
            console.error(
              `Failed to send error message to group ${group.chatId}:`,
              errorMsgError
            );
          }
        } else {
          if (isTimeoutError) {
            console.warn(
              `Timeout sending schedule to group ${group.chatId} (attempt ${attempt + 1}/${maxRetries}). Retrying in ${retryDelay}ms...`
            );
          } else {
            console.warn(
              `Error sending schedule to group ${group.chatId} (attempt ${attempt + 1}/${maxRetries}):`,
              error,
              `Retrying in ${retryDelay}ms...`
            );
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }
  }

  private async sendMessageWithRetry(
    chatId: number,
    text: string,
    options?: { parse_mode?: "HTML" | "Markdown" },
    maxRetries: number = 3
  ): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.bot.api.sendMessage(chatId, text, options);
        return;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;

        if (isLastAttempt) {
          console.error(
            `Failed to send message to chat ${chatId} after ${maxRetries} attempts:`,
            error
          );
          throw error;
        } else {
          console.warn(
            `Failed to send message to chat ${chatId} (attempt ${attempt + 1}/${maxRetries}):`,
            error
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1))
          );
        }
      }
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
        const typeEmoji = this.getLessonTypeEmoji(lessonType);

        message += `⚡ <b>${timeSlot}</b>\n`;
        message += `   ${typeEmoji} ${translatedType}\n`;
        message += `   🧠 ${lessonName}\n`;
        message += `   🤓 ${teacherName}\n`;
        message += `   ${cabinetDisplay}\n`;

        if (index < lessons.length - 1) {
          message += "\n";
        }
      });

    return message;
  }

  /**
   * Mode 1: Format schedule for a specific subgroup including both common and subgroup-specific lessons
   */
  private formatSubgroupSchedule(
    lessonsWithWork: LessonSchedule[],
    dayText: string,
    subgroup: number
  ): string {
    // Get lessons for this subgroup AND common lessons (no subgroup specified)
    const lessons = lessonsWithWork.filter((lesson) => {
      const lessonSubgroup = lesson.lessonSchedule?.subGroup;
      return !lessonSubgroup || lessonSubgroup === subgroup;
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
        const typeEmoji = this.getLessonTypeEmoji(lessonType);

        message += `⚡ <b>${timeSlot}</b>\n`;
        message += `   ${typeEmoji} ${translatedType}\n`;
        message += `   🧠 ${lessonName}\n`;
        message += `   🤓 ${teacherName}\n`;
        message += `   ${cabinetDisplay}\n`;

        if (index < lessons.length - 1) {
          message += "\n";
        }
      });

    return message;
  }

  /**
   * Mode 2: Format all schedules with subgroup marks in one message
   */
  private formatAllScheduleWithSubgroupMarks(
    lessonsWithWork: LessonSchedule[],
    dayText: string
  ): string {
    if (lessonsWithWork.length === 0) {
      return "";
    }

    let message = `🎯 <b>Расписание на ${dayText}</b>\n\n`;

    lessonsWithWork
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
        const subgroup = lesson.subGroup;

        const cabinetDisplay =
          cabinet === 0
            ? "🏃‍♂️ Спортзал"
            : cabinet
              ? `🚪 Ауд. ${cabinet}`
              : "🚪 Ауд. ?";
        const translatedType = this.translateLessonType(lessonType);
        const typeEmoji = this.getLessonTypeEmoji(lessonType);

        // Add subgroup indicator
        const subgroupIndicator = subgroup ? ` 🐧 Подгруппа ${subgroup}` : "";

        message += `⚡ <b>${timeSlot}</b>${subgroupIndicator}\n`;
        message += `   ${typeEmoji} ${translatedType}\n`;
        message += `   🧠 ${lessonName}\n`;
        message += `   🤓 ${teacherName}\n`;
        message += `   ${cabinetDisplay}\n`;

        if (index < lessonsWithWork.length - 1) {
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

  private getLessonTypeEmoji(type: string): string {
    const emojiMap: { [key: string]: string } = {
      Lecture: "🦉", // Wise owl for lectures (sitting and listening)
      Practical: "🔨", // Hammer for practical work (hands-on building)
      Laboratory: "🧙‍♂️", // Wizard for lab work (magical experiments)
    };

    return emojiMap[type] || "🤖"; // Robot for unknown types
  }
}
