const express = require('express');
const router = express.Router();
const openstack = require('../config/openstack');

// Pricing configuration (in USD per month)
const PRICING = {
  'm1.micro': 5,
  'm1.tiny': 8,
  'm1.small': 10,
  'm1.medium': 25,
  'm1.large': 50,
  'm1.xlarge': 100
};

// List all flavors with pricing
router.get('/', async (req, res, next) => {
  try {
    const data = await openstack.listFlavors();
    
    // Add pricing information to flavors
    const flavorsWithPricing = (data.flavors || []).map(flavor => ({
      ...flavor,
      price: PRICING[flavor.name] || calculatePrice(flavor),
      currency: 'USD',
      billing: 'monthly'
    }));

    res.json({
      success: true,
      count: flavorsWithPricing.length,
      flavors: flavorsWithPricing
    });
  } catch (error) {
    next(error);
  }
});

// Get specific flavor
router.get('/:id', async (req, res, next) => {
  try {
    const data = await openstack.getFlavor(req.params.id);
    const flavor = data.flavor;
    
    // Add pricing information
    flavor.price = PRICING[flavor.name] || calculatePrice(flavor);
    flavor.currency = 'USD';
    flavor.billing = 'monthly';

    res.json({
      success: true,
      flavor
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to calculate price based on resources
function calculatePrice(flavor) {
  const ramGb = flavor.ram / 1024;
  const diskGb = flavor.disk;
  const vcpus = flavor.vcpus;
  
  // Simple pricing formula: $2 per vCPU + $3 per GB RAM + $0.10 per GB disk
  const price = (vcpus * 2) + (ramGb * 3) + (diskGb * 0.10);
  
  return Math.ceil(price);
}

module.exports = router;

