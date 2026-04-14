const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { errorHandler } = require("./middleware/errorHandler");

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const inboxRoutes = require("./routes/inbox");
const notesRoutes = require("./routes/notes");
const dailyNotesRoutes = require("./routes/dailyNotes");
const tasksRoutes = require("./routes/tasks");
const projectsRoutes = require("./routes/projects");
const pomodoroRoutes = require("./routes/pomodoro");
const searchRoutes = require("./routes/search");
const remindersRoutes = require("./routes/reminders");
const templatesRoutes = require("./routes/templates");
const databasesRoutes = require("./routes/databases");
const collaborationRoutes = require("./routes/collaboration");
const aiRoutes = require("./routes/ai");
const tagsRoutes = require("./routes/tags");
const linksRoutes = require("./routes/links");
const boardsRoutes = require("./routes/boards");
const sprintsRoutes = require("./routes/sprints");
// New routes
const habitsRoutes = require("./routes/habits");
const analyticsRoutes = require("./routes/analytics");
const webhooksRoutes = require("./routes/webhooks");
const automationsRoutes = require("./routes/automations");
const exportsRoutes = require("./routes/exports");
const uploadsRoutes = require("./routes/uploads");
const subscriptionsRoutes = require("./routes/subscriptions");
const noteVersionsRoutes = require("./routes/noteVersions");
const integrationsRoutes = require("./routes/integrations");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow serving uploaded files
  }),
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date() }),
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/daily-notes", dailyNotesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/pomodoro", pomodoroRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/databases", databasesRoutes);
app.use("/api/collaboration", collaborationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/links", linksRoutes);
app.use("/api/boards", boardsRoutes);
app.use("/api/sprints", sprintsRoutes);
// New
app.use("/api/habits", habitsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/automations", automationsRoutes);
app.use("/api/exports", exportsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/note-versions", noteVersionsRoutes);
app.use("/api/integrations", integrationsRoutes);

app.use(errorHandler);

module.exports = app;
