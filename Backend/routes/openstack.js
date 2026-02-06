const express = require('express');
const router = express.Router();
const openstack = require('../config/openstack');

// Get OpenStack connection status
router.get('/status', async (req, res, next) => {
  try {
    const token = await openstack.getAuthToken();
    res.json({
      success: true,
      connected: !!token,
      message: 'Successfully connected to OpenStack',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      connected: false,
      message: 'Failed to connect to OpenStack',
      error: error.message
    });
  }
});

// Get networks
router.get('/networks', async (req, res, next) => {
  try {
    const data = await openstack.listNetworks();
    res.json({
      success: true,
      networks: data.networks || []
    });
  } catch (error) {
    next(error);
  }
});

// Get floating IPs
router.get('/floatingips', async (req, res, next) => {
  try {
    const data = await openstack.listFloatingIPs();
    res.json({
      success: true,
      floatingips: data.floatingips || []
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

