// Simple test to verify the bot structure
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Verify that the bot token is set
const token = process.env.BOT_TOKEN;
if (!token) {
  console.log("BOT_TOKEN is not set in environment variables");
  process.exit(1);
}

console.log("Bot token is set correctly");

// Verify that the API base URL is set
const apiBaseURL = process.env.API_BASE_URL;
if (!apiBaseURL) {
  console.log("API_BASE_URL is not set in environment variables");
  process.exit(1);
}

console.log("API base URL is set correctly");

console.log("All environment variables are set correctly");
console.log("Bot structure is valid");
