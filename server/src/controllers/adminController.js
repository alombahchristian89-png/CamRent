const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const {
  supabase,
  mapUser,
  mapProperty,
  mapInquiry,
  getUsersMapByIds,
  getPropertiesMapByIds
} = require('../services/supabaseData');
const { logActivity } = require('../services/activityLogger');
const { getMergedAuditRows } = require('../services/auditStore');
const { sendPasswordResetEmail } = require('../services/emailService');

const safeDetails = (details) => {
  if (!details || typeof details !== 'object') return {};
  return details;
};

const runAdminSideEffect = async (task, label) => {
  try {
    await task();
  } catch (error) {
    console.warn(`[Admin side-effect skipped] ${label}: ${error.message}`);
  }
};

const isMissingTableError = (error, tableName) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const target = String(tableName || '').toLowerCase();

  if (code === 'pgrst205' || code === '42p01') {
    return true;
  }

  return (
    message.includes(target) && (
      message.includes('relation') ||
      message.includes('schema cache') ||
      message.includes('could not find the table') ||
      message.includes('does not exist')
    )
  );
};

const isMissingColumnError = (error, tableName, columnName) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const table = String(tableName || '').toLowerCase();
  const column = String(columnName || '').toLowerCase();

  if (code === 'pgrst204') {
    return message.includes(column) && message.includes(table);
  }

  return false;
};

const getMissingPropertiesColumnName = (error) => {
  const message = String(error?.message || '');
  const postgresStyle = message.match(/column\s+properties\.([a-z_]+)\s+does not exist/i);
  if (postgresStyle && postgresStyle[1]) return postgresStyle[1].toLowerCase();

  const postgrestStyle = message.match(/'([a-z_]+)'\s+column\s+of\s+'properties'/i);
  if (postgrestStyle && postgrestStyle[1]) return postgrestStyle[1].toLowerCase();

  return null;
};

const writeAuditLog = async ({ adminId, targetUserId = null, actionType, entityType, details = {} }) => {
  const payload = {
    admin_id: adminId,
    target_user_id: targetUserId,
    action_type: actionType,
    entity_type: entityType,
    details: safeDetails(details),
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('audit_logs').insert(payload);
  if (!error) return;

  if (!isMissingTableError(error, 'audit_logs')) {
    throw error;
  }
};

const createNotification = async ({ userId, title, message, type, metadata = {} }) => {
  const payload = {
    user_id: userId,
    title,
    message,
    type,
    metadata: safeDetails(metadata),
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('notifications').insert(payload);
  if (!error) return;

  if (!isMissingTableError(error, 'notifications')) {
    throw error;
  }
};

const applySearch = (query, term) => {
  if (!term) return query;

  const escapedTerm = String(term).replace(/[,%]/g, '').trim();
  if (!escapedTerm) return query;

  return query.or(`name.ilike.%${escapedTerm}%,email.ilike.%${escapedTerm}%`);
};

const isSuperAdminUser = (req) => {
  const name = String(req.user?.name || '').trim().toLowerCase();
  return req.user?.role === 'super_admin' || name === 'alombah';
};

const getValidationErrorResponse = (req, res) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return null;
  }

  return res.status(400).json({
    success: false,
    message: 'Validation errors',
    errors: errors.array()
  });
};

const createAdminUser = async (req, res) => {
  try {
    const validationErrorResponse = getValidationErrorResponse(req, res);
    if (validationErrorResponse) return validationErrorResponse;

    const { name, email, password, phone, language } = req.body;
    const safeLanguage = language === 'fr' ? 'fr' : 'en';

    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUserError) throw existingUserError;

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data: userRow, error: insertError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: 'admin',
        language: safeLanguage,
        preferred_language: safeLanguage,
        verification_status: 'approved',
        is_verified: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    const user = mapUser(userRow);

    await runAdminSideEffect(
      () => writeAuditLog({
        adminId: req.user._id,
        targetUserId: user._id,
        actionType: 'create',
        entityType: 'user',
        details: { role: 'admin' }
      }),
      'admin account creation audit log'
    );

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const hydrateAdminInquiries = async (inquiryRows) => {
  const tenantMap = await getUsersMapByIds((inquiryRows || []).map((row) => row.tenant_id));
  const landlordMap = await getUsersMapByIds((inquiryRows || []).map((row) => row.landlord_id));
  const propertyMap = await getPropertiesMapByIds((inquiryRows || []).map((row) => row.property_id));

  return (inquiryRows || []).map((row) => {
    const property = propertyMap[row.property_id];
    const propertyLandlord = property ? landlordMap[property.landlord_id] : null;

    return mapInquiry(row, {
      tenant: tenantMap[row.tenant_id],
      landlord: landlordMap[row.landlord_id],
      property,
      propertyLandlord
    });
  });
};

const filterAdminInquiries = (inquiries, { search, status, dateRange }) => {
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const now = Date.now();
  const minCreatedAt = dateRange === '7d'
    ? now - (7 * 24 * 60 * 60 * 1000)
    : dateRange === '30d'
      ? now - (30 * 24 * 60 * 60 * 1000)
      : null;

  return (inquiries || []).filter((inquiry) => {
    if (status && status !== 'all' && inquiry.status !== status) {
      return false;
    }

    if (minCreatedAt && new Date(inquiry.createdAt).getTime() < minCreatedAt) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      inquiry.propertyId?.title,
      inquiry.propertyId?.location?.city,
      inquiry.tenantId?.name,
      inquiry.tenantId?.email,
      inquiry.landlordId?.name,
      inquiry.landlordId?.email,
      inquiry.tenantContact?.email,
      inquiry.tenantContact?.phone
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
};

const sanitizeInquiryForAdminList = (inquiry) => {
  const messages = Array.isArray(inquiry?.messages) ? inquiry.messages : [];
  const lastMessage = messages[messages.length - 1] || null;

  return {
    ...inquiry,
    messages: [],
    message: null,
    landlordResponse: {
      tenantLastReadAt: inquiry?.landlordResponse?.tenantLastReadAt || null,
      landlordLastReadAt: inquiry?.landlordResponse?.landlordLastReadAt || null,
      respondedAt: inquiry?.landlordResponse?.respondedAt || null
    },
    conversationId: inquiry?._id,
    conversationMeta: {
      lastActivityAt: lastMessage?.createdAt || inquiry?.updatedAt || inquiry?.createdAt,
      messageCount: messages.length
    }
  };
};

const getDashboard = async (req, res) => {
  try {
    const [usersResult, propertiesResult, inquiriesResult] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('properties').select('*'),
      supabase.from('inquiries').select('*')
    ]);

    if (usersResult.error) throw usersResult.error;
    if (propertiesResult.error) throw propertiesResult.error;
    if (inquiriesResult.error) throw inquiriesResult.error;

    const users = usersResult.data || [];
    const properties = propertiesResult.data || [];
    const inquiries = inquiriesResult.data || [];

    const totalUsers = users.filter((user) => user.is_active !== false).length;
    const totalLandlords = users.filter((user) => user.role === 'landlord' && user.is_active !== false).length;
    const pendingVerifications = users.filter(
      (user) => user.role === 'landlord' && user.verification_status === 'pending'
    ).length;
    const totalProperties = properties.filter((property) => property.is_active !== false).length;
    const totalInquiries = inquiries.length;

    const recentUsers = users
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((user) => mapUser(user));

    const pendingLandlords = users
      .filter((user) => user.role === 'landlord' && user.verification_status === 'pending')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((user) => mapUser(user));

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalLandlords,
          pendingVerifications,
          totalProperties,
          totalInquiries
        },
        recentUsers,
        pendingLandlords
      }
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const countPropertiesByFilters = async ({
  isActive = true,
  listingStatus,
  propertyCategory,
  rentalType
} = {}) => {
  const unsupportedColumns = new Set();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    let query = supabase
      .from('properties')
      .select('id', { count: 'exact', head: true });

    if (typeof isActive === 'boolean') {
      query = query.eq('is_active', isActive);
    }

    if (listingStatus && !unsupportedColumns.has('listing_status')) {
      query = query.eq('listing_status', listingStatus);
    }

    if (propertyCategory && !unsupportedColumns.has('property_category')) {
      query = query.eq('property_category', propertyCategory);
    }

    if (rentalType && !unsupportedColumns.has('rental_type')) {
      query = query.eq('rental_type', rentalType);
    }

    const { count, error } = await query;
    if (!error) {
      return count || 0;
    }

    const missingColumn = getMissingPropertiesColumnName(error);
    if (missingColumn && !unsupportedColumns.has(missingColumn)) {
      unsupportedColumns.add(missingColumn);
      continue;
    }

    throw error;
  }

  return 0;
};

const getPropertyAnalytics = async (req, res) => {
  try {
    const categories = ['residential', 'hospitality'];
    const rentalTypes = ['daily', 'weekly', 'monthly', 'yearly'];

    const [
      totalActive,
      available,
      taken,
      categoryCounts,
      rentalTypeCounts,
      categoryRentalMatrix
    ] = await Promise.all([
      countPropertiesByFilters({ isActive: true }),
      countPropertiesByFilters({ isActive: true, listingStatus: 'available' }),
      countPropertiesByFilters({ isActive: true, listingStatus: 'taken' }),
      Promise.all(
        categories.map(async (category) => ({
          propertyCategory: category,
          count: await countPropertiesByFilters({ isActive: true, propertyCategory: category })
        }))
      ),
      Promise.all(
        rentalTypes.map(async (type) => ({
          rentalType: type,
          count: await countPropertiesByFilters({ isActive: true, rentalType: type })
        }))
      ),
      Promise.all(
        categories.map(async (category) => {
          const counts = await Promise.all(
            rentalTypes.map(async (type) => ({
              rentalType: type,
              count: await countPropertiesByFilters({
                isActive: true,
                propertyCategory: category,
                rentalType: type
              })
            }))
          );

          return {
            propertyCategory: category,
            rentalTypeCounts: counts
          };
        })
      )
    ]);

    res.json({
      success: true,
      data: {
        totals: {
          active: totalActive,
          available,
          taken
        },
        byPropertyCategory: categoryCounts,
        byRentalType: rentalTypeCounts,
        byPropertyCategoryAndRentalType: categoryRentalMatrix
      }
    });
  } catch (error) {
    console.error('Get property analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getLandlords = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { status, search } = req.query;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'landlord');

    if (status && status !== 'all') {
      query = query.eq('verification_status', status);
    }

    query = applySearch(query, search);

    const { data: landlordRows, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const landlords = (landlordRows || []).map((landlord) => mapUser(landlord));

    res.json({
      success: true,
      data: {
        landlords,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get landlords error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const verifyLandlord = async (req, res) => {
  try {
    const validationErrorResponse = getValidationErrorResponse(req, res);
    if (validationErrorResponse) return validationErrorResponse;

    const { status, rejectionReason = '', adminNotes = '' } = req.body;
    const landlordId = req.params.id;

    const { data: landlordRow, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', landlordId)
      .maybeSingle();

    if (findError) throw findError;

    if (!landlordRow) {
      return res.status(404).json({
        success: false,
        message: 'Landlord not found'
      });
    }

    if (landlordRow.role !== 'landlord') {
      return res.status(400).json({
        success: false,
        message: 'User is not a landlord'
      });
    }

    const baseUpdatePayload = {
      verification_status: status,
      is_verified: status === 'approved',
      updated_at: new Date().toISOString()
    };

    const extendedUpdatePayload = {
      ...baseUpdatePayload,
      verification_rejection_reason: status === 'rejected' ? rejectionReason.trim() : null,
      admin_notes: adminNotes || landlordRow.admin_notes || null
    };

    let updateResult = await supabase
      .from('users')
      .update(extendedUpdatePayload)
      .eq('id', landlordId)
      .select('*')
      .single();

    if (
      updateResult.error && (
        isMissingColumnError(updateResult.error, 'users', 'admin_notes') ||
        isMissingColumnError(updateResult.error, 'users', 'verification_rejection_reason')
      )
    ) {
      updateResult = await supabase
        .from('users')
        .update(baseUpdatePayload)
        .eq('id', landlordId)
        .select('*')
        .single();
    }

    const { data: updatedRow, error: updateError } = updateResult;

    if (updateError) throw updateError;

    const landlord = mapUser(updatedRow);

    await runAdminSideEffect(
      () => createNotification({
        userId: landlordId,
        title: status === 'approved' ? 'Verification Approved' : 'Verification Rejected',
        message: status === 'approved'
          ? 'Your landlord verification has been approved. You can now manage properties.'
          : `Your landlord verification was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        type: status === 'approved' ? 'verification_approved' : 'verification_rejected',
        metadata: {
          rejectionReason: rejectionReason || null
        }
      }),
      'verification notification'
    );

    await runAdminSideEffect(
      () => writeAuditLog({
        adminId: req.user._id,
        targetUserId: landlordId,
        actionType: status === 'approved' ? 'approve' : 'reject',
        entityType: 'verification',
        details: {
          status,
          rejectionReason: rejectionReason || null,
          adminNotes: adminNotes || null
        }
      }),
      'verification audit log'
    );

    res.json({
      success: true,
      message: `Landlord ${status} successfully`,
      data: { landlord }
    });
  } catch (error) {
    console.error('Verify landlord error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { role, isActive, search } = req.query;

    let query = supabase.from('users').select('*', { count: 'exact' });

    if (role && role !== 'all') {
      const allowedRoles = ['tenant', 'landlord', 'admin', 'super_admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role filter must be tenant, landlord, admin, or super_admin'
        });
      }
      query = query.eq('role', role);
    }
    if (isActive !== undefined && isActive !== 'all') query = query.eq('is_active', isActive === 'true');

    query = applySearch(query, search);

    const { data: userRows, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const users = (userRows || []).map((user) => mapUser(user));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getAdmins = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { role, isActive, search } = req.query;
    const allowedRoles = ['admin', 'super_admin'];

    let query = supabase.from('users').select('*', { count: 'exact' }).in('role', allowedRoles);

    if (role && role !== 'all') {
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role filter must be admin or super_admin'
        });
      }
      query = query.eq('role', role);
    }
    if (isActive !== undefined && isActive !== 'all') query = query.eq('is_active', isActive === 'true');

    query = applySearch(query, search);

    const { data: userRows, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const users = (userRows || []).map((user) => mapUser(user));

    res.json({
      success: true,
      data: {
        admins: users,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const banUser = async (req, res) => {
  try {
    const validationErrorResponse = getValidationErrorResponse(req, res);
    if (validationErrorResponse) return validationErrorResponse;

    const userId = req.params.id;
    const { isActive } = req.body;

    const { data: userRow, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (findError) throw findError;

    if (!userRow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (userRow.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot ban super admin users'
      });
    }

    if (userRow.role === 'admin' && !isSuperAdminUser(req)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot ban admin users'
      });
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from('users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const user = mapUser(updatedRow);

    await runAdminSideEffect(
      () => createNotification({
        userId,
        title: isActive ? 'Account Activated' : 'Account Suspended',
        message: isActive
          ? 'Your account has been reactivated by an administrator.'
          : 'Your account has been suspended by an administrator.',
        type: isActive ? 'account_activated' : 'account_suspended'
      }),
      'account status notification'
    );

    await runAdminSideEffect(
      () => writeAuditLog({
        adminId: req.user._id,
        targetUserId: userId,
        actionType: isActive ? 'activate' : 'suspend',
        entityType: 'user',
        details: {
          isActive
        }
      }),
      'account status audit log'
    );

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'banned'} successfully`,
      data: { user }
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const { data: userRow, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!userRow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: mapUser(userRow)
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;

    const { data: userRow, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (findError) throw findError;

    if (!userRow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        reset_password_token: resetToken,
        reset_password_expires: new Date(resetTokenExpiry).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const user = mapUser(updatedUser);

    await runAdminSideEffect(
      () => sendPasswordResetEmail(user, resetToken),
      'admin password reset email'
    );

    await runAdminSideEffect(
      () => writeAuditLog({
        adminId: req.user._id,
        targetUserId: userId,
        actionType: 'reset_password',
        entityType: 'user',
        details: {}
      }),
      'password reset audit log'
    );

    await runAdminSideEffect(
      () => createNotification({
        userId,
        title: 'Password Reset Requested',
        message: 'An administrator requested a password reset for your account. Check your email for next steps.',
        type: 'password_reset'
      }),
      'password reset notification'
    );

    res.json({
      success: true,
      message: 'Password reset email sent successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Admin user reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const validationErrorResponse = getValidationErrorResponse(req, res);
    if (validationErrorResponse) return validationErrorResponse;

    const userId = req.params.id;
    const { role } = req.body;

    if (req.user._id === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    const { data: userRow, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (findError) throw findError;

    if (!userRow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (userRow.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change super admin user roles'
      });
    }

    if (userRow.role === 'admin' && !isSuperAdminUser(req)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change admin user roles'
      });
    }

    const nextVerificationStatus = role === 'landlord' ? 'pending' : 'approved';
    const nextIsVerified = role !== 'landlord';

    const { data: updatedRow, error: updateError } = await supabase
      .from('users')
      .update({
        role,
        verification_status: nextVerificationStatus,
        is_verified: nextIsVerified,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const user = mapUser(updatedRow);

    await runAdminSideEffect(
      () => writeAuditLog({
        adminId: req.user._id,
        targetUserId: userId,
        actionType: 'role_update',
        entityType: 'user',
        details: {
          from: userRow.role,
          to: role
        }
      }),
      'role update audit log'
    );

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: { user }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const validationErrorResponse = getValidationErrorResponse(req, res);
    if (validationErrorResponse) return validationErrorResponse;

    const userId = req.params.id;
    const { name, email, phone } = req.body;

    const { data: userRow, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (findError) throw findError;

    if (!userRow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const payload = {
      updated_at: new Date().toISOString()
    };

    if (typeof name === 'string' && name.trim()) payload.name = name.trim();
    if (typeof email === 'string' && email.trim()) payload.email = email.trim().toLowerCase();
    if (typeof phone === 'string') payload.phone = phone.trim();

    const { data: updatedRow, error: updateError } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    await runAdminSideEffect(
      () => writeAuditLog({
        adminId: req.user._id,
        targetUserId: userId,
        actionType: 'edit',
        entityType: 'user',
        details: {
          updatedFields: Object.keys(payload).filter((field) => field !== 'updated_at')
        }
      }),
      'user edit audit log'
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: mapUser(updatedRow)
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateUserPassword = async (req, res) => {
  try {
    const validationErrorResponse = getValidationErrorResponse(req, res);
    if (validationErrorResponse) return validationErrorResponse;

    const userId = req.params.id;
    const { newPassword } = req.body;

    const { data: userRow, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (findError) throw findError;

    if (!userRow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const { data: updatedRow, error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    await runAdminSideEffect(
      () => writeAuditLog({
        adminId: req.user._id,
        targetUserId: userId,
        actionType: 'password_reset',
        entityType: 'user',
        details: {
          method: 'direct_admin_update'
        }
      }),
      'admin password reset audit log'
    );

    await runAdminSideEffect(
      () => createNotification({
        userId,
        title: 'Password Updated by Admin',
        message: 'An administrator has updated your account password. Please login with your new credentials.',
        type: 'password_updated'
      }),
      'admin password change notification'
    );

    res.json({
      success: true,
      message: 'User password updated successfully',
      data: {
        user: mapUser(updatedRow)
      }
    });
  } catch (error) {
    console.error('Update user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user._id === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const { data: userRow, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (findError) throw findError;

    if (!userRow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (userRow.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete super admin users'
      });
    }

    if (userRow.role === 'admin' && !isSuperAdminUser(req)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) throw deleteError;

    await runAdminSideEffect(
      () => writeAuditLog({
        adminId: req.user._id,
        targetUserId: userId,
        actionType: 'delete',
        entityType: 'user',
        details: {
          email: userRow.email,
          role: userRow.role
        }
      }),
      'user delete audit log'
    );

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      if (isMissingTableError(error, 'notifications')) {
        return res.json({
          success: true,
          data: {
            notifications: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0
            }
          }
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: {
        notifications: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const from = (page - 1) * limit;
    const to = from + limit;

    let shouldUsePgFallback = false;

    const { data: auditRows, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (auditError && isMissingTableError(auditError, 'audit_logs')) {
      shouldUsePgFallback = true;
    } else if (auditError) {
      throw auditError;
    }

    const { data: activityRows, error: activityError } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (activityError && isMissingTableError(activityError, 'activity_logs')) {
      shouldUsePgFallback = true;
    } else if (activityError) {
      throw activityError;
    }

    if (shouldUsePgFallback) {
      try {
        const { rows, total } = await getMergedAuditRows({ page, limit });

        const actorIds = rows.map((log) => log.actor_user_id);
        const targetIds = rows.map((log) => log.target_user_id);
        const actorMap = await getUsersMapByIds(actorIds);
        const targetMap = await getUsersMapByIds(targetIds);

        const logs = rows.map((log) => {
          const actor = actorMap[log.actor_user_id] ? mapUser(actorMap[log.actor_user_id]) : null;
          const targetUser = targetMap[log.target_user_id] ? mapUser(targetMap[log.target_user_id]) : null;
          const details = log.details || {};

          return {
            id: `${log.source}-${log.id}`,
            actionType: log.action_type,
            entityType: log.entity_type,
            details,
            createdAt: log.created_at,
            source: log.source,
            actor,
            admin: actor,
            targetUser,
            actorRole: actor?.role || details.actorRole || (log.source === 'audit' ? 'admin' : 'user')
          };
        });

        return res.json({
          success: true,
          data: {
            logs,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit)
            }
          }
        });
      } catch (pgFallbackError) {
        const { data: notificationRows, error: notificationError, count: notificationCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact' })
          .in('type', ['admin_info', 'admin_alert'])
          .order('created_at', { ascending: false })
          .range(from, to - 1);

        if (notificationError) {
          const [usersResult, propertiesResult, inquiriesResult] = await Promise.all([
            supabase.from('users').select('id, name, email, role, created_at').order('created_at', { ascending: false }).limit(50),
            supabase.from('properties').select('id, title, landlord_id, created_at, updated_at').order('created_at', { ascending: false }).limit(50),
            supabase.from('inquiries').select('id, tenant_id, landlord_id, status, created_at, updated_at').order('created_at', { ascending: false }).limit(50)
          ]);

          if (usersResult.error || propertiesResult.error || inquiriesResult.error) {
            throw pgFallbackError;
          }

          const propertyRows = propertiesResult.data || [];
          const inquiryRows = inquiriesResult.data || [];
          const userRows = usersResult.data || [];

          const actorIds = [
            ...propertyRows.map((item) => item.landlord_id),
            ...inquiryRows.map((item) => item.tenant_id),
            ...inquiryRows.map((item) => item.landlord_id),
            ...userRows.map((item) => item.id)
          ].filter(Boolean);

          const actorMap = await getUsersMapByIds(actorIds);

          const derivedRows = [
            ...propertyRows.map((item) => ({
              id: `property-${item.id}`,
              createdAt: item.created_at,
              actionType: 'create',
              entityType: 'property',
              actorId: item.landlord_id,
              details: {
                message: `${actorMap[item.landlord_id]?.name || 'Landlord'} added property ${item.title || item.id}`
              }
            })),
            ...inquiryRows.map((item) => ({
              id: `inquiry-${item.id}`,
              createdAt: item.created_at,
              actionType: 'create',
              entityType: 'inquiry',
              actorId: item.tenant_id,
              details: {
                message: `${actorMap[item.tenant_id]?.name || 'Tenant'} opened inquiry #${item.id}`
              }
            })),
            ...userRows.map((item) => ({
              id: `user-${item.id}`,
              createdAt: item.created_at,
              actionType: 'create',
              entityType: 'user',
              actorId: item.id,
              details: {
                message: `${item.name || item.email || 'User'} account created (${item.role || 'user'})`
              }
            }))
          ]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          const pagedDerivedRows = derivedRows.slice(from, to);

          const logs = pagedDerivedRows.map((item) => {
            const actor = actorMap[item.actorId] ? mapUser(actorMap[item.actorId]) : null;

            return {
              id: `derived-${item.id}`,
              actionType: item.actionType,
              entityType: item.entityType,
              details: item.details,
              createdAt: item.createdAt,
              source: 'derived_fallback',
              actor,
              admin: actor,
              targetUser: null,
              actorRole: actor?.role || 'user'
            };
          });

          return res.json({
            success: true,
            data: {
              logs,
              pagination: {
                page,
                limit,
                total: derivedRows.length,
                pages: Math.ceil(derivedRows.length / limit)
              }
            }
          });
        }

        const actorIds = (notificationRows || []).map((item) => item.user_id).filter(Boolean);
        const actorMap = await getUsersMapByIds(actorIds);

        const logs = (notificationRows || []).map((item) => {
          const metadata = item.metadata || {};
          const actor = actorMap[item.user_id] ? mapUser(actorMap[item.user_id]) : null;

          return {
            id: `notification-${item.id}`,
            actionType: metadata.originalActionType || metadata.actionType || metadata.event || item.type || 'activity',
            entityType: metadata.originalEntityType || metadata.entityType || 'system',
            details: {
              message: item.message,
              ...(metadata && typeof metadata === 'object' ? metadata : {})
            },
            createdAt: item.created_at,
            source: 'notification_fallback',
            actor,
            admin: actor,
            targetUser: null,
            actorRole: actor?.role || metadata?.actorRole || 'user'
          };
        });

        return res.json({
          success: true,
          data: {
            logs,
            pagination: {
              page,
              limit,
              total: notificationCount || 0,
              pages: Math.ceil((notificationCount || 0) / limit)
            }
          }
        });
      }
    }

    const allRows = [
      ...(auditRows || []).map((row) => ({ ...row, _source: 'audit' })),
      ...(activityRows || []).map((row) => ({ ...row, _source: 'activity' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const pagedRows = allRows.slice(from, to);
    const actorIds = pagedRows.map((log) => (log._source === 'audit' ? log.admin_id : log.actor_user_id));
    const targetIds = pagedRows.map((log) => (log._source === 'audit' ? log.target_user_id : log.target_user_id));

    const actorMap = await getUsersMapByIds(actorIds);
    const targetMap = await getUsersMapByIds(targetIds);

    const logs = pagedRows.map((log) => {
      const actorId = log._source === 'audit' ? log.admin_id : log.actor_user_id;
      const actor = actorMap[actorId] ? mapUser(actorMap[actorId]) : null;
      const targetUser = targetMap[log.target_user_id] ? mapUser(targetMap[log.target_user_id]) : null;
      const details = log.details || {};

      return {
        id: `${log._source}-${log.id}`,
        actionType: log.action_type,
        entityType: log.entity_type,
        details,
        createdAt: log.created_at,
        source: log._source,
        actor,
        admin: actor,
        targetUser,
        actorRole: actor?.role || details.actorRole || (log._source === 'audit' ? 'admin' : 'user')
      };
    });

    const total = allRows.length;

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getInquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { status = 'all', search = '', dateRange = 'all' } = req.query;

    const [inquiriesResult, statusResult] = await Promise.all([
      supabase.from('inquiries').select('*').order('created_at', { ascending: false }),
      supabase.from('inquiries').select('status')
    ]);

    if (inquiriesResult.error) throw inquiriesResult.error;
    if (statusResult.error) throw statusResult.error;

    const hydratedInquiries = await hydrateAdminInquiries(inquiriesResult.data || []);
    const filteredInquiries = filterAdminInquiries(hydratedInquiries, { search, status, dateRange });
    const inquiries = filteredInquiries.slice(from, to + 1).map(sanitizeInquiryForAdminList);
    const allStatuses = statusResult.data || [];

    res.json({
      success: true,
      data: {
        inquiries,
        stats: {
          total: allStatuses.length,
          pending: allStatuses.filter((item) => item.status === 'pending').length,
          responded: allStatuses.filter((item) => item.status === 'responded').length,
          closed: allStatuses.filter((item) => item.status === 'closed').length
        },
        pagination: {
          page,
          limit,
          total: filteredInquiries.length,
          pages: Math.ceil(filteredInquiries.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admin inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const decryptInquiryConversation = async (req, res) => {
  try {
    const inquiryId = req.params.id;

    const { data: inquiryRow, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', inquiryId)
      .maybeSingle();

    if (error) throw error;

    if (!inquiryRow) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    const [hydratedInquiry] = await hydrateAdminInquiries([inquiryRow]);

    try {
      await logActivity({
        actorUserId: req.user._id,
        targetUserId: inquiryRow.tenant_id,
        actionType: 'decrypt',
        entityType: 'inquiry',
        details: {
          message: `${req.user.name || 'Admin'} decrypted inquiry conversation ${inquiryId}`,
          inquiryId,
          landlordId: inquiryRow.landlord_id,
          actorRole: req.user.role || 'admin'
        }
      });
    } catch (activityError) {
      console.warn('Inquiry decrypt activity log skipped:', activityError.message || activityError);
    }

    res.json({
      success: true,
      data: {
        inquiry: {
          ...hydratedInquiry,
          conversationId: hydratedInquiry?._id,
          decryptedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Decrypt inquiry conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { isActive, isApproved, listingStatus } = req.query;

    let query = supabase.from('properties').select('*', { count: 'exact' });

    if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');
    if (isApproved !== undefined) query = query.eq('is_approved', isApproved === 'true');

    const normalizedListingStatus = String(listingStatus || '').toLowerCase();
    if (normalizedListingStatus === 'available' || normalizedListingStatus === 'taken') {
      query = query.filter('contact_info->>listingStatus', 'eq', normalizedListingStatus);
    }

    const { data: propertyRows, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const landlordMap = await getUsersMapByIds((propertyRows || []).map((property) => property.landlord_id));
    const properties = (propertyRows || []).map((property) => mapProperty(property, landlordMap[property.landlord_id]));

    res.json({
      success: true,
      data: {
        properties,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const deleteProperty = async (req, res) => {
  try {
    const { data: propertyRow, error: findError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw findError;

    if (!propertyRow) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (propertyRow.images && propertyRow.images.length > 0) {
      const { deleteFromCloudinary, getPublicIdFromUrl } = require('../services/cloudinary');

      for (const image of propertyRow.images) {
        const imageUrl = typeof image === 'string' ? image : image?.url;
        if (!imageUrl) continue;

        try {
          const publicId = getPublicIdFromUrl(imageUrl);
          if (publicId) {
            await deleteFromCloudinary(publicId, 'image');
          }
        } catch (cloudinaryError) {
          console.error(`Failed to delete image ${imageUrl}:`, cloudinaryError.message);
        }
      }
    }

    const videoUrls = Array.isArray(propertyRow?.contact_info?.videos)
      ? propertyRow.contact_info.videos
      : [];

    if (videoUrls.length > 0) {
      const { deleteFromCloudinary, getPublicIdFromUrl } = require('../services/cloudinary');

      for (const videoUrl of videoUrls) {
        if (!videoUrl || typeof videoUrl !== 'string') continue;

        try {
          const publicId = getPublicIdFromUrl(videoUrl);
          if (publicId) {
            await deleteFromCloudinary(publicId, 'video');
          }
        } catch (cloudinaryError) {
          console.error(`Failed to delete video ${videoUrl}:`, cloudinaryError.message);
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('properties')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: 'Property deleted successfully by admin'
    });
  } catch (error) {
    console.error('Admin delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getDashboard,
  getPropertyAnalytics,
  getLandlords,
  verifyLandlord,
  getUsers,
  getAdmins,
  getUser,
  banUser,
  updateUserRole,
  updateUser,
  updateUserPassword,
  resetUserPassword,
  deleteUser,
  createAdminUser,
  getInquiries,
  decryptInquiryConversation,
  getNotifications,
  getAuditLogs,
  getProperties,
  deleteProperty
};
