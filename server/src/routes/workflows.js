const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const workflowsController = require("../controllers/workflowsController");

router.get("/templates/public", workflowsController.getTemplates);

router.use(authenticate);

router.get("/templates", workflowsController.getTemplates);
router.get("/dashboard", workflowsController.getDashboard);
router.get("/analytics", workflowsController.getAnalytics);
router.get("/items", workflowsController.getItems);
router.post("/ingest", workflowsController.ingest);
router.patch("/items/:id", workflowsController.patchItem);
router.post("/items/:id/execute", workflowsController.executeItem);
router.post("/items/:id/approve", workflowsController.approveItem);
router.post("/items/:id/control", workflowsController.controlItem);
router.post("/items/:id/assign", workflowsController.assignItem);
router.post("/items/:id/feedback", workflowsController.submitFeedback);
router.post("/migration/preview", workflowsController.migrationPreview);

module.exports = router;
