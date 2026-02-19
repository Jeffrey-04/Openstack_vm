const { User, Invoice, VM } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

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
      attributes: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt']
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

module.exports = {
  getStats,
  listUsers
};
