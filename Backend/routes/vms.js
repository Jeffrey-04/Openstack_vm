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

// Find VM by route param: accept OpenStack instanceId or our DB id (UUID)
async function findVmByParam(paramId, userId) {
  logger.info('[findVmByParam] entry', { paramId: paramId || '(empty)', userId: userId || '(empty)' });
  if (!paramId || !userId) {
    logger.warn('[findVmByParam] missing paramId or userId');
    return null;
  }
  const byInstance = await VM.findOne({ where: { instanceId: paramId, userId } });
  if (byInstance) {
    logger.info('[findVmByParam] found by instanceId', { dbId: byInstance.id, instanceId: byInstance.instanceId });
    return byInstance;
  }
  logger.info('[findVmByParam] not found by instanceId, trying by pk');
  const byPk = await VM.findOne({ where: { id: paramId, userId } });
  if (byPk) {
    logger.info('[findVmByParam] found by pk (id)', { dbId: byPk.id, instanceId: byPk.instanceId });
    return byPk;
  }
  logger.warn('[findVmByParam] not found', { paramId, userId });
  const debugList = await VM.findAll({ where: { userId }, attributes: ['id', 'instanceId'], limit: 5, raw: true });
  logger.info('[findVmByParam] user VMs in DB (sample)', { count: debugList.length, sample: debugList });
  return null;
}

function normalizeVmParam(paramId) {
  if (!paramId || typeof paramId !== 'string') return paramId;
  return paramId.trim();
}

/** Prefer floating/public IP for SSH: accessIPv4, then public/floating/ext network, then first address. */
function getPreferredAddress(server) {
  const s = server || {};
  if (s.accessIPv4 && String(s.accessIPv4).trim()) return String(s.accessIPv4).trim();
  const addrs = s.addresses && typeof s.addresses === 'object' ? s.addresses : {};
  const networkNames = Object.keys(addrs);
  const prefer = networkNames.find((n) => /public|floating|ext|external/i.test(n));
  if (prefer && Array.isArray(addrs[prefer]) && addrs[prefer].length > 0) {
    const first = addrs[prefer].find((a) => a.version === 4 || a.addr);
    if (first && first.addr) return first.addr;
  }
  for (const name of networkNames) {
    const list = addrs[name];
    if (Array.isArray(list) && list.length > 0 && list[0].addr) return list[0].addr;
  }
  return null;
}

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
          const raw = data.server || data;
          if (raw.status && raw.status !== vm.status) {
            vm.update({ status: raw.status }).catch(() => {});
          }
          const s = { ...raw, dbId: vm.id, flavorId: vm.flavorId, expiresAt: vm.expiresAt };
          s.preferredAddress = getPreferredAddress(s);
          return s;
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

// Console by DB id — MUST be before /:id routes so "console" is not captured as :id
router.get('/console/by-db-id/:dbId', async (req, res, next) => {
  const dbId = normalizeVmParam(req.params.dbId);
  logger.info('[Console] route /console/by-db-id/:dbId hit', { path: req.path, dbId: dbId || '(empty)', userId: req.userId });
  try {
    if (!dbId) {
      logger.warn('[Console] by-db-id: missing dbId');
      return res.status(400).json({ error: { message: 'dbId required', status: 400 } });
    }
    const vm = await VM.findOne({ where: { id: dbId, userId: req.userId } });
    if (!vm) {
      const debugList = await VM.findAll({ where: { userId: req.userId }, attributes: ['id', 'instanceId'], limit: 10, raw: true });
      logger.warn('[Console] by-db-id: VM not found', { dbId, userId: req.userId, userVmsSample: debugList });
      return res.status(404).json({
        error: { message: 'VM introuvable ou accès non autorisé.', status: 404, code: 'VM_NOT_FOUND' }
      });
    }
    logger.info('[Console] by-db-id: VM found', { dbId: vm.id, instanceId: vm.instanceId });
    const projectId = req.user?.openstackProjectId || null;
    let url;
    try {
      url = await openstack.getConsoleUrl(vm.instanceId, projectId);
    } catch (osErr) {
      const status = osErr.response?.status;
      if (status === 404) {
        logger.warn('Console by-db-id: OpenStack 404 (noVNC/remote-consoles non disponible)', { instanceId: vm.instanceId });
        return res.status(503).json({
          error: {
            message: 'Console non disponible pour cette VM. Le service noVNC n\'est peut-être pas configuré sur ce déploiement OpenStack.',
            status: 503,
            code: 'CONSOLE_UNAVAILABLE'
          }
        });
      }
      throw osErr;
    }
    if (!url) {
      logger.warn('Console by-db-id: no URL from OpenStack', { instanceId: vm.instanceId });
      return res.status(503).json({ error: { message: 'Console non disponible pour cette VM', status: 503 } });
    }
    logger.info('Console by-db-id: success', { dbId });
    res.json({ success: true, url });
  } catch (error) {
    logger.error('Console by-db-id: exception', error.message, error.stack);
    next(error);
  }
});

// Scaling (must be before /:id to avoid "scaling-policy" as id)
router.get('/:id/scaling-policy', scalingController.getScalingPolicy);
router.put('/:id/scaling-policy', scalingController.putScalingPolicy);
router.get('/:id/metrics', scalingController.getMetrics);
router.get('/:id/scaling-history', scalingController.getScalingHistory);

router.get('/:id/console', async (req, res, next) => {
  const paramId = normalizeVmParam(req.params.id);
  logger.info('[Console] route /:id/console hit', { path: req.path, paramId: paramId || '(empty)', userId: req.userId });
  try {
    const vm = await findVmByParam(paramId, req.userId);
    if (!vm) {
      logger.warn('[Console] by-id: VM not found after findVmByParam', { paramId, userId: req.userId });
      return res.status(404).json({
        error: {
          message: 'VM introuvable ou accès non autorisé. Rechargez la page détail.',
          status: 404,
          code: 'VM_NOT_FOUND'
        }
      });
    }
    logger.info('[Console] by-id: VM found', { instanceId: vm.instanceId, dbId: vm.id });
    const projectId = req.user?.openstackProjectId || null;
    let url;
    try {
      url = await openstack.getConsoleUrl(vm.instanceId, projectId);
    } catch (osErr) {
      const status = osErr.response?.status;
      if (status === 404) {
        logger.warn('Console by-id: OpenStack 404 (noVNC/remote-consoles non disponible)', { instanceId: vm.instanceId });
        return res.status(503).json({
          error: {
            message: 'Console non disponible pour cette VM. Le service noVNC n\'est peut-être pas configuré sur ce déploiement OpenStack.',
            status: 503,
            code: 'CONSOLE_UNAVAILABLE'
          }
        });
      }
      throw osErr;
    }
    if (!url) {
      logger.warn('Console by-id: no URL from OpenStack', { instanceId: vm.instanceId });
      return res.status(503).json({ error: { message: 'Console non disponible pour cette VM', status: 503 } });
    }
    logger.info('Console by-id: success');
    res.json({ success: true, url });
  } catch (error) {
    logger.error('Console by-id: exception', error.message, error.stack);
    next(error);
  }
});

// Create snapshot (image) from VM — Nova createImage
router.post('/:id/snapshot', async (req, res, next) => {
  const paramId = normalizeVmParam(req.params.id);
  const name = (req.body.name && String(req.body.name).trim()) || `snap-${Date.now()}`;
  try {
    const vm = await findVmByParam(paramId, req.userId);
    if (!vm) {
      return res.status(404).json({ error: { message: 'VM introuvable', status: 404 } });
    }
    if (vm.status !== 'ACTIVE' && vm.status !== 'SHUTOFF') {
      return res.status(400).json({ error: { message: 'La VM doit être active ou arrêtée pour créer un snapshot.', status: 400 } });
    }
    const projectId = req.user?.openstackProjectId || null;
    const imageName = name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || `snap-${Date.now()}`;
    await openstack.createImageFromServer(vm.instanceId, imageName, projectId);
    logger.info('Snapshot created', { instanceId: vm.instanceId, imageName });
    res.status(202).json({ success: true, message: 'Snapshot en cours de création. L\'image apparaîtra dans Glance dans quelques minutes.', imageName });
  } catch (err) {
    logger.error('Snapshot error:', err.message);
    if (err.response?.status === 400) {
      return res.status(400).json({ error: { message: err.response?.data?.error?.message || 'Impossible de créer le snapshot.', status: 400 } });
    }
    next(err);
  }
});

// Get specific VM (must belong to current user), with flavor details and image name for detail page
router.get('/:id', async (req, res, next) => {
  const requestedId = req.params.id;
  logger.info('[GET /:id] VM detail request', { requestedId: requestedId || '(empty)', userId: req.userId });
  try {
    const vm = await findVmByParam(requestedId, req.userId);
    if (!vm) {
      logger.warn('[GET /:id] VM not found', { requestedId, userId: req.userId });
      return res.status(404).json({ error: { message: 'VM not found', status: 404 } });
    }
    logger.info('[GET /:id] VM found, returning', { dbId: vm.id, instanceId: vm.instanceId, openstackIdInResponse: vm.instanceId });
    const projectId = req.user?.openstackProjectId || null;
    const data = await openstack.getServer(vm.instanceId, projectId);
    const raw = data.server || data;
    const server = { ...raw, dbId: vm.id, flavorId: vm.flavorId, expiresAt: vm.expiresAt };
    server.preferredAddress = getPreferredAddress(server);

    const flavorId = server.flavor?.id || server.flavorId || vm.flavorId;
    if (flavorId) {
      try {
        const flavorData = await openstack.getFlavor(flavorId, projectId);
        server.flavor = flavorData.flavor || flavorData;
      } catch {
        // keep existing server.flavor or id only
      }
    }

    const imageId = server.image?.id || (typeof server.image === 'string' ? server.image : null);
    if (imageId) {
      try {
        const imageData = await openstack.getImage(imageId);
        const img = imageData.image || imageData;
        server.image = { id: imageId, name: img.name || img.display_name || null };
      } catch {
        server.image = server.image && typeof server.image === 'object' ? server.image : { id: imageId, name: null };
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

    const vmRecord = await VM.create({
      userId: req.userId,
      instanceId,
      flavorId: flavorIdToUse,
      status: server.status || 'BUILD',
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    // Track runtime for billing: VM is considered running from creation (OpenStack will start it)
    await VmRuntime.create({
      userId: req.userId,
      instanceId,
      startedAt: new Date(),
      stoppedAt: null
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
    const vm = await findVmByParam(req.params.id, req.userId);
    if (!vm) {
      return res.status(404).json({ error: { message: 'VM not found', status: 404 } });
    }
    const projectId = req.user?.openstackProjectId || null;
    await openstack.deleteServer(vm.instanceId, projectId);
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
    const vm = await findVmByParam(req.params.id, req.userId);
    if (!vm) {
      return res.status(404).json({ error: { message: 'VM not found', status: 404 } });
    }
    const serverId = vm.instanceId;

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
    try {
      await openstack.serverAction(serverId, actionBody, projectId);
    } catch (err) {
      const status = err.response?.status;
      const body = err.response?.data;
      if (status === 409) {
        const msg = body?.conflict?.message || body?.message || body?.error?.message
          || 'Cette action n\'est pas possible dans l\'état actuel de la VM (ex. démarrer une VM déjà en cours, ou arrêter une VM déjà arrêtée).';
        return res.status(409).json({
          error: { message: msg, status: 409, code: 'CONFLICT' }
        });
      }
      throw err;
    }

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

