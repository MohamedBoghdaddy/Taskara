const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const { createHarness } = require("../helpers/workflowTestHarness");

let harness;

const get = (path, user, headers = {}) =>
  harness.request(path, {
    method: "GET",
    headers: user ? { ...harness.authHeadersFor(user), ...headers } : headers,
  });

const post = (path, user, body, headers = {}) =>
  harness.request(path, {
    method: "POST",
    headers: user ? { ...harness.authHeadersFor(user), ...headers } : headers,
    body,
  });

const patch = (path, user, body, headers = {}) =>
  harness.request(path, {
    method: "PATCH",
    headers: user ? { ...harness.authHeadersFor(user), ...headers } : headers,
    body,
  });

const del = (path, user, headers = {}) =>
  harness.request(path, {
    method: "DELETE",
    headers: user ? { ...harness.authHeadersFor(user), ...headers } : headers,
  });

before(async () => {
  harness = await createHarness();
});

after(async () => {
  await harness.close();
});

beforeEach(async () => {
  await harness.resetDatabase();
});

test("auth routes validate input, normalize email, protect profile updates, and reject invalid tokens safely", async () => {
  const invalidRegister = await post("/api/auth/register", null, {
    name: "",
    email: "bad-email",
    password: "short",
  });
  assert.equal(invalidRegister.status, 400);
  assert.match(invalidRegister.body.error, /name is required/i);

  const registerResponse = await post("/api/auth/register", null, {
    name: "  Student User  ",
    email: "  Student.User@Test.Local  ",
    password: "password123",
  });
  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.user.email, "student.user@test.local");
  assert.equal(registerResponse.body.user.workspaceContext.vertical, "core");
  assert.equal(registerResponse.body.user.workspaceContext.surfaceMode, "operator");
  assert.ok(registerResponse.body.accessToken);
  assert.ok(registerResponse.body.refreshToken);

  const duplicateRegister = await post("/api/auth/register", null, {
    name: "Duplicate",
    email: "student.user@test.local",
    password: "password123",
  });
  assert.equal(duplicateRegister.status, 409);

  const missingLoginPassword = await post("/api/auth/login", null, {
    email: "student.user@test.local",
  });
  assert.equal(missingLoginPassword.status, 400);
  assert.match(missingLoginPassword.body.error, /password is required/i);

  const loginResponse = await post("/api/auth/login", null, {
    email: " STUDENT.USER@TEST.LOCAL ",
    password: "password123",
  });
  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.user.email, "student.user@test.local");

  const meResponse = await harness.request("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${loginResponse.body.accessToken}`,
    },
  });
  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.user.email, "student.user@test.local");

  const persistedUser = await harness.User.findOne({ email: "student.user@test.local" });
  const originalWorkspaceId = String(persistedUser.defaultWorkspaceId);
  const originalRefreshTokens = [...persistedUser.refreshTokens];

  const profileResponse = await harness.request("/api/auth/profile", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${loginResponse.body.accessToken}`,
    },
    body: {
      name: "Updated User",
      preferences: { theme: "dark" },
      defaultWorkspaceId: new mongoose.Types.ObjectId().toString(),
      refreshTokens: ["tampered-token"],
    },
  });
  assert.equal(profileResponse.status, 200);
  assert.equal(profileResponse.body.user.name, "Updated User");
  assert.equal(profileResponse.body.user.preferences.theme, "dark");

  const reloadedUser = await harness.User.findById(persistedUser._id);
  assert.equal(String(reloadedUser.defaultWorkspaceId), originalWorkspaceId);
  assert.deepEqual(reloadedUser.refreshTokens, originalRefreshTokens);

  const refreshResponse = await post("/api/auth/refresh", null, {
    refreshToken: loginResponse.body.refreshToken,
  });
  assert.equal(refreshResponse.status, 200);
  assert.ok(refreshResponse.body.accessToken);
  assert.ok(refreshResponse.body.refreshToken);
  assert.notEqual(refreshResponse.body.refreshToken, loginResponse.body.refreshToken);

  const logoutNoAuth = await post("/api/auth/logout", null, {
    refreshToken: refreshResponse.body.refreshToken,
  });
  assert.equal(logoutNoAuth.status, 401);

  const logoutResponse = await harness.request("/api/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginResponse.body.accessToken}`,
    },
    body: {
      refreshToken: refreshResponse.body.refreshToken,
    },
  });
  assert.equal(logoutResponse.status, 200);

  const refreshAfterLogout = await post("/api/auth/refresh", null, {
    refreshToken: refreshResponse.body.refreshToken,
  });
  assert.equal(refreshAfterLogout.status, 401);

  const expiredToken = jwt.sign(
    { userId: String(persistedUser._id) },
    process.env.JWT_SECRET,
    { expiresIn: -1 },
  );
  const expiredResponse = await get("/api/auth/me", null, {
    Authorization: `Bearer ${expiredToken}`,
  });
  assert.equal(expiredResponse.status, 401);
  assert.match(expiredResponse.body.error, /expired/i);

  const invalidTokenResponse = await get("/api/auth/me", null, {
    Authorization: "Bearer definitely-invalid-token",
  });
  assert.equal(invalidTokenResponse.status, 401);
  assert.match(invalidTokenResponse.body.error, /invalid token/i);
});

test("ai workspace endpoints return structured summaries and safe command previews", async () => {
  const owner = await harness.createUser({ email: "ai-platform@test.local" });
  await harness.createWorkspace({ owner, name: "AI Platform" });

  await post("/api/projects", owner, {
    name: "Launch Ops",
    status: "active",
  });
  await post("/api/tasks", owner, {
    title: "Prepare client report",
    status: "todo",
    priority: "high",
  });
  await post("/api/notes", owner, {
    title: "Weekly campaign note",
    content: "Northwind campaign review and next steps",
  });

  const summaryResponse = await post("/api/ai/workspace-summary", owner, {
    vertical: "agencies",
    surfaceMode: "operator",
  });
  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryResponse.body.vertical, "agencies");
  assert.equal(summaryResponse.body.surfaceMode, "operator");
  assert.ok(Array.isArray(summaryResponse.body.whatMattersNow));
  assert.ok(Array.isArray(summaryResponse.body.recommendations));
  assert.ok(Array.isArray(summaryResponse.body.sources));
  assert.ok(summaryResponse.body.prediction);
  assert.ok(Array.isArray(summaryResponse.body.prediction.factors));

  const missingQuestion = await post("/api/ai/answer-from-workspace", owner, {});
  assert.equal(missingQuestion.status, 400);

  const missingCommand = await post("/api/ai/command-center", owner, {});
  assert.equal(missingCommand.status, 400);

  const commandResponse = await post("/api/ai/command-center", owner, {
    command: "Create campaign for Ramadan ads and prep the report",
    vertical: "agencies",
    surfaceMode: "operator",
  });
  assert.equal(commandResponse.status, 200);
  assert.equal(commandResponse.body.intent, "create_campaign");
  assert.ok(Array.isArray(commandResponse.body.proposedActions));
  assert.ok(Array.isArray(commandResponse.body.recommendations));
  assert.ok(Array.isArray(commandResponse.body.executionPreview.acceptedAliases));
  assert.equal(commandResponse.body.executionPreview.safeToAutoRun, false);
});

test("ai endpoints keep canonical keys and fallback structures even on sparse workspace data", async () => {
  const owner = await harness.createUser({ email: "ai-sparse@test.local" });
  await harness.createWorkspace({ owner, name: "Sparse AI" });

  const summaryResponse = await post("/api/ai/workspace-summary", owner, {
    vertical: "study",
    surfaceMode: "student",
  });
  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryResponse.body.vertical, "student");
  assert.equal(summaryResponse.body.surfaceMode, "student");
  assert.ok(Array.isArray(summaryResponse.body.sources));
  assert.ok(Array.isArray(summaryResponse.body.whatMattersNow));
  assert.ok(Array.isArray(summaryResponse.body.recommendations));
  assert.equal(typeof summaryResponse.body.headline, "string");
  assert.equal(typeof summaryResponse.body.summary, "string");

  const commandResponse = await post("/api/ai/command-center", owner, {
    command: "  follow up with the buyer and prep the settlement review  ",
    vertical: "real-estate",
    surfaceMode: "operator",
  });
  assert.equal(commandResponse.status, 200);
  assert.equal(commandResponse.body.vertical, "realestate");
  assert.equal(commandResponse.body.surfaceMode, "operator");
  assert.equal(typeof commandResponse.body.directAnswer, "string");
  assert.ok(Array.isArray(commandResponse.body.reasoning));
  assert.ok(Array.isArray(commandResponse.body.proposedActions));
  assert.ok(Array.isArray(commandResponse.body.recommendations));
  assert.ok(Array.isArray(commandResponse.body.executionPreview.acceptedAliases));
});

test("upload routes enforce auth, respect workspace isolation, avoid route shadowing, and fail safely", async () => {
  const ownerA = await harness.createUser({ email: "upload-a@test.local" });
  const ownerB = await harness.createUser({ email: "upload-b@test.local" });

  await harness.createWorkspace({ owner: ownerA, name: "Uploads A" });
  await harness.createWorkspace({ owner: ownerB, name: "Uploads B" });

  const entityId = new mongoose.Types.ObjectId().toString();

  const unauthenticatedList = await harness.request(`/api/uploads/entity/${entityId}`);
  assert.equal(unauthenticatedList.status, 401);

  const uploadBody = new FormData();
  uploadBody.append("entityType", "Task");
  uploadBody.append("entityId", entityId);
  uploadBody.append("file", new Blob(["hello upload"], { type: "text/plain" }), "brief.txt");

  const uploadResponse = await post("/api/uploads/attachment", ownerA, uploadBody);
  assert.equal(uploadResponse.status, 201);
  assert.equal(uploadResponse.body.attachment.entityType, "Task");
  assert.equal(String(uploadResponse.body.attachment.workspaceId), String(ownerA.defaultWorkspaceId));

  const attachmentId = uploadResponse.body.attachment._id;

  const listResponse = await get(`/api/uploads/entity/${entityId}`, ownerA);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.attachments.length, 1);
  assert.equal(listResponse.body.attachments[0]._id, attachmentId);

  const metadataResponse = await get(`/api/uploads/${attachmentId}`, ownerA);
  assert.equal(metadataResponse.status, 200);
  assert.equal(metadataResponse.body._id, attachmentId);

  const foreignList = await get(`/api/uploads/entity/${entityId}`, ownerB);
  assert.equal(foreignList.status, 200);
  assert.equal(foreignList.body.attachments.length, 0);

  const foreignMetadata = await get(`/api/uploads/${attachmentId}`, ownerB);
  assert.equal(foreignMetadata.status, 404);

  const invalidTypeBody = new FormData();
  invalidTypeBody.append("file", new Blob(["{}"], { type: "application/json" }), "payload.json");
  const invalidTypeResponse = await post("/api/uploads/attachment", ownerA, invalidTypeBody);
  assert.equal(invalidTypeResponse.status, 400);
  assert.match(invalidTypeResponse.body.error, /file type not allowed/i);

  const invalidIdResponse = await get("/api/uploads/not-a-valid-id", ownerA);
  assert.equal(invalidIdResponse.status, 400);
  assert.match(invalidIdResponse.body.error, /invalid id format/i);

  const foreignDelete = await del(`/api/uploads/${attachmentId}`, ownerB);
  assert.equal(foreignDelete.status, 404);

  const deleteResponse = await del(`/api/uploads/${attachmentId}`, ownerA);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteResponse.body.success, true);

  const missingAfterDelete = await get(`/api/uploads/${attachmentId}`, ownerA);
  assert.equal(missingAfterDelete.status, 404);
});

test("tasks, notes, and projects CRUD flows persist correctly, require auth, and isolate workspaces", async () => {
  const ownerA = await harness.createUser({ email: "crud-a@test.local" });
  const ownerB = await harness.createUser({ email: "crud-b@test.local" });

  await harness.createWorkspace({ owner: ownerA, name: "CRUD A" });
  await harness.createWorkspace({ owner: ownerB, name: "CRUD B" });

  const unauthenticatedTasks = await harness.request("/api/tasks");
  assert.equal(unauthenticatedTasks.status, 401);

  const projectResponse = await post("/api/projects", ownerA, {
    name: "Launch Ops",
    status: "active",
  });
  assert.equal(projectResponse.status, 201);
  const projectId = projectResponse.body._id;

  const taskValidation = await post("/api/tasks", ownerA, {
    status: "todo",
  });
  assert.equal(taskValidation.status, 400);
  assert.match(taskValidation.body.error, /validation error/i);

  const taskResponse = await post("/api/tasks", ownerA, {
    title: "Ship release notes",
    status: "todo",
    priority: "high",
    projectId,
  });
  assert.equal(taskResponse.status, 201);
  const taskId = taskResponse.body._id;

  const noteResponse = await post("/api/notes", ownerA, {
    title: "Launch checklist",
    content: "QA, publish, notify stakeholders",
    projectId,
  });
  assert.equal(noteResponse.status, 201);
  const noteId = noteResponse.body._id;

  const projectDetails = await get(`/api/projects/${projectId}`, ownerA);
  assert.equal(projectDetails.status, 200);
  assert.equal(projectDetails.body.project.name, "Launch Ops");
  assert.equal(projectDetails.body.tasks.length, 1);
  assert.equal(projectDetails.body.notes.length, 1);

  const tasksList = await get("/api/tasks", ownerA);
  assert.equal(tasksList.status, 200);
  assert.equal(tasksList.body.total, 1);
  assert.equal(tasksList.body.tasks[0].title, "Ship release notes");

  const updatedTask = await patch(`/api/tasks/${taskId}`, ownerA, {
    status: "done",
  });
  assert.equal(updatedTask.status, 200);
  assert.equal(updatedTask.body.status, "done");
  assert.ok(updatedTask.body.completedAt);

  const invalidTaskStatus = await patch(`/api/tasks/${taskId}`, ownerA, {
    status: "not-real",
  });
  assert.equal(invalidTaskStatus.status, 400);

  const updatedNote = await patch(`/api/notes/${noteId}`, ownerA, {
    content: "QA, publish, notify, and archive",
    isPinned: true,
  });
  assert.equal(updatedNote.status, 200);
  assert.equal(updatedNote.body.isPinned, true);
  assert.equal(updatedNote.body.contentText, "QA, publish, notify, and archive");

  const fetchedNote = await get(`/api/notes/${noteId}`, ownerA);
  assert.equal(fetchedNote.status, 200);
  assert.equal(fetchedNote.body.title, "Launch checklist");

  const foreignTaskAccess = await get(`/api/tasks/${taskId}`, ownerB);
  assert.equal(foreignTaskAccess.status, 404);

  const invalidTaskId = await get("/api/tasks/not-a-valid-id", ownerA);
  assert.equal(invalidTaskId.status, 400);

  const projectNotFound = await get(`/api/projects/${new mongoose.Types.ObjectId()}`, ownerA);
  assert.equal(projectNotFound.status, 404);

  const deleteTaskResponse = await del(`/api/tasks/${taskId}`, ownerA);
  assert.equal(deleteTaskResponse.status, 200);

  const deletedTask = await get(`/api/tasks/${taskId}`, ownerA);
  assert.equal(deletedTask.status, 404);
});
