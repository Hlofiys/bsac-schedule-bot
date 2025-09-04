import { Bot } from "grammy";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, UserState } from "./schemas/User.js";
import { EnhancedContext, CommandUtils } from "./utils/index.js";
import { ScheduleApi } from "./api/ScheduleApi.js";
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

  return next();
});

// Register action handlers (callback queries)
bot.use(actionsHandler);

// Register chat handler (text messages)
bot.use(chatHandler);

// Register hears commands
for (const command of registeredHearsCommands) {
  console.log("Registering HEARS command with triggers:", command.triggers);
  bot.hears(command.triggers, command.execute.bind(command));
}

// Register slash commands
for (const command of registeredSlashCommands) {
  console.log("Registering SLASH command with triggers:", command.triggers);
  bot.command(command.triggers as string, command.execute.bind(command));
}

// Error handling
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

bot.catch((err) => console.error("Bot error:", err));

// Set bot commands for Telegram menu
await bot.api.setMyCommands([
  { command: "start", description: "🚀 Начать работу с ботом" },
]);

// Start bot
if (process.env.NODE_ENV === "production") {
  // Production webhook setup would go here
  console.log("Starting bot in production mode...");
} else {
  console.log("Starting bot in development mode...");
}

bot.start();
console.log("BSAC Schedule Bot is running...");
