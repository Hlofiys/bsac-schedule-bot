import { Bot, Context, SessionFlavor, session } from "grammy";
import dotenv from "dotenv";
import { startScheduleConversation, handleScheduleResponse, handleGroupChoice, handleTeacherChoice, handleGroupScheduleRequest, handleTeacherScheduleRequest, SessionData, ScheduleState } from "./conversations/scheduleConversation";

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

// Handle callback queries from inline keyboards
bot.callbackQuery("group_schedule", async (ctx) => {
  // Answer the callback query to remove the loading animation
  await ctx.answerCallbackQuery();
  // Handle group schedule selection
  await handleGroupChoice(ctx);
});

bot.callbackQuery("teacher_schedule", async (ctx) => {
  // Answer the callback query to remove the loading animation
  await ctx.answerCallbackQuery();
  // Handle teacher schedule selection
  await handleTeacherChoice(ctx);
});

// Handle group selection
bot.callbackQuery(/select_group_(\d+)/, async (ctx) => {
  // Answer the callback query to remove the loading animation
  await ctx.answerCallbackQuery();
  
  // Extract group ID from callback data
  const groupId = parseInt(ctx.match[1]);
  if (!isNaN(groupId)) {
    // Handle group schedule request
    await handleGroupScheduleRequest(ctx, groupId);
 } else {
    await ctx.reply("❌ Ошибка: неверный ID группы.");
  }
});

// Handle teacher selection
bot.callbackQuery(/select_teacher_(\d+)/, async (ctx) => {
  // Answer the callback query to remove the loading animation
  await ctx.answerCallbackQuery();
  
  // Extract teacher ID from callback data
  const teacherId = parseInt(ctx.match[1]);
  if (!isNaN(teacherId)) {
    // Handle teacher schedule request
    await handleTeacherScheduleRequest(ctx, teacherId);
  } else {
    await ctx.reply("❌ Ошибка: неверный ID преподавателя.");
  }
});

// Handle back button
bot.callbackQuery("back_to_main", async (ctx) => {
  // Answer the callback query to remove the loading animation
  await ctx.answerCallbackQuery();
  
  // Restart the schedule conversation
  await startScheduleConversation(ctx);
});

// Handle text messages
bot.on("message:text", async (ctx) => {
  // Check if we're in a schedule conversation and still need text input
  if (ctx.session && ctx.session.scheduleState !== ScheduleState.IDLE) {
    // For group/teacher ID input, we still need text input
    // But we'll modify the handlers to use buttons for group/teacher selection too
    await handleScheduleResponse(ctx);
  } else {
    // Regular message handling
    await ctx.reply("❌ Извините, я не понимаю эту команду. Введите /help для получения списка доступных команд.");
  }
});

// Start the bot
bot.start();

console.log("BSAC Schedule Bot is running...");