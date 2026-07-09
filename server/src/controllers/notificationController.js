const { supabase } = require('../services/supabaseData');

const isMissingTableError = (error, tableName) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const target = String(tableName || '').toLowerCase();

  if (code === 'pgrst205' || code === '42p01') {
    return true;
  }

  return (
    message.includes(target)
    && (
      message.includes('relation')
      || message.includes('schema cache')
      || message.includes('could not find the table')
      || message.includes('does not exist')
    )
  );
};

const toObject = (value) => {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (parseError) {
      return {}
    }
  }
  if (typeof value === 'object') {
    return value
  }
  return {}
};

const getMyNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const [notificationsResult, unreadResult] = await Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', req.user._id)
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user._id)
        .eq('is_read', false)
    ]);

    if (notificationsResult.error) {
      if (isMissingTableError(notificationsResult.error, 'notifications')) {
        return res.json({
          success: true,
          data: {
            notifications: [],
            unreadCount: 0,
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0
            }
          }
        });
      }
      throw notificationsResult.error;
    }

    if (unreadResult.error && !isMissingTableError(unreadResult.error, 'notifications')) {
      throw unreadResult.error;
    }

    res.json({
      success: true,
      data: {
        notifications: notificationsResult.data || [],
        unreadCount: unreadResult.count || 0,
        pagination: {
          page,
          limit,
          total: notificationsResult.count || 0,
          pages: Math.ceil((notificationsResult.count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get tenant notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: notification, error: findError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (findError) {
      if (isMissingTableError(findError, 'notifications')) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      throw findError;
    }

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const { data: updatedNotification, error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', req.user._id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification: updatedNotification }
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user._id)
      .eq('is_read', false);

    if (error) {
      if (isMissingTableError(error, 'notifications')) {
        return res.json({
          success: true,
          message: 'No notifications to update'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const sendTenantPropertyRequest = async (req, res) => {
  try {
    const {
      propertyType,
      city,
      minBudget,
      maxBudget,
      bedrooms,
      message
    } = req.body;

    if (!propertyType || !message) {
      return res.status(400).json({
        success: false,
        message: 'Property type and message are required.'
      });
    }

    const { data: landlordRows, error: landlordError } = await supabase
      .from('users')
      .select('id, name, email, is_active, verification_status')
      .eq('role', 'landlord')
      .eq('is_active', true)
      .eq('verification_status', 'approved');

    if (landlordError) throw landlordError;

    const landlords = (landlordRows || []).filter((landlord) => landlord.id && landlord.email);

    const notificationRows = landlords.map((landlord) => ({
      user_id: landlord.id,
      title: `Tenant request: ${propertyType}`,
      message: `A tenant is looking for a ${propertyType}${city ? ` in ${city}` : ''}. Respond to connect with them.`,
      type: 'admin_info',
      metadata: {
        event: 'tenant_property_request',
        propertyType,
        city: city || null,
        minBudget: minBudget ? Number(minBudget) : null,
        maxBudget: maxBudget ? Number(maxBudget) : null,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        tenantId: req.user._id,
        tenantName: req.user.name,
        tenantEmail: req.user.email,
        tenantMessage: message,
        createdAt: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    }));

    if (notificationRows.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .insert(notificationRows);

      if (error && !isMissingTableError(error, 'notifications')) {
        throw error;
      }
    }

    res.status(201).json({
      success: true,
      message: 'Your property request was sent to verified landlords successfully.'
    });
  } catch (error) {
    console.error('Send tenant property request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const respondToTenantRequest = async (req, res) => {
  try {
    const { notificationId, response } = req.body;

    if (!notificationId || !response) {
      return res.status(400).json({
        success: false,
        message: 'Request notification and response message are required.'
      });
    }

    const { data: notificationRow, error: findError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', req.user._id)
      .maybeSingle();

    if (findError) throw findError;

    if (!notificationRow) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or not authorized.'
      });
    }

    const metadata = toObject(notificationRow.metadata);
    if (metadata.event !== 'tenant_property_request' || !metadata.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'This notification is not a tenant property request.'
      });
    }

    const tenantId = metadata.tenantId;
    const tenantName = metadata.tenantName || 'Tenant';
    const propertyType = metadata.propertyType || 'property';
    const city = metadata.city || 'your area';

    const responseNotification = {
      user_id: tenantId,
      title: `Response from ${req.user.name}`,
      message: `${req.user.name} responded to your ${propertyType} request${city ? ` in ${city}` : ''}.`,
      type: 'admin_info',
      metadata: {
        event: 'tenant_property_request_response',
        originalRequestNotificationId: notificationRow.id,
        landlordId: req.user._id,
        landlordName: req.user.name,
        landlordEmail: req.user.email,
        response,
        propertyType,
        city,
        bedrooms: metadata.bedrooms || null,
        minBudget: metadata.minBudget || null,
        maxBudget: metadata.maxBudget || null,
        sentAt: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('notifications')
      .insert([responseNotification]);

    if (insertError && !isMissingTableError(insertError, 'notifications')) {
      throw insertError;
    }

    const updatedMetadata = {
      ...metadata,
      respondedAt: new Date().toISOString(),
      landlordResponse: response
    };

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ metadata: updatedMetadata })
      .eq('id', notificationRow.id);

    if (updateError && !isMissingTableError(updateError, 'notifications')) {
      throw updateError;
    }

    res.json({
      success: true,
      message: 'Response sent successfully.'
    });
  } catch (error) {
    console.error('Respond to tenant property request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendTenantPropertyRequest,
  respondToTenantRequest
};
