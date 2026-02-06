const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { signToken } = require('../middleware/auth');

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', status: 400, details: errors.array() }
      });
    }

    const { email, password, name, role } = req.body;
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({
        error: { message: 'Email already registered', status: 409 }
      });
    }

    const user = await User.create({
      email: email.toLowerCase(),
      name: name || null,
      role: role === 'admin' ? 'admin' : 'client',
      passwordHash: password
    });

    const token = signToken(user);
    res.status(201).json({
      success: true,
      message: 'User registered',
      user: user.toJSON(),
      token,
      expiresIn: '24h'
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: { message: 'Validation failed', status: 400, details: errors.array() }
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({
        error: { message: 'Invalid email or password', status: 401 }
      });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({
        error: { message: 'Invalid email or password', status: 401 }
      });
    }

    const token = signToken(user);
    res.json({
      success: true,
      user: user.toJSON(),
      token,
      expiresIn: '24h'
    });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        error: { message: 'Not authenticated', status: 401 }
      });
    }
    res.json({ success: true, user: user.toJSON() });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out (client should discard token)' });
};

module.exports = { register, login, me, logout };
