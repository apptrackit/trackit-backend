const express = require('express');
const router = express.Router();
const apiDocs = require('../config/apiDocs');

router.get('/', (req, res) => {
  res.json(apiDocs);
});

module.exports = router;
