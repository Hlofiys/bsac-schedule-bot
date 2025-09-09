import { Composer } from "grammy";
import { CommandContext, EnhancedContext } from "../../../utils/index.js";
import { GroupChat, GroupSetupState } from "../../../schemas/Group.js";
import { InlineKeyboard } from "grammy";
import { callbackIdParse } from "../../../utils/keyboards.js";

export const groupSetupHandler = new Composer<EnhancedContext>();

// Handle text input for group setup
groupSetupHandler.on("message:text", async (ctx, next) => {
  // Only handle group chats
  if (ctx.chat?.type !== "group" && ctx.chat?.type !== "supergroup")
    return next();

  const groupChat = await GroupChat.findOne({ chatId: ctx.chat.id });
  if (!groupChat || groupChat.setupState === GroupSetupState.MainMenu)
    return next();

  const text = ctx.message.text;

  if (groupChat.setupState === GroupSetupState.AskingGroup) {
    await handleGroupInput(ctx, groupChat, text);
  } else if (groupChat.setupState === GroupSetupState.AskingTime) {
    await handleTimeInput(ctx, groupChat, text);
  }
});

async function handleGroupInput(
  ctx: CommandContext,
  groupChat: GroupChat,
  groupText: string
) {
  const { scheduleApi } = ctx.commandUtils || {};
  if (!scheduleApi) {
    await ctx.reply("❌ API недоступен!");
    return;
  }

  // Delete the user input message
  await ctx.deleteMessage().catch(() => {});

  // Delete the prompt message if we have its ID
  if (groupChat.lastPromptMessageId) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, groupChat.lastPromptMessageId);
      groupChat.lastPromptMessageId = undefined;
      await groupChat.save();
    } catch {
      /* ignore if message already deleted */
    }
  }

  try {
    const allGroups = await scheduleApi.getGroups({ limit: 100 });
    const searchLower = groupText.toLowerCase();
    const groups = allGroups.filter((g) =>
      g.groupNumber?.toLowerCase().includes(searchLower)
    );

    if (groups.length === 0) {
      await ctx.reply("❌ Группа не найдена. Попробуйте еще раз:");
      return;
    }

    if (groups.length === 1) {
      // Exact match - select immediately
      const selectedGroup = groups[0];
      groupChat.selectedGroup = selectedGroup.id;
      groupChat.selectedGroupNumber = selectedGroup.groupNumber!;
      groupChat.setupState = GroupSetupState.MainMenu;
      await groupChat.save();

      const successMsg = await ctx.reply(
        `🎯 Группа ${selectedGroup.groupNumber} выбрана!`
      );
      // Delete success message after 2 seconds
      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(ctx.chat!.id, successMsg.message_id);
        } catch {
          /* ignore */
        }
      }, 2000);

      await showMainMenu(ctx, groupChat);
    } else {
      // Multiple matches - show selection menu
      const keyboard = new InlineKeyboard();
      groups.slice(0, 10).forEach((group) => {
        keyboard
          .text(
            group.groupNumber!,
            `group_setup:select_group:${groupChat.chatId}:${group.id}`
          )
          .row();
      });
      keyboard.text("🔙 Назад", `group_setup:back:${groupChat.chatId}`);

      // Store message ID to potentially edit it later
      await ctx.reply(
        `🔍 Найдено ${groups.length} групп${groups.length > 10 ? " (показаны первые 10)" : ""}:\n\nВыберите нужную:`,
        {
          reply_markup: keyboard,
        }
      );
    }
  } catch (error) {
    console.error("Error searching groups:", error);
    await ctx.reply("❌ Ошибка при поиске группы. Попробуйте еще раз:");
  }
}

async function handleTimeInput(
  ctx: CommandContext,
  groupChat: GroupChat,
  timeText: string
) {
  // Delete the user input message
  await ctx.deleteMessage().catch(() => {});

  // Delete the prompt message if we have its ID
  if (groupChat.lastPromptMessageId) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, groupChat.lastPromptMessageId);
      groupChat.lastPromptMessageId = undefined;
    } catch {
      /* ignore if message already deleted */
    }
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;

  if (!timeRegex.test(timeText)) {
    await ctx.reply(
      "❌ Неверный формат времени. Используйте формат ЧЧ:ММ (например: 08:00):"
    );
    return;
  }

  groupChat.scheduleTime = timeText;
  groupChat.setupState = GroupSetupState.MainMenu;
  await groupChat.save();

  const successMsg = await ctx.reply(
    `🕐 Время отправки установлено: ${timeText}`
  );
  // Delete success message after 2 seconds
  setTimeout(async () => {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, successMsg.message_id);
    } catch {
      /* ignore */
    }
  }, 2000);

  await showMainMenu(ctx, groupChat);
}

// Handle group setup actions
groupSetupHandler.callbackQuery(/^group_setup:/, async (ctx) => {
  const data = ctx.callbackQuery.data!;
  const [, action, chatId] = callbackIdParse(data);

  // Verify user is admin or special developer
  const DEVELOPER_USER_ID = parseInt(process.env.DEVELOPER_USER_ID || "0");
  const isDeveloper = ctx.from!.id === DEVELOPER_USER_ID;

  if (!isDeveloper) {
    const chatMember = await ctx.api.getChatMember(
      parseInt(chatId),
      ctx.from!.id
    );
    if (
      chatMember.status !== "administrator" &&
      chatMember.status !== "creator"
    ) {
      await ctx.answerCallbackQuery(
        "❌ Только администраторы могут изменять настройки!"
      );
      return;
    }
  }

  const groupChat = await GroupChat.findOne({ chatId: parseInt(chatId) });
  if (!groupChat) {
    await ctx.answerCallbackQuery("❌ Группа не найдена!");
    return;
  }

  switch (action) {
    case "ask_group":
      await askForGroup(ctx, groupChat);
      break;
    case "select_group":
      await selectGroup(ctx, groupChat, callbackIdParse(data)[3]); // groupId is 4th element
      break;
    case "ask_time":
      await askForTime(ctx, groupChat);
      break;
    case "toggle_subgroups":
      await toggleSubgroups(ctx, groupChat);
      break;
    case "toggle_active":
      await toggleActive(ctx, groupChat);
      break;
    case "back":
      await showMainMenu(ctx, groupChat);
      break;
    default:
      await ctx.answerCallbackQuery("❌ Неизвестное действие!");
  }
});

// Simple action functions
async function selectGroup(
  ctx: CommandContext,
  groupChat: GroupChat,
  groupId: string
) {
  const { scheduleApi } = ctx.commandUtils || {};
  if (!scheduleApi) {
    await ctx.answerCallbackQuery("❌ API недоступен!");
    return;
  }

  try {
    const allGroups = await scheduleApi.getGroups({ limit: 100 });
    const selectedGroup = allGroups.find((g) => g.id?.toString() === groupId);

    if (!selectedGroup) {
      await ctx.answerCallbackQuery("❌ Группа не найдена!");
      return;
    }

    groupChat.selectedGroup = selectedGroup.id;
    groupChat.selectedGroupNumber = selectedGroup.groupNumber!;
    groupChat.setupState = GroupSetupState.MainMenu;
    await groupChat.save();

    await ctx.answerCallbackQuery(
      `🎯 Группа ${selectedGroup.groupNumber} выбрана!`
    );
    // Delete the group selection message first
    await ctx.deleteMessage().catch(() => {});
    await showMainMenu(ctx, groupChat);
  } catch (error) {
    console.error("Error selecting group:", error);
    await ctx.answerCallbackQuery("❌ Ошибка при выборе группы!");
  }
}

async function askForGroup(ctx: CommandContext, groupChat: GroupChat) {
  groupChat.setupState = GroupSetupState.AskingGroup;

  await ctx.editMessageText(
    "🎓 <b>Введите номер группы</b>\n\n💡 Примеры: ТЦ-541, ПО-112, ТЭ-212\n\n🔤 Можно писать не полностью - бот найдет все подходящие варианты!\n\n✍️ Просто напишите номер группы в чат:",
    { parse_mode: "HTML" }
  );

  // Store the current callback message ID to delete it later
  if (ctx.callbackQuery?.message?.message_id) {
    groupChat.lastPromptMessageId = ctx.callbackQuery.message.message_id;
  }
  await groupChat.save();

  await ctx.answerCallbackQuery();
}

async function askForTime(ctx: CommandContext, groupChat: GroupChat) {
  groupChat.setupState = GroupSetupState.AskingTime;

  await ctx.editMessageText(
    "🕐 <b>Введите время отправки расписания</b>\n\n📅 Формат: ЧЧ:ММ (например: 08:00, 19:30)\n\n💬 Просто напишите время в чат:",
    { parse_mode: "HTML" }
  );

  // Store the current callback message ID to delete it later
  if (ctx.callbackQuery?.message?.message_id) {
    groupChat.lastPromptMessageId = ctx.callbackQuery.message.message_id;
  }
  await groupChat.save();

  await ctx.answerCallbackQuery();
}

async function toggleSubgroups(ctx: CommandContext, groupChat: GroupChat) {
  groupChat.sendBothSubgroups = !groupChat.sendBothSubgroups;
  await groupChat.save();

  await ctx.answerCallbackQuery(
    groupChat.sendBothSubgroups
      ? "🎭 Теперь отправляются раздельные сообщения для каждой подгруппы!"
      : "🤝 Теперь отправляется одно сообщение с метками подгрупп!"
  );
  await showMainMenu(ctx, groupChat);
}

async function toggleActive(ctx: CommandContext, groupChat: GroupChat) {
  groupChat.isActive = !groupChat.isActive;
  await groupChat.save();

  await ctx.answerCallbackQuery(
    groupChat.isActive
      ? "🎉 Уведомления включены!"
      : "😴 Уведомления отключены!"
  );
  await showMainMenu(ctx, groupChat);
}

async function showMainMenu(ctx: CommandContext, groupChat: GroupChat) {
  groupChat.setupState = GroupSetupState.MainMenu;
  await groupChat.save();

  const keyboard = new InlineKeyboard()
    .text("🎓 Изменить группу", `group_setup:ask_group:${groupChat.chatId}`)
    .row()
    .text("🕐 Изменить время", `group_setup:ask_time:${groupChat.chatId}`)
    .row()
    .text(
      "🎭 Режим подгрупп",
      `group_setup:toggle_subgroups:${groupChat.chatId}`
    )
    .row()
    .text(
      groupChat.isActive
        ? "😴 Отключить уведомления"
        : "🎉 Включить уведомления",
      `group_setup:toggle_active:${groupChat.chatId}`
    );

  const statusText = getStatusText(groupChat);

  const message = `🚀 <b>Настройка бота для группы</b>\n\n${statusText}\n\n👇 Выберите действие:`;

  // Try to edit the callback query message first, if that fails send new message
  if (ctx.callbackQuery && ctx.editMessageText) {
    try {
      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: "HTML",
      });
    } catch {
      // If edit fails, send new message
      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: "HTML",
      });
    }
  } else {
    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }
}

function getStatusText(groupChat: GroupChat): string {
  let status = "";

  if (groupChat.selectedGroupNumber) {
    status += `🎓 <b>Группа:</b> ${groupChat.selectedGroupNumber}\n`;
  } else {
    status += `🤔 <b>Группа не выбрана</b>\n`;
  }

  status += `🕐 <b>Время отправки:</b> ${groupChat.scheduleTime}\n`;
  status += `🎭 <b>Подгруппы:</b> ${groupChat.sendBothSubgroups ? "Раздельные сообщения" : "Одно сообщение с метками"}\n`;
  status += `${groupChat.isActive ? "🎉" : "😴"} <b>Уведомления:</b> ${groupChat.isActive ? "Включены" : "Отключены"}`;

  return status;
}
