import {
  AbstractSlashCommand,
  CommandContext,
  CommandUtils,
} from "../../utils/index.js";
import { GroupChat, GroupSetupState } from "../../schemas/Group.js";
import { InlineKeyboard } from "grammy";

export class GroupSetupCommand extends AbstractSlashCommand {
  constructor(utils: CommandUtils) {
    super("setup", utils);
  }

  async execute(ctx: CommandContext) {
    // Check if this is a group chat
    if (ctx.chat?.type !== "group" && ctx.chat?.type !== "supergroup") {
      await ctx.reply("❌ Эта команда работает только в групповых чатах!");
      return;
    }

    // Check if user is admin or special developer
    const DEVELOPER_USER_ID = parseInt(process.env.DEVELOPER_USER_ID || "0");
    const isDeveloper = ctx.from!.id === DEVELOPER_USER_ID;

    if (!isDeveloper) {
      try {
        const chatMember = await ctx.api.getChatMember(
          ctx.chat.id,
          ctx.from!.id
        );

        if (
          chatMember.status !== "administrator" &&
          chatMember.status !== "creator"
        ) {
          await ctx.reply(
            "❌ Только администраторы группы могут настраивать бота!"
          );
          return;
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        await ctx.reply("❌ Ошибка при проверке прав администратора!");
        return;
      }
    }

    const chatId = ctx.chat.id;
    let groupChat = await GroupChat.findOne({ chatId });

    if (!groupChat) {
      groupChat = new GroupChat({
        chatId,
        chatTitle: ctx.chat.title,
        isActive: true,
        scheduleTime: "08:00",
        timezone: "Europe/Minsk",
        sendBothSubgroups: true,
      });
      await groupChat.save();
    }

    groupChat.setupState = GroupSetupState.MainMenu;
    await groupChat.save();

    const keyboard = new InlineKeyboard()
      .text("🎓 Изменить группу", `group_setup:ask_group:${chatId}`)
      .row()
      .text("🕐 Изменить время", `group_setup:ask_time:${chatId}`)
      .row()
      .text("🎭 Режим подгрупп", `group_setup:toggle_subgroups:${chatId}`)
      .row()
      .text(
        groupChat.isActive
          ? "😴 Отключить уведомления"
          : "🎉 Включить уведомления",
        `group_setup:toggle_active:${chatId}`
      );

    const statusText = this.getStatusText(groupChat);

    await ctx.reply(
      `🚀 <b>Настройка бота для группы</b>\n\n${statusText}\n\n👇 Выберите действие:`,
      {
        reply_markup: keyboard,
        parse_mode: "HTML",
      }
    );
  }

  private getStatusText(groupChat: GroupChat): string {
    let status = "";

    if (groupChat.selectedGroupNumber) {
      status += `🎓 <b>Группа:</b> ${groupChat.selectedGroupNumber}\n`;
    } else {
      status += `🤔 <b>Группа не выбрана</b>\n`;
    }

    status += `🕐 <b>Время отправки:</b> ${groupChat.scheduleTime}\n`;
    status += `🎭 <b>Подгруппы:</b> ${groupChat.sendBothSubgroups ? "Обе подгруппы отдельно" : "Все занятия вместе"}\n`;
    status += `${groupChat.isActive ? "🎉" : "😴"} <b>Уведомления:</b> ${groupChat.isActive ? "Включены" : "Отключены"}`;

    return status;
  }
}

export class GroupStatusCommand extends AbstractSlashCommand {
  constructor(utils: CommandUtils) {
    super("status", utils);
  }

  async execute(ctx: CommandContext) {
    // Check if this is a group chat
    if (ctx.chat?.type !== "group" && ctx.chat?.type !== "supergroup") {
      await ctx.reply("❌ Эта команда работает только в групповых чатах!");
      return;
    }

    const chatId = ctx.chat.id;
    const groupChat = await GroupChat.findOne({ chatId });

    if (!groupChat) {
      await ctx.reply(
        "❌ Бот не настроен для этой группы. Используйте /setup для настройки."
      );
      return;
    }

    const statusText = this.getStatusText(groupChat);
    await ctx.reply(`📊 <b>Статус бота в группе</b>\n\n${statusText}`, {
      parse_mode: "HTML",
    });
  }

  private getStatusText(groupChat: GroupChat): string {
    let status = "";

    if (groupChat.selectedGroupNumber) {
      status += `🎓 <b>Группа:</b> ${groupChat.selectedGroupNumber}\n`;
    } else {
      status += `🤔 <b>Группа не выбрана</b>\n`;
    }

    status += `🕐 <b>Время отправки:</b> ${groupChat.scheduleTime}\n`;
    status += `🎭 <b>Подгруппы:</b> ${groupChat.sendBothSubgroups ? "Обе подгруппы отдельно" : "Все занятия вместе"}\n`;
    status += `${groupChat.isActive ? "🎉" : "😴"} <b>Уведомления:</b> ${groupChat.isActive ? "Включены" : "Отключены"}`;

    return status;
  }
}
