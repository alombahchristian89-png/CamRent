const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { supabase, sanitizeUserForAuth, mapUser } = require('../services/supabaseData');
const { logActivity } = require('../services/activityLogger');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');
const { ensurePasswordResetColumns } = require('../utils/ensurePasswordResetColumns');

const getMissingUsersColumnName = (error) => {
  const message = String(error?.message || '');
  const postgresStyle = message.match(/column\s+users\.([a-z_]+)\s+does not exist/i);
  if (postgresStyle && postgresStyle[1]) return postgresStyle[1].toLowerCase();

  const postgrestStyle = message.match(/'([a-z_]+)'\s+column\s+of\s+'users'/i);
  if (postgrestStyle && postgrestStyle[1]) return postgrestStyle[1].toLowerCase();

  return null;
};

const PASSWORD_RESET_COLUMNS = new Set(['reset_password_token', 'reset_password_expires']);

const isMissingPasswordResetColumnError = (error) => {
  const missingColumn = getMissingUsersColumnName(error);
  return Boolean(missingColumn && PASSWORD_RESET_COLUMNS.has(missingColumn));
};

const normalizePhone = (phone) => {
  if (!phone) return null;
  const cleaned = String(phone).trim().replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('+')) {
    return `+${cleaned.slice(1).replace(/\+/g, '')}`;
  }
  return cleaned.replace(/\+/g, '');
};

const isValidEmail = (value) => {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
};

const isValidPhone = (value) => {
  if (!value) return false;
  return /^\+?[1-9]\d{7,14}$/.test(String(value));
};

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });
  
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });
  
  return { accessToken, refreshToken };
};

// Register user
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, email, password, role, phone, language } = req.body;
    const safeName = String(name || '').trim();
    const safeRole = role === 'landlord' ? 'landlord' : 'tenant';
    const safeLanguage = language === 'fr' ? 'fr' : 'en';
    const safeEmail = String(email || '').trim().toLowerCase();
    const safePhone = normalizePhone(phone);

    if (!safeName || safeName.length < 2 || safeName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters'
      });
    }

    if (!isValidEmail(safeEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }

    if (safePhone && !isValidPhone(safePhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number'
      });
    }

    const { data: existingNameUser, error: existingNameError } = await supabase
      .from('users')
      .select('id')
      .ilike('name', safeName)
      .maybeSingle();

    if (existingNameError) throw existingNameError;

    if (existingNameUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this name already exists'
      });
    }

    // Check if user already exists
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', safeEmail)
      .maybeSingle();

    if (existingUserError) throw existingUserError;

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    if (safePhone) {
      const { data: existingPhoneUser, error: existingPhoneError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', safePhone)
        .maybeSingle();

      if (existingPhoneError) throw existingPhoneError;

      if (existingPhoneUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this phone number already exists'
        });
      }
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with schema-cache fallback for optional language columns.
    let userRow = null;
    let insertPayload = {
      name: safeName,
      email: safeEmail,
      phone: safePhone,
      password: hashedPassword,
      role: safeRole,
      language: safeLanguage,
      preferred_language: safeLanguage,
      verification_status: safeRole === 'landlord' ? 'pending' : 'approved',
      is_verified: safeRole === 'landlord' ? false : true,
      is_active: true
    };

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const result = await supabase
        .from('users')
        .insert(insertPayload)
        .select('*')
        .single();

      if (!result.error) {
        userRow = result.data;
        break;
      }

      const missingColumn = getMissingUsersColumnName(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(insertPayload, missingColumn)) {
        delete insertPayload[missingColumn];
        continue;
      }

      throw result.error;
    }

    if (!userRow) {
      throw new Error('Registration insert failed after schema fallback attempts');
    }

    const user = sanitizeUserForAuth(userRow);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const { data: userRow, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (findError) throw findError;

    if (!userRow) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = sanitizeUserForAuth(userRow);

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, userRow.password || '');
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    try {
      await logActivity({
        actorUserId: user.id,
        actionType: 'login',
        entityType: 'auth',
        details: {
          message: `${user.name || 'User'} (${user.role || 'user'}) logged in`,
          role: user.role || null
        }
      });
    } catch (activityError) {
      console.warn('Login activity log skipped:', activityError.message || activityError);
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { data: userRow, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .maybeSingle();

    if (error || !userRow || userRow.is_active === false) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const user = mapUser(userRow);

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    // The auth middleware already validates the token and hydrates req.user.
    // Return that value directly to avoid a second DB round-trip that can fail
    // on transient schema-cache/network conditions and surface as 500.
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, phone, profileImage, language, preferredLanguage } = req.body;
    const nextLanguage = language === 'fr' ? 'fr' : language === 'en' ? 'en' : preferredLanguage === 'fr' ? 'fr' : 'en';
    const normalizedPhone = normalizePhone(phone ?? req.user.phone ?? null);

    if (normalizedPhone) {
      const { data: existingPhoneUser, error: existingPhoneError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .neq('id', req.user._id)
        .maybeSingle();

      if (existingPhoneError) throw existingPhoneError;

      if (existingPhoneUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already in use by another account'
        });
      }
    }

    let userRow = null;
    let updatePayload = {
      name: name ?? req.user.name,
      phone: normalizedPhone,
      profile_image: profileImage ?? req.user.profileImage,
      language: nextLanguage,
      preferred_language: nextLanguage,
      updated_at: new Date().toISOString()
    };

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const result = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', req.user._id)
        .select('*')
        .single();

      if (!result.error) {
        userRow = result.data;
        break;
      }

      const missingColumn = getMissingUsersColumnName(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(updatePayload, missingColumn)) {
        delete updatePayload[missingColumn];
        continue;
      }

      throw result.error;
    }

    if (!userRow) {
      throw new Error('Profile update failed after schema fallback attempts');
    }

    const user = mapUser(userRow);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    await ensurePasswordResetColumns();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find user by email
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      if (isMissingPasswordResetColumnError(userError)) {
        return res.status(503).json({
          success: false,
          message: 'Password reset is temporarily unavailable. Database migration is required.'
        });
      }
      throw userError;
    }

    if (!userRow) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Save reset token to user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        reset_password_token: resetToken,
        reset_password_expires: new Date(resetTokenExpiry).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userRow.id)
      .select('*')
      .single();

    if (updateError) {
      if (isMissingPasswordResetColumnError(updateError)) {
        return res.status(503).json({
          success: false,
          message: 'Password reset is temporarily unavailable. Database migration is required.'
        });
      }
      throw updateError;
    }

    const user = mapUser(updatedUser);

    // Send reset email
    const emailResult = await sendPasswordResetEmail(user, resetToken);
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Password reset email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: emailResult.error || 'Failed to send reset email'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    await ensurePasswordResetColumns();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    // Find user by reset token
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('reset_password_token', token)
      .maybeSingle();

    if (userError) {
      if (isMissingPasswordResetColumnError(userError)) {
        return res.status(503).json({
          success: false,
          message: 'Password reset is temporarily unavailable. Database migration is required.'
        });
      }
      throw userError;
    }

    if (!userRow || !userRow.reset_password_expires || new Date(userRow.reset_password_expires).getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        reset_password_token: null,
        reset_password_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userRow.id);

    if (updateError) {
      if (isMissingPasswordResetColumnError(updateError)) {
        return res.status(503).json({
          success: false,
          message: 'Password reset is temporarily unavailable. Database migration is required.'
        });
      }
      throw updateError;
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword
};
