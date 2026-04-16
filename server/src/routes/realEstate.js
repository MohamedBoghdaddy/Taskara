const express = require("express");
const { authenticate } = require("../middleware/auth");
const controller = require("../controllers/realEstateController");

const router = express.Router();

router.use(authenticate);

router.get("/dashboard", controller.getDashboard);
router.get("/leads", controller.getLeads);
router.patch("/leads/:id", controller.updateLead);
router.get("/owners", controller.getOwners);
router.post("/owners", controller.createOwner);
router.patch("/owners/:id", controller.updateOwner);
router.get("/properties", controller.getProperties);
router.post("/properties", controller.createProperty);
router.patch("/properties/:id", controller.updateProperty);
router.get("/deals", controller.getDeals);
router.post("/deals", controller.createDeal);
router.patch("/deals/:id", controller.updateDeal);
router.get("/viewings", controller.getViewings);
router.post("/viewings", controller.createViewing);
router.patch("/viewings/:id", controller.updateViewing);
router.get("/settlements", controller.getSettlements);
router.post("/settlements", controller.createSettlement);
router.patch("/settlements/:id", controller.updateSettlement);
router.get("/maintenance", controller.getMaintenanceRequests);
router.post("/maintenance", controller.createMaintenanceRequest);
router.post("/ai/suggestions", controller.getAiSuggestions);

module.exports = router;
