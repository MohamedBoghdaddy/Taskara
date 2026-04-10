const DatabaseDefinition = require('../../models/DatabaseDefinition');
const DatabaseRecord = require('../../models/DatabaseRecord');
const { v4: uuidv4 } = require('uuid');

const getDatabases = async (workspaceId) => {
  return DatabaseDefinition.find({ workspaceId }).sort({ createdAt: -1 });
};

const createDatabase = async (workspaceId, userId, data) => {
  const db = await DatabaseDefinition.create({
    workspaceId,
    createdBy: userId,
    fields: [{ key: 'title', label: 'Title', type: 'text', required: true }],
    views: [{ id: uuidv4(), name: 'All Items', type: 'table', filters: [], sorts: [] }],
    ...data,
  });
  return db;
};

const getDatabase = async (workspaceId, dbId) => {
  const db = await DatabaseDefinition.findOne({ _id: dbId, workspaceId });
  if (!db) throw { status: 404, message: 'Database not found' };
  return db;
};

const updateDatabase = async (workspaceId, dbId, data) => {
  const db = await DatabaseDefinition.findOneAndUpdate(
    { _id: dbId, workspaceId },
    data,
    { new: true }
  );
  if (!db) throw { status: 404, message: 'Database not found' };
  return db;
};

const getRecords = async (workspaceId, dbId, { search, page = 1, limit = 100 }) => {
  const filter = { workspaceId, databaseId: dbId };
  if (search) filter['values.title'] = new RegExp(search, 'i');

  const records = await DatabaseRecord.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await DatabaseRecord.countDocuments(filter);
  return { records, total };
};

const createRecord = async (workspaceId, userId, dbId, values) => {
  return DatabaseRecord.create({ workspaceId, databaseId: dbId, values, createdBy: userId });
};

const updateRecord = async (workspaceId, dbId, recordId, values) => {
  const record = await DatabaseRecord.findOneAndUpdate(
    { _id: recordId, workspaceId, databaseId: dbId },
    { values },
    { new: true }
  );
  if (!record) throw { status: 404, message: 'Record not found' };
  return record;
};

const deleteRecord = async (workspaceId, dbId, recordId) => {
  const record = await DatabaseRecord.findOneAndDelete({ _id: recordId, workspaceId, databaseId: dbId });
  if (!record) throw { status: 404, message: 'Record not found' };
  return record;
};

module.exports = { getDatabases, createDatabase, getDatabase, updateDatabase, getRecords, createRecord, updateRecord, deleteRecord };
