const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDatabases, createDatabase, getDatabase, updateDatabase, getRecords, createRecord, updateRecord, deleteRecord } = require('../controllers/databasesController');

router.use(authenticate);
router.get('/', getDatabases);
router.post('/', createDatabase);
router.get('/:id', getDatabase);
router.patch('/:id', updateDatabase);
router.get('/:id/records', getRecords);
router.post('/:id/records', createRecord);
router.patch('/:id/records/:recordId', updateRecord);
router.delete('/:id/records/:recordId', deleteRecord);

module.exports = router;
