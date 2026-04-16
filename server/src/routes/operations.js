const express = require("express");
const { authenticate } = require("../middleware/auth");
const operationsController = require("../controllers/operationsController");

const router = express.Router();

router.use(authenticate);

router.get("/overview", operationsController.getOverview);
router.get("/onboarding", operationsController.getOnboarding);
router.post("/onboarding/select-audience", operationsController.chooseOnboardingAudience);
router.post("/onboarding/run-demo", operationsController.runOnboarding);
router.post("/onboarding/complete", operationsController.finishOnboarding);
router.post("/workflow-tests/:audienceType/run", operationsController.runWorkflowTest);
router.post("/connectors/:provider/test", operationsController.runConnectorVerification);
router.post("/first-users/:cohortKey", operationsController.saveFirstUserCohort);
router.post("/launch-criteria/:criterionKey", operationsController.saveLaunchCriterion);

module.exports = router;
