const express = require('express');
const router = express.Router();
const openstack = require('../config/openstack');
const scalingController = require('../controllers/scalingController');
const { authenticate } = require('../middleware/auth');
const { VM, VmRuntime, VMTemplate, ScalingPolicy } = require('../models');
const logger = require('../utils/logger');

async function findFlavorBySpecs(vcpus, ramGb, diskGb) {
  const data = await openstack.listFlavors();
  const flavors = (data.flavors || []).slice();
  const ramMb = Math.ceil((ramGb || 0) * 1024) || 512;
  const needVcpus = vcpus || 1;
  const needDisk = diskGb || 20;
  const candidates = flavors.filter(
    (f) => (f.vcpus || 0) >= needVcpus && (f.ram || 0) >= ramMb && (f.disk || 0) >= needDisk
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.vcpus * 1024 + a.ram) - (b.vcpus * 1024 + b.ram));
  return candidates[0];
}

// All VM routes require authentication
router.use(authenticate);

// List VMs for the current user (from DB, optionally sync status from OpenStack)
router.get('/', async (req, res, next) => {
  try {
    const projectId = req.user?.openstackProjectId || null;
    const vms = await VM.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']]
    });
    const servers = await Promise.all(
      vms.map(async (vm) => {
        try {
          const data = await openstack.getServer(vm.instanceId, projectId);
          return { ...data.server, dbId: vm.id, flavorId: vm.flavorId, expiresAt: vm.expiresAt };
        } catch {
          return { id: vm.instanceId, name: vm.instanceId, status: vm.status || 'UNKNOWN', dbId: vm.id, flavorId: vm.flavorId, expiresAt: vm.expiresAt };
        }
      })
    );
    res.json({
      success: true,
      count: servers.length,
      servers
    });
  } catch (error) {
    logger.error('VMs list:', error.message);
    next(error);
  }
});

// Scaling (must be before /:id to avoid "scaling-policy" as id)
router.get('/:id/scaling-policy', scalingController.getScalingPolicy);
router.put('/:id/scaling-policy', scalingController.putScalingPolicy);
router.get('/:id/metrics', scalingController.getMetrics);
router.get('/:id/scaling-history', scalingController.getScalingHistory);

router.get('/:id/console', async (req, res, next) => {
  try {
    const vm = await VM.findOne({ where: { instanceId: req.params.id, userId: req.userId } });
    if (!vm) {
      return res.status(404).json({ error: { message: 'VM not found', status: 404 } });
    }
    const projectId = req.user?.openstackProjectId || null;
    const url = await openstack.getConsoleUrl(req.params.id, projectId);
    if (!url) {
      return res.status(503).json({ error: { message: 'Console non disponible pour cette VM', status: 503 } });
    }
    res.json({ success: true, url });
  } catch (error) {
    next(error);
  }
});

// Get specific VM (must belong to current user), with flavor details for detail page
router.get('/:id', async (req, res, next) => {
  try {
    const vm = await VM.findOne({ where: { instanceId: req.params.id, userId: req.userId } });
    if (!vm) {
      return res.status(404).json({ error: { message: 'VM not found', status: 404 } });
    }
    const projectId = req.user?.openstackProjectId || null;
    const data = await openstack.getServer(req.params.id, projectId);
    const server = { ...data.server, dbId: vm.id, flavorId: vm.flavorId, expiresAt: vm.expiresAt };
    const flavorId = server.flavor?.id || server.flavorId || vm.flavorId;
    if (flavorId) {
      try {
        const flavorData = await openstack.getFlavor(flavorId, projectId);
        server.flavor = flavorData.flavor || flavorData;
      } catch {
        // keep existing server.flavor or id only
      }
    }
    res.json({
      success: true,
      server
    });
  } catch (error) {
    next(error);
  }
});

// Create new VM (and persist in DB for billing/scaling)
// Body: name, and either templateId OR (flavorRef + imageRef) OR (vcpus, ramGb, diskGb + imageRef)
// Optional: networkId, keyName, scaling: { thresholdHigh, thresholdLow, metricType, baseFlavorId }
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      templateId,
      flavorRef,
      imageRef,
      networkId,
      keyName,
      vcpus,
      ramGb,
      diskGb,
      scaling,
      userData,
      expiresAt
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: { message: 'Missing required field: name', status: 400 }
      });
    }

    let flavorIdToUse = flavorRef;
    let imageIdToUse = imageRef;

    if (templateId) {
      const template = await VMTemplate.findByPk(templateId);
      if (!template) {
        return res.status(400).json({
          error: { message: 'Template not found', status: 400 }
        });
      }
      flavorIdToUse = template.flavorId;
      imageIdToUse = template.imageId;
    } else if (vcpus != null || ramGb != null || diskGb != null) {
      if (!imageRef) {
        return res.status(400).json({
          error: { message: 'imageRef is required for custom (vCPU/RAM/disk) VM', status: 400 }
        });
      }
      const flavor = await findFlavorBySpecs(
        vcpus ? Number(vcpus) : 1,
        ramGb ? Number(ramGb) : 1,
        diskGb ? Number(diskGb) : 20
      );
      if (!flavor) {
        return res.status(400).json({
          error: { message: 'No flavor matches the requested vCPU/RAM/disk', status: 400 }
        });
      }
      flavorIdToUse = flavor.id;
      imageIdToUse = imageRef;
    }

    if (!flavorIdToUse || !imageIdToUse) {
      return res.status(400).json({
        error: {
          message: 'Provide templateId, or (flavorRef + imageRef), or (vcpus, ramGb, diskGb + imageRef)',
          status: 400
        }
      });
    }

    const serverData = {
      name,
      flavorRef: flavorIdToUse,
      imageRef: imageIdToUse,
      networks: networkId ? [{ uuid: networkId }] : 'auto'
    };
    if (keyName) serverData.key_name = keyName;
    if (userData && typeof userData === 'string') {
      serverData.user_data = Buffer.from(userData, 'utf8').toString('base64');
    }

    const projectId = req.user?.openstackProjectId || null;
    const data = await openstack.createServer(serverData, projectId);
    const server = data.server;
    const instanceId = typeof server.id === 'string' ? server.id : server.id?.id;

    await VM.create({
      userId: req.userId,
      instanceId,
      flavorId: flavorIdToUse,
      status: server.status || 'BUILD',
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    if (scaling && (scaling.thresholdHigh != null || scaling.thresholdLow != null)) {
      await ScalingPolicy.create({
        instanceId,
        metricType: scaling.metricType || 'cpu_and_memory',
        thresholdHigh: scaling.thresholdHigh ?? 80,
        thresholdLow: scaling.thresholdLow ?? 20,
        isActive: true,
        baseFlavorId: scaling.baseFlavorId || flavorIdToUse
      });
    }

    res.status(201).json({
      success: true,
      message: 'VM created successfully',
      server: data.server
    });
  } catch (error) {
    next(error);
  }
});

// Delete VM (must belong to current user)
router.delete('/:id', async (req, res, next) => {
  try {
    const vm = await VM.findOne({ where: { instanceId: req.params.id, userId: req.userId } });
    if (!vm) {
      return res.status(404).json({ error: { message: 'VM not found', status: 404 } });
    }
    const projectId = req.user?.openstackProjectId || null;
    await openstack.deleteServer(req.params.id, projectId);
    await vm.destroy();
    res.json({
      success: true,
      message: 'VM deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// VM Actions (start, stop, reboot, etc.) — track runtime for billing on start/stop
router.post('/:id/action', async (req, res, next) => {
  try {
    const { action } = req.body;
    const serverId = req.params.id;

    const vm = await VM.findOne({ where: { instanceId: serverId, userId: req.userId } });
    if (!vm) {
      return res.status(404).json({ error: { message: 'VM not found', status: 404 } });
    }

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

    const projectId = req.user?.openstackProjectId || null;
    await openstack.serverAction(serverId, actionBody, projectId);

    if (action === 'start') {
      const alreadyRunning = await VmRuntime.findOne({
        where: { instanceId: serverId, userId: req.userId, stoppedAt: null }
      });
      if (!alreadyRunning) {
        await VmRuntime.create({
          instanceId: serverId,
          userId: req.userId,
          startedAt: new Date(),
          stoppedAt: null
        });
      }
    } else if (action === 'stop') {
      const runtime = await VmRuntime.findOne({
        where: { instanceId: serverId, userId: req.userId, stoppedAt: null },
        order: [['startedAt', 'DESC']]
      });
      if (runtime) {
        runtime.stoppedAt = new Date();
        await runtime.save();
      }
    }

    res.json({
      success: true,
      message: `VM ${action} action executed successfully`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

