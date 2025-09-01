import { Bot, Context, SessionFlavor, session } from "grammy";
import dotenv from "dotenv";
import { startScheduleConversation, handleScheduleResponse, SessionData, ScheduleState } from "./conversations/scheduleConversation";

// Load environment variables
dotenv.config();

// Create a bot instance
const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN is not set in environment variables");
}

// Define context type with session
type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(token);

// Install session middleware
bot.use(session({
  initial: () => ({
    scheduleState: ScheduleState.IDLE
  } as SessionData)
}));

// Import command handlers
import { startCommand } from "./commands/start";
import { helpCommand } from "./commands/help";

// Register command handlers
bot.command("start", startCommand);
bot.command("help", helpCommand);
bot.command("schedule", startScheduleConversation);

// Handle text messages
bot.on("message:text", async (ctx) => {
  // Check if we're in a schedule conversation
  if (ctx.session && ctx.session.scheduleState !== ScheduleState.IDLE) {
    await handleScheduleResponse(ctx);
  } else {
    // Regular message handling
    await ctx.reply("Извините, я не понимаю эту команду. Введите /help для получения списка доступных команд.");
  }
});

// Start the bot
bot.start();

console.log("BSAC Schedule Bot is running...");