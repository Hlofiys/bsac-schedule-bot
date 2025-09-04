import dotenv from "dotenv";

// Load environment variables
dotenv.config();

console.log("Validating environment variables...");

// Check BOT_TOKEN
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  console.error("❌ BOT_TOKEN is not set in environment variables");
  process.exit(1);
} else if (botToken === "your_telegram_bot_token_here") {
  console.error(
    "❌ BOT_TOKEN is still set to the placeholder value. Please update it with your actual bot token.",
  );
  process.exit(1);
} else {
  console.log("✅ BOT_TOKEN is set correctly");
}

// Check API_BASE_URL
const apiBaseURL = process.env.API_BASE_URL;
if (!apiBaseURL) {
  console.error("❌ API_BASE_URL is not set in environment variables");
  process.exit(1);
} else if (apiBaseURL === "https://bsac-api.example.com") {
  console.error(
    "❌ API_BASE_URL is still set to the placeholder value. Please update it with the actual API URL.",
  );
  process.exit(1);
} else {
  console.log("✅ API_BASE_URL is set correctly");
}

console.log("✅ All environment variables are properly configured");
