process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "workflow-test-secret";
process.env.PLATFORM_ADMIN_EMAILS = process.env.PLATFORM_ADMIN_EMAILS || "platform-admin@test.local";

const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../../src/app");
const AgencyAccount = require("../../src/models/AgencyAccount");
const Candidate = require("../../src/models/Candidate");
const DocumentChecklist = require("../../src/models/DocumentChecklist");
const ExecutionItem = require("../../src/models/ExecutionItem");
const IntegrationSettings = require("../../src/models/IntegrationSettings");
const RealEstateLead = require("../../src/models/RealEstateLead");
const StartupInitiative = require("../../src/models/StartupInitiative");
const Task = require("../../src/models/Task");
const User = require("../../src/models/User");
const WorkerJobRun = require("../../src/models/WorkerJobRun");
const WorkflowRun = require("../../src/models/WorkflowRun");
const Workspace = require("../../src/models/Workspace");
const WorkspaceOperationalState = require("../../src/models/WorkspaceOperationalState");
const WorkspaceMember = require("../../src/models/WorkspaceMember");

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
};

const resetDatabase = async () => {
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

const createHarness = async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), {
    dbName: "taskara-workflow-tests",
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const request = async (path, options = {}) => {
    const headers = { ...(options.headers || {}) };
    let body = options.body;

    if (body !== undefined && body !== null && typeof body !== "string" && !(body instanceof Buffer)) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body,
    });

    return {
      status: response.status,
      body: await parseResponse(response),
    };
  };

  const createUser = async ({
    name = "Workflow User",
    email = `user-${new mongoose.Types.ObjectId()}@test.local`,
    defaultWorkspaceId = null,
  } = {}) =>
    User.create({
      name,
      email,
      passwordHash: "test-hash",
      defaultWorkspaceId,
    });

  const createWorkspace = async ({
    owner,
    name = "Workflow Workspace",
    members = [],
    setOwnerDefaultWorkspace = true,
  }) => {
    const workspace = await Workspace.create({
      name,
      ownerId: owner._id,
      memberIds: [owner._id, ...members.map((member) => member.user._id)],
    });

    const membershipDocs = [
      {
        workspaceId: workspace._id,
        userId: owner._id,
        role: "owner",
        routingProfile: {
          title: "Workspace owner",
          routingTags: [],
          audienceTypes: [],
          capacityWeight: 1,
        },
      },
      ...members.map((member) => ({
        workspaceId: workspace._id,
        userId: member.user._id,
        role: member.role || "editor",
        routingProfile: member.routingProfile || {
          title: member.role || "editor",
          routingTags: [],
          audienceTypes: [],
          capacityWeight: 1,
        },
      })),
    ];

    await WorkspaceMember.insertMany(membershipDocs);

    if (setOwnerDefaultWorkspace) {
      owner.defaultWorkspaceId = workspace._id;
      await owner.save();
    }

    for (const member of members) {
      if (member.setDefaultWorkspace) {
        member.user.defaultWorkspaceId = workspace._id;
        await member.user.save();
      }
    }

    return workspace;
  };

  const createIntegration = async ({ workspaceId, connectedBy, provider, config = {} }) =>
    IntegrationSettings.create({
      workspaceId,
      connectedBy,
      provider,
      isActive: true,
      ...config,
    });

  const signInAs = (user) =>
    jwt.sign(
      {
        userId: String(user._id),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

  const authHeadersFor = (user) => ({
    Authorization: `Bearer ${signInAs(user)}`,
  });

  const close = async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await mongoose.disconnect();
    await mongod.stop();
  };

  return {
    AgencyAccount,
    Candidate,
    DocumentChecklist,
    ExecutionItem,
    IntegrationSettings,
    RealEstateLead,
    StartupInitiative,
    Task,
    User,
    WorkerJobRun,
    WorkflowRun,
    Workspace,
    WorkspaceOperationalState,
    WorkspaceMember,
    authHeadersFor,
    close,
    createIntegration,
    createUser,
    createWorkspace,
    request,
    resetDatabase,
  };
};

module.exports = {
  createHarness,
  resetDatabase,
};
