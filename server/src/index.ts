import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "node:http";
import { meetingsRouter } from "./routes/meetings.js";
import { analyzeRouter } from "./routes/analyze.js";
import { initLiveSocketServer } from "./services/live-socket.js";

import path from "node:path";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/api/meetings", meetingsRouter);
app.use("/api/meetings", analyzeRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const server = createServer(app);
initLiveSocketServer(server);

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => {
    console.log(`MeetingMind Server running on http://localhost:${port}`);
    console.log(`Live WebSocket stream listening on ws://localhost:${port}/ws/live-meeting`);
  });
}

export default app;
