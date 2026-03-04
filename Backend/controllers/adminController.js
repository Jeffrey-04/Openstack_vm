const { User, Invoice, VM } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const openstack = require('../config/openstack');

function findVmByParam(paramId) {
  if (!paramId) return null;
  return VM.findOne({
    where: { [Op.or]: [{ instanceId: paramId }, { id: paramId }] },
    include: [{ model: User, as: 'User', attributes: ['id', 'openstackProjectId', 'email', 'name'] }]
  });
}

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

/**
 * GET /api/admin/stats
 * Retourne les statistiques globales pour le dashboard admin
 */
async function getStats(req, res, next) {
  try {
    logger.info('Admin: get stats');

    // Total users
    const totalUsers = await User.count();

    // Active users: users avec au moins une VM ou une facture
    const [vmsUsers, invoicesUsers] = await Promise.all([
      VM.findAll({ attributes: ['userId'], raw: true }),
      Invoice.findAll({ attributes: ['userId'], raw: true })
    ]);
    const activeUsersSet = new Set();
    vmsUsers.forEach(v => activeUsersSet.add(v.userId));
    invoicesUsers.forEach(i => activeUsersSet.add(i.userId));
    const activeUsers = activeUsersSet.size;

    // VM counts (from DB; status may be updated when VMs are listed)
    const totalVMs = await VM.count();
    const activeVMs = await VM.count({ where: { status: 'ACTIVE' } });
    const suspendedVMs = await VM.count({
      where: { status: { [Op.in]: ['SHUTOFF', 'PAUSED', 'SUSPENDED'] } }
    });

    // Monthly revenue: somme des factures payées du mois en cours
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyRevenueResult = await Invoice.sum('totalAmount', {
      where: {
        status: 'paid',
        [Op.or]: [
          {
            periodStart: {
              [Op.between]: [firstDayOfMonth, lastDayOfMonth]
            }
          },
          {
            periodEnd: {
              [Op.between]: [firstDayOfMonth, lastDayOfMonth]
            }
          }
        ]
      }
    });
    const monthlyRevenue = Number(monthlyRevenueResult || 0);

    // Revenue growth: comparaison avec mois précédent
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const prevMonthRevenueResult = await Invoice.sum('totalAmount', {
      where: {
        status: 'paid',
        [Op.or]: [
          {
            periodStart: {
              [Op.between]: [firstDayPrevMonth, lastDayPrevMonth]
            }
          },
          {
            periodEnd: {
              [Op.between]: [firstDayPrevMonth, lastDayPrevMonth]
            }
          }
        ]
      }
    });
    const prevMonthRevenue = Number(prevMonthRevenueResult || 0);

    const revenueGrowth = prevMonthRevenue > 0
      ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1)
      : monthlyRevenue > 0 ? '100.0' : '0.0';

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalVMs,
        activeVMs,
        suspendedVMs,
        monthlyRevenue,
        revenueGrowth: parseFloat(revenueGrowth)
      }
    });
  } catch (err) {
    logger.error('Admin stats error:', err.message);
    next(err);
  }
}

/**
 * GET /api/admin/users
 * Liste tous les utilisateurs avec pagination et recherche optionnelle
 */
async function listUsers(req, res, next) {
  try {
    logger.info('Admin: list users');
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchTerm = search.trim();

    const where = {};
    if (searchTerm) {
      where[Op.or] = [
        { email: { [Op.like]: `%${searchTerm}%` } },
        { name: { [Op.like]: `%${searchTerm}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'email', 'name', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    // Enrichir avec counts de VMs et factures
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const [vmCount, invoiceCount] = await Promise.all([
          VM.count({ where: { userId: user.id } }),
          Invoice.count({ where: { userId: user.id } })
        ]);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive !== false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          vmCount,
          invoiceCount
        };
      })
    );

    res.json({
      success: true,
      users: enrichedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('Admin list users error:', err.message);
    next(err);
  }
}

/**
 * GET /api/admin/vms
 * Liste toutes les VMs de la plateforme (tous utilisateurs) avec statut OpenStack à jour
 */
async function listAllVms(req, res, next) {
  try {
    logger.info('Admin: list all VMs');
    const vms = await VM.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'User', attributes: ['id', 'email', 'name', 'openstackProjectId'] }]
    });
    const servers = await Promise.all(
      vms.map(async (vm) => {
        const projectId = vm.User?.openstackProjectId || null;
        try {
          const data = await openstack.getServer(vm.instanceId, projectId);
          const raw = data.server || data;
          if (raw.status && raw.status !== vm.status) {
            vm.update({ status: raw.status }).catch(() => {});
          }
          return {
            ...raw,
            dbId: vm.id,
            flavorId: vm.flavorId,
            expiresAt: vm.expiresAt,
            userId: vm.userId,
            userEmail: vm.User?.email
          };
        } catch (e) {
          return {
            id: vm.instanceId,
            name: vm.instanceId,
            status: vm.status || 'UNKNOWN',
            dbId: vm.id,
            flavorId: vm.flavorId,
            expiresAt: vm.expiresAt,
            userId: vm.userId,
            userEmail: vm.User?.email
          };
        }
      })
    );
    res.json({ success: true, count: servers.length, servers });
  } catch (err) {
    logger.error('Admin list all VMs error:', err.message);
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:id
 * Activer/désactiver un utilisateur (isActive)
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (id === req.userId) {
      return res.status(400).json({ error: { message: 'Vous ne pouvez pas désactiver votre propre compte.', status: 400 } });
    }
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: { message: 'Utilisateur introuvable', status: 404 } });
    }
    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
      await user.save();
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive !== false
      }
    });
  } catch (err) {
    logger.error('Admin update user error:', err.message);
    next(err);
  }
}

/**
 * GET /api/admin/vms/:id
 * Détail d'une VM (admin peut voir n'importe quelle VM)
 */
async function getVmDetail(req, res, next) {
  try {
    const { id } = req.params;
    const vm = await findVmByParam(id);
    if (!vm) {
      return res.status(404).json({ error: { message: 'VM introuvable', status: 404 } });
    }
    const projectId = vm.User?.openstackProjectId || null;
    const data = await openstack.getServer(vm.instanceId, projectId);
    const raw = data.server || data;
    const server = {
      ...raw,
      dbId: vm.id,
      flavorId: vm.flavorId,
      expiresAt: vm.expiresAt,
      preferredAddress: getPreferredAddress(raw)
    };
    const flavorId = server.flavor?.id || server.flavorId || vm.flavorId;
    if (flavorId) {
      try {
        const flavorData = await openstack.getFlavor(flavorId, projectId);
        server.flavor = flavorData.flavor || flavorData;
      } catch {
        // keep existing
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
    if (vm.User) {
      server.owner = { id: vm.User.id, email: vm.User.email, name: vm.User.name };
    }
    res.json({ success: true, server });
  } catch (err) {
    logger.error('Admin get VM detail error:', err.message);
    next(err);
  }
}

/**
 * POST /api/admin/vms/:id/action
 * Permet à l'admin d'arrêter (ou autre action) une VM quelconque
 */
async function vmAction(req, res, next) {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const allowed = ['stop', 'start', 'reboot'];
    if (!action || !allowed.includes(action)) {
      return res.status(400).json({
        error: { message: 'Action invalide. Utilisez: stop, start, reboot', status: 400 }
      });
    }
    const vm = await findVmByParam(id);
    if (!vm) {
      return res.status(404).json({ error: { message: 'VM introuvable', status: 404 } });
    }
    const projectId = vm.User?.openstackProjectId || null;
    const actionBody = action === 'stop' ? { 'os-stop': null }
      : action === 'start' ? { 'os-start': null }
      : { reboot: { type: 'SOFT' } };
    await openstack.serverAction(vm.instanceId, actionBody, projectId);
    logger.info('Admin VM action', { action, instanceId: vm.instanceId });
    res.json({ success: true, message: `VM ${action === 'stop' ? 'arrêtée' : action === 'start' ? 'démarrée' : 'redémarrée'}.` });
  } catch (err) {
    if (err.response?.status === 409) {
      return res.status(409).json({
        error: { message: 'Action impossible dans l\'état actuel de la VM.', status: 409 }
      });
    }
    logger.error('Admin VM action error:', err.message);
    next(err);
  }
}

module.exports = {
  getStats,
  listUsers,
  listAllVms,
  getVmDetail,
  updateUser,
  vmAction
};
