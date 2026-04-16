const express = require("express");
const { authenticate } = require("../middleware/auth");
const { getVerticalManifest } = require("../services/verticals/verticalManifestService");

const router = express.Router();

router.use(authenticate);
router.get("/manifest", (req, res) => {
  res.json(getVerticalManifest("student"));
});

module.exports = router;
