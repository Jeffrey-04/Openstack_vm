const express = require('express');
const router = express.Router();
const openstack = require('../config/openstack');
const scalingController = require('../controllers/scalingController');

// List all VMs
router.get('/', async (req, res, next) => {
  try {
    const data = await openstack.listServers();
    res.json({
      success: true,
      count: data.servers?.length || 0,
      servers: data.servers || []
    });
  } catch (error) {
    next(error);
  }
});

// Scaling (must be before /:id to avoid "scaling-policy" as id)
router.get('/:id/scaling-policy', scalingController.getScalingPolicy);
router.put('/:id/scaling-policy', scalingController.putScalingPolicy);
router.get('/:id/metrics', scalingController.getMetrics);
router.get('/:id/scaling-history', scalingController.getScalingHistory);

// Get specific VM
router.get('/:id', async (req, res, next) => {
  try {
    const data = await openstack.getServer(req.params.id);
    res.json({
      success: true,
      server: data.server
    });
  } catch (error) {
    next(error);
  }
});

// Create new VM
router.post('/', async (req, res, next) => {
  try {
    const { name, flavorRef, imageRef, networkId, keyName } = req.body;

    if (!name || !flavorRef || !imageRef) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields: name, flavorRef, imageRef',
          status: 400
        }
      });
    }

    const serverData = {
      name,
      flavorRef,
      imageRef,
      networks: networkId ? [{ uuid: networkId }] : 'auto',
    };

    if (keyName) {
      serverData.key_name = keyName;
    }

    const data = await openstack.createServer(serverData);
    res.status(201).json({
      success: true,
      message: 'VM created successfully',
      server: data.server
    });
  } catch (error) {
    next(error);
  }
});

// Delete VM
router.delete('/:id', async (req, res, next) => {
  try {
    await openstack.deleteServer(req.params.id);
    res.json({
      success: true,
      message: 'VM deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// VM Actions (start, stop, reboot, etc.)
router.post('/:id/action', async (req, res, next) => {
  try {
    const { action } = req.body;
    const serverId = req.params.id;

    let actionBody;
    switch (action) {
      case 'start':
        actionBody = { 'os-start': null };
        break;
      case 'stop':
        actionBody = { 'os-stop': null };
        break;
      case 'reboot':
        actionBody = { reboot: { type: req.body.rebootType || 'SOFT' } };
        break;
      case 'pause':
        actionBody = { pause: null };
        break;
      case 'unpause':
        actionBody = { unpause: null };
        break;
      case 'suspend':
        actionBody = { suspend: null };
        break;
      case 'resume':
        actionBody = { resume: null };
        break;
      default:
        return res.status(400).json({
          error: {
            message: 'Invalid action. Valid actions: start, stop, reboot, pause, unpause, suspend, resume',
            status: 400
          }
        });
    }

    await openstack.serverAction(serverId, actionBody);
    res.json({
      success: true,
      message: `VM ${action} action executed successfully`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

