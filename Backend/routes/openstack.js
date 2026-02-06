const express = require('express');
const router = express.Router();
const openstack = require('../config/openstack');
const logger = require('../utils/logger');

// Get OpenStack connection status
router.get('/status', async (req, res, next) => {
  try {
    logger.info('OpenStack: get status');
    const token = await openstack.getAuthToken();
    res.json({
      success: true,
      connected: !!token,
      message: 'Successfully connected to OpenStack',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('OpenStack status:', error.message);
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
    logger.info('OpenStack: list networks');
    const data = await openstack.listNetworks();
    res.json({
      success: true,
      networks: data.networks || []
    });
  } catch (error) {
    logger.error('OpenStack networks:', error.message);
    next(error);
  }
});

// Get floating IPs
router.get('/floatingips', async (req, res, next) => {
  try {
    logger.info('OpenStack: list floatingips');
    const data = await openstack.listFloatingIPs();
    res.json({
      success: true,
      floatingips: data.floatingips || []
    });
  } catch (error) {
    logger.error('OpenStack floatingips:', error.message);
    next(error);
  }
});

module.exports = router;

