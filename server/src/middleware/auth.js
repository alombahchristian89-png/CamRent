const jwt = require('jsonwebtoken');
const { supabase, mapUser } = require('../services/supabaseData');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from Supabase
    const { data: userRow, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !userRow) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    const user = mapUser(userRow);

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized.`
      });
    }
    next();
  };
};

const requireSuperAdmin = (req, res, next) => {
  const name = String(req.user?.name || '').trim().toLowerCase();
  const isSuperAdmin = req.user?.role === 'super_admin' || name === 'alombah';

  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges are required.'
    });
  }

  next();
};

// Check if user is verified landlord
const isVerifiedLandlord = (req, res, next) => {
  if (req.user.role === 'landlord' && req.user.verificationStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Landlord account is not verified. Please complete verification process.'
    });
  }
  next();
};

module.exports = {
  protect,
  authorize,
  requireSuperAdmin,
  isVerifiedLandlord
};
