const express = require('express');
const path = require('path');
const router = express.Router();

// /admin/users
router.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin/users.html'));
});

// /admin/events
router.get('/events', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin/events.html'));
});

module.exports = router;
