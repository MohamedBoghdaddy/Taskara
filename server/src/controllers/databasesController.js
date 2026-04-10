const databasesService = require('../services/databases/databasesService');
const { asyncHandler } = require('../middleware/errorHandler');

const getWorkspaceId = (req) => req.user.defaultWorkspaceId?.toString() || req.query.workspaceId;

const getDatabases = asyncHandler(async (req, res) => {
  const dbs = await databasesService.getDatabases(getWorkspaceId(req));
  res.json(dbs);
});

const createDatabase = asyncHandler(async (req, res) => {
  const db = await databasesService.createDatabase(getWorkspaceId(req), req.user._id, req.body);
  res.status(201).json(db);
});

const getDatabase = asyncHandler(async (req, res) => {
  const db = await databasesService.getDatabase(getWorkspaceId(req), req.params.id);
  res.json(db);
});

const updateDatabase = asyncHandler(async (req, res) => {
  const db = await databasesService.updateDatabase(getWorkspaceId(req), req.params.id, req.body);
  res.json(db);
});

const getRecords = asyncHandler(async (req, res) => {
  const result = await databasesService.getRecords(getWorkspaceId(req), req.params.id, req.query);
  res.json(result);
});

const createRecord = asyncHandler(async (req, res) => {
  const record = await databasesService.createRecord(getWorkspaceId(req), req.user._id, req.params.id, req.body.values);
  res.status(201).json(record);
});

const updateRecord = asyncHandler(async (req, res) => {
  const record = await databasesService.updateRecord(getWorkspaceId(req), req.params.id, req.params.recordId, req.body.values);
  res.json(record);
});

const deleteRecord = asyncHandler(async (req, res) => {
  await databasesService.deleteRecord(getWorkspaceId(req), req.params.id, req.params.recordId);
  res.json({ message: 'Record deleted' });
});

module.exports = { getDatabases, createDatabase, getDatabase, updateDatabase, getRecords, createRecord, updateRecord, deleteRecord };
