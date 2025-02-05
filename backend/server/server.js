const express = require("express");
const cors = require("cors");
const { Chess } = require("chess.js");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

let game = new Chess();

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the Chess Backend!");
});

// Get current game state
app.get("/api/game", (req, res) => {
  res.json({ fen: game.fen() });
});

/**
 * Fetches the bot's move using the Python script (predict_move.py).
 */
async function getBotMove(fen) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "predict_move.py");
    console.log("🟢 Executing Python script:", `python3 ${scriptPath} "${fen}"`);
    const botProcess = spawn("python3", [scriptPath, fen]);

    let botMove = "";
    let errorMessage = "";

    botProcess.stdout.on("data", (data) => {
      botMove += data.toString();
    });

    botProcess.stderr.on("data", (data) => {
      errorMessage += data.toString();
    });

    botProcess.on("close", (code) => {
      botMove = botMove.trim();
      console.log("📜 Raw bot move output:", botMove);

      // Only reject on non-zero exit codes
      if (code !== 0) {
        console.error("❌ Bot error:", errorMessage || `Process exited with code ${code}`);
        return reject(new Error("Bot failed to make a move."));
      }

      // Extract first valid UCI move using regex
      const match = botMove.match(/^([a-h][1-8]){2}$/m);
      if (!match) {
        console.error("❌ Invalid bot move format:", botMove);
        return reject(new Error("Invalid move received from bot."));
      }

      const validMove = match[0];
      console.log("✅ Bot move received:", validMove);
      resolve(validMove);
    });

    // Fail-safe timeout
const timeout = setTimeout(() => {
  console.error("⏳ Bot move timeout. Killing process.");
  botProcess.kill("SIGTERM");
  reject(new Error("Bot move timeout."));
}, 15000); // Increase timeout to 10 seconds


    botProcess.on("exit", () => clearTimeout(timeout));
  });
}

/**
 * Handles the player's move and gets the bot's response.
 */
app.post("/api/move", async (req, res) => {
  const { from, to, promotion } = req.body;
  let botMoveUCI = null;

  try {
    // Validate and play the player's move
    const playerMove = game.move({ from, to, promotion });
    if (!playerMove) {
      return res.status(400).json({ success: false, error: "Invalid move by player" });
    }
    console.log("✅ Player move:", `${from}${to}`);
    console.log("🔄 FEN after player move:", game.fen());

    if (game.isGameOver()) {
      return res.json({ success: false, error: "Game over" });
    }

    // Get the bot's move
    try {
      botMoveUCI = await getBotMove(game.fen());
      if (botMoveUCI) {
        const botMove = { from: botMoveUCI.slice(0, 2), to: botMoveUCI.slice(2, 4) };
        console.log("🔄 Before bot move:", game.fen());
        if (!game.move(botMove)) {
          throw new Error(`Bot move rejected: ${botMoveUCI}`);
        }
        console.log("✅ Bot move applied:", botMoveUCI);
        console.log("🔄 After bot move:", game.fen());
      }
    } catch (err) {
      console.error("❌ Bot move error:", err.message);
      return res.status(500).json({ success: false, error: "Bot failed to make a move." });
    }

    res.json({
      success: true,
      fen: game.fen(),
      botMove: botMoveUCI,
    });
  } catch (error) {
    console.error("❌ Error processing move:", error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Resets the game to the starting position.
 */
app.post("/api/reset", (req, res) => {
  game = new Chess();
  res.json({ success: true, fen: game.fen() });
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
