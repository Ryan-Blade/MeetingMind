import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { meetingsRouter } from "./routes/meetings.js";
import { analyzeRouter } from "./routes/analyze.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/meetings", meetingsRouter);
app.use("/api/meetings", analyzeRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`MeetingMind Server running on http://localhost:${port}`);
  });
}

export default app;
