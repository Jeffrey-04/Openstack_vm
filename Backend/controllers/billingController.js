const { Invoice, InvoiceItem, User, PricingRule } = require('../models');
const { calculateInvoiceForPeriod } = require('../services/billingEngine');
const { generatePdf } = require('../services/invoiceGenerator');
const { Op } = require('sequelize');

async function listInvoices(req, res, next) {
  try {
    const userId = req.userId;
    const invoices = await Invoice.findAll({
      where: { userId },
      order: [['generatedAt', 'DESC']],
      include: []
    });
    res.json({
      success: true,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        totalAmount: Number(inv.totalAmount),
        currency: inv.currency,
        status: inv.status,
        generatedAt: inv.generatedAt
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function getInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const invoice = await Invoice.findOne({
      where: { id, userId },
      include: [{ model: InvoiceItem, as: 'InvoiceItems' }]
    });
    if (!invoice) {
      return res.status(404).json({ error: { message: 'Invoice not found', status: 404 } });
    }
    const items = (invoice.InvoiceItems || []).map((item) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      total: Number(item.total)
    }));
    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        totalAmount: Number(invoice.totalAmount),
        currency: invoice.currency,
        status: invoice.status,
        generatedAt: invoice.generatedAt,
        items
      }
    });
  } catch (err) {
    next(err);
  }
}

async function downloadInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const invoice = await Invoice.findOne({
      where: { id, userId },
      include: [
        { model: User, as: 'User', attributes: ['name', 'email'] },
        { model: InvoiceItem, as: 'InvoiceItems' }
      ]
    });
    if (!invoice) {
      return res.status(404).json({ error: { message: 'Invoice not found', status: 404 } });
    }
    const user = invoice.User || {};
    const items = (invoice.InvoiceItems || []).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      total: Number(item.total)
    }));
    const pdfBuffer = await generatePdf({
      invoiceNumber: invoice.invoiceNumber,
      clientName: user.name || user.email,
      clientEmail: user.email,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      items,
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture_${invoice.invoiceNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

async function createInvoice(req, res, next) {
  try {
    const userId = req.userId;
    const { periodStart, periodEnd } = req.body;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        error: { message: 'periodStart and periodEnd required (YYYY-MM-DD)', status: 400 }
      });
    }
    const { totalAmount, items, currency } = await calculateInvoiceForPeriod(
      userId,
      periodStart,
      periodEnd
    );
    const count = await Invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const invoice = await Invoice.create({
      userId,
      invoiceNumber,
      periodStart,
      periodEnd,
      totalAmount,
      currency,
      status: 'pending'
    });
    for (const it of items) {
      await InvoiceItem.create({
        invoiceId: invoice.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total
      });
    }
    res.status(201).json({
      success: true,
      message: 'Invoice created',
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        totalAmount: Number(invoice.totalAmount),
        currency: invoice.currency,
        status: invoice.status
      }
    });
  } catch (err) {
    next(err);
  }
}

async function payInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const invoice = await Invoice.findOne({ where: { id, userId } });
    if (!invoice) {
      return res.status(404).json({ error: { message: 'Invoice not found', status: 404 } });
    }
    invoice.status = 'paid';
    await invoice.save();
    res.json({ success: true, message: 'Invoice marked as paid', invoice: invoice.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function getPricingRules(req, res, next) {
  try {
    const rules = await PricingRule.findAll({
      order: [['resourceType', 'ASC'], ['effectiveDate', 'DESC']]
    });
    const byType = {};
    for (const r of rules) {
      if (!byType[r.resourceType]) byType[r.resourceType] = r;
    }
    res.json({
      success: true,
      pricingRules: Object.values(byType).map((r) => ({
        id: r.id,
        resourceType: r.resourceType,
        unitPrice: Number(r.unitPrice),
        unit: r.unit,
        currency: r.currency,
        effectiveDate: r.effectiveDate
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function updatePricingRules(req, res, next) {
  try {
    const rules = req.body.rules || req.body;
    const array = Array.isArray(rules) ? rules : [rules];
    const updated = [];
    for (const r of array) {
      const [instance] = await PricingRule.upsert({
        resourceType: r.resourceType,
        unitPrice: r.unitPrice,
        unit: r.unit || 'hour',
        currency: r.currency || 'XAF',
        effectiveDate: r.effectiveDate || new Date().toISOString().slice(0, 10)
      }, { returning: true });
      if (instance) updated.push(instance);
    }
    res.json({ success: true, pricingRules: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInvoices,
  getInvoice,
  downloadInvoice,
  createInvoice,
  payInvoice,
  getPricingRules,
  updatePricingRules
};
