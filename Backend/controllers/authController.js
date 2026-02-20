const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { signToken } = require('../middleware/auth');
const openstack = require('../config/openstack');
const { createProject } = require('../services/keystoneSync');
const logger = require('../utils/logger');

const register = async (req, res, next) => {
  logger.request('POST', '/api/auth/register', { email: req.body?.email, name: req.body?.name });
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array();
      logger.resError(400, 'Validation failed', details);
      return res.status(400).json({
        error: { message: 'Validation failed', status: 400, details }
      });
    }

    const { email, password, name, role } = req.body;
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      logger.warn('Register: email already registered', email);
      return res.status(409).json({
        error: { message: 'Email already registered', status: 409 }
      });
    }

    logger.info('Register: creating user', email);
    const user = await User.create({
      email: email.toLowerCase(),
      name: name || null,
      role: role === 'admin' ? 'admin' : 'client',
      passwordHash: password
    });

    if (process.env.KEYSTONE_MULTI_TENANT === 'true') {
      try {
        const adminToken = await openstack.getAuthToken();
        const projectName = `vm-user-${user.id.replace(/-/g, '')}`.slice(0, 64);
        const projectId = await createProject(projectName, adminToken);
        if (projectId) {
          await user.update({ openstackProjectId: projectId });
          logger.info('Register: Keystone project created', projectId);
        }
      } catch (e) {
        logger.warn('Register: Keystone project creation skipped', e.message);
      }
    }

    const token = signToken(user);
    logger.info('Register: success', user.id, email);
    res.status(201).json({
      success: true,
      message: 'User registered',
      user: user.toJSON(),
      token,
      expiresIn: '24h'
    });
  } catch (err) {
    logger.error('Register: exception', err.message, err.stack);
    next(err);
  }
};

const login = async (req, res, next) => {
  logger.request('POST', '/api/auth/login', { email: req.body?.email });
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array();
      logger.resError(400, 'Validation failed', details);
      return res.status(400).json({
        error: { message: 'Validation failed', status: 400, details }
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      logger.warn('Login: user not found', email);
      return res.status(401).json({
        error: { message: 'Invalid email or password', status: 401 }
      });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      logger.warn('Login: invalid password', email);
      return res.status(401).json({
        error: { message: 'Invalid email or password', status: 401 }
      });
    }

    const token = signToken(user);
    logger.info('Login: success', user.id, email);
    res.json({
      success: true,
      user: user.toJSON(),
      token,
      expiresIn: '24h'
    });
  } catch (err) {
    logger.error('Login: exception', err.message, err.stack);
    next(err);
  }
};

const me = async (req, res, next) => {
  logger.request('GET', '/api/auth/me');
  try {
    const user = req.user;
    if (!user) {
      logger.warn('Me: not authenticated');
      return res.status(401).json({
        error: { message: 'Not authenticated', status: 401 }
      });
    }
    logger.info('Me: success', user.id);
    res.json({ success: true, user: user.toJSON() });
  } catch (err) {
    logger.error('Me: exception', err.message);
    next(err);
  }
};

const logout = async (req, res) => {
  logger.request('POST', '/api/auth/logout');
  res.json({ success: true, message: 'Logged out (client should discard token)' });
};

module.exports = { register, login, me, logout };
