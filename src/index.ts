import { Bot } from "grammy";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, UserState } from "./schemas/User.js";
import { GroupChat } from "./schemas/Group.js";
import { EnhancedContext, CommandUtils } from "./utils/index.js";
import { ScheduleApi } from "./api/ScheduleApi.js";
import { ScheduleScheduler } from "./services/ScheduleScheduler.js";
import { hearsCommands } from "./commands/hears/index.js";
import { slashCommands } from "./commands/slash/index.js";
import { actionsHandler } from "./commands/actions/index.js";
import { chatHandler } from "./commands/chatHandler.js";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["BOT_TOKEN", "API_BASE_URL", "MONGODB_URI"];
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`${key} is not set`);
  }
});

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI!, {
  dbName: "bsac-bot", // Explicitly set database name
});

// Initialize bot and API
const bot = new Bot<EnhancedContext>(process.env.BOT_TOKEN!);
const scheduleApi = new ScheduleApi(process.env.API_BASE_URL!);

// Initialize scheduler
const scheduler = new ScheduleScheduler(bot, scheduleApi);

// Command utils object
const commandUtils: CommandUtils = {
  scheduleApi,
};

// Initialize commands
const registeredHearsCommands = hearsCommands.map(
  (CommandClass) => new CommandClass(commandUtils)
);
const registeredSlashCommands = slashCommands.map(
  (CommandClass) => new CommandClass(commandUtils)
);

// No session middleware needed - using MongoDB for persistence

// User middleware - enhanced context with user data
bot.use(async (ctx, next) => {
  if (!ctx.from) return;

  // Add command utils to context for group setup handlers
  ctx.commandUtils = commandUtils;

  // Handle private chats (user data)
  if (ctx.chat?.type === "private") {
    const telegramId = ctx.from.id;
    let user = await User.findOne({ telegramId });

    if (!user) {
      user = new User({
        telegramId,
        username: ctx.from.username,
        state: UserState.AskingFollowingEntity,
      });
      await user.save();
      ctx.newUser = true;
    }

    ctx.user = user;

    // Update username if changed
    if (ctx.user.username !== ctx.from.username) {
      ctx.user.username = ctx.from.username;
      await ctx.user.save();
    }
  }

  // Handle group chats (group data)
  if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
    const chatId = ctx.chat.id;
    let groupChat = await GroupChat.findOne({ chatId });

    if (
      !groupChat &&
      (ctx.message?.text?.startsWith("/setup") ||
        ctx.callbackQuery?.data?.startsWith("group_setup"))
    ) {
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

    ctx.groupChat = groupChat || undefined;
  }

  return next();
});

// Register action handlers (callback queries)
bot.use(actionsHandler);

// Register slash commands FIRST (before chat handler)
for (const command of registeredSlashCommands) {
  bot.command(command.triggers as string, async (ctx) => {
    await command.execute(ctx);
  });
}

// Register hears commands
for (const command of registeredHearsCommands) {
  console.log("Registering HEARS command with triggers:", command.triggers);
  bot.hears(command.triggers, command.execute.bind(command));
}

// Register chat handler (text messages) LAST
bot.use(chatHandler);

// Error handling
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

bot.catch((err) => console.error("Bot error:", err));

// Set bot commands for Telegram menu
await bot.api.setMyCommands([
  { command: "start", description: "🚀 Начать работу с ботом" },
  { command: "setup", description: "⚙️ Настроить бота для группы" },
  { command: "status", description: "📊 Статус бота в группе" },
]);

// Start scheduler
scheduler.start();

// Start bot
if (process.env.NODE_ENV === "production") {
  // Production webhook setup would go here
  console.log("Starting bot in production mode...");
} else {
  console.log("Starting bot in development mode...");
}

bot.start();
console.log("BSAC Schedule Bot is running...");
