const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { VMTemplate, GlobalScaleUpRule } = require('../models');
const adminController = require('../controllers/adminController');
const billingController = require('../controllers/billingController');

router.use(authenticate);
router.use(requireRole('admin'));

// ---------- VM Templates (CRUD) ----------
router.get('/vm-templates', async (req, res, next) => {
  try {
    const list = await VMTemplate.findAll({ order: [['name', 'ASC']] });
    res.json({
      success: true,
      templates: list.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        flavorId: t.flavorId,
        imageId: t.imageId
      }))
    });
  } catch (err) {
    next(err);
  }
});

router.post('/vm-templates', async (req, res, next) => {
  try {
    const { name, description, flavorId, imageId } = req.body;
    if (!name || !flavorId || !imageId) {
      return res.status(400).json({
        error: { message: 'name, flavorId and imageId are required', status: 400 }
      });
    }
    const t = await VMTemplate.create({
      name,
      description: description || null,
      flavorId,
      imageId
    });
    res.status(201).json({
      success: true,
      template: {
        id: t.id,
        name: t.name,
        description: t.description,
        flavorId: t.flavorId,
        imageId: t.imageId
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/vm-templates/:id', async (req, res, next) => {
  try {
    const t = await VMTemplate.findByPk(req.params.id);
    if (!t) {
      return res.status(404).json({ error: { message: 'Template not found', status: 404 } });
    }
    res.json({
      success: true,
      template: {
        id: t.id,
        name: t.name,
        description: t.description,
        flavorId: t.flavorId,
        imageId: t.imageId
      }
    });
  } catch (err) {
    next(err);
  }
});

router.put('/vm-templates/:id', async (req, res, next) => {
  try {
    const t = await VMTemplate.findByPk(req.params.id);
    if (!t) {
      return res.status(404).json({ error: { message: 'Template not found', status: 404 } });
    }
    const { name, description, flavorId, imageId } = req.body;
    if (name !== undefined) t.name = name;
    if (description !== undefined) t.description = description;
    if (flavorId !== undefined) t.flavorId = flavorId;
    if (imageId !== undefined) t.imageId = imageId;
    await t.save();
    res.json({
      success: true,
      template: {
        id: t.id,
        name: t.name,
        description: t.description,
        flavorId: t.flavorId,
        imageId: t.imageId
      }
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/vm-templates/:id', async (req, res, next) => {
  try {
    const t = await VMTemplate.findByPk(req.params.id);
    if (!t) {
      return res.status(404).json({ error: { message: 'Template not found', status: 404 } });
    }
    await t.destroy();
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
});

// ---------- Admin Stats ----------
router.get('/stats', adminController.getStats);

// ---------- Admin Users ----------
router.get('/users', adminController.listUsers);

// ---------- Admin Invoices (all invoices with filters) ----------
router.get('/invoices', billingController.listAdminInvoices);

// ---------- Global scale-up rule (single active rule) ----------
router.get('/scale-up-rule', async (req, res, next) => {
  try {
    const rule = await GlobalScaleUpRule.findOne({ where: { isActive: true } });
    if (!rule) {
      return res.json({
        success: true,
        rule: { deltaVcpus: 2, deltaRamMb: 4096, isActive: false }
      });
    }
    res.json({
      success: true,
      rule: {
        id: rule.id,
        deltaVcpus: rule.deltaVcpus,
        deltaRamMb: rule.deltaRamMb,
        isActive: rule.isActive
      }
    });
  } catch (err) {
    next(err);
  }
});

router.put('/scale-up-rule', async (req, res, next) => {
  try {
    const { deltaVcpus, deltaRamMb, isActive } = req.body;
    let rule = await GlobalScaleUpRule.findOne({ order: [['createdAt', 'ASC']] });
    if (rule) {
      await rule.update({
        deltaVcpus: deltaVcpus ?? rule.deltaVcpus,
        deltaRamMb: deltaRamMb ?? rule.deltaRamMb,
        isActive: isActive !== undefined ? isActive : rule.isActive
      });
    } else {
      rule = await GlobalScaleUpRule.create({
        deltaVcpus: deltaVcpus ?? 2,
        deltaRamMb: deltaRamMb ?? 4096,
        isActive: isActive !== false
      });
    }
    res.json({
      success: true,
      rule: {
        id: rule.id,
        deltaVcpus: rule.deltaVcpus,
        deltaRamMb: rule.deltaRamMb,
        isActive: rule.isActive
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
