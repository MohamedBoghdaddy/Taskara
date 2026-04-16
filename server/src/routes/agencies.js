const express = require("express");
const { authenticate } = require("../middleware/auth");
const controller = require("../controllers/agenciesController");

const router = express.Router();

router.use(authenticate);

router.get("/dashboard", controller.getDashboard);
router.get("/clients", controller.getClients);
router.post("/clients", controller.createClient);
router.patch("/clients/:id", controller.updateClient);
router.get("/campaigns", controller.getCampaigns);
router.post("/campaigns", controller.createCampaign);
router.patch("/campaigns/:id", controller.updateCampaign);
router.get("/content", controller.getContentItems);
router.post("/content", controller.createContentItem);
router.patch("/content/:id", controller.updateContentItem);
router.get("/reports", controller.getReports);
router.post("/reports", controller.createReport);
router.patch("/reports/:id", controller.updateReport);
router.get("/retainers", controller.getRetainers);
router.post("/retainers", controller.createRetainer);
router.get("/approvals", controller.getApprovals);
router.post("/ai/suggestions", controller.getAiSuggestions);

module.exports = router;
