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
      propertyId,
      accommodationType,
      roomType,
      checkInDate,
      checkOutDate,
      checkInTime,
      checkOutTime,
      guests,
      propertyType,
      city,
      minBudget,
      maxBudget,
      bedrooms,
      message
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'A request message is required.'
      });
    }

    const parsedCheckIn = checkInDate ? new Date(checkInDate) : null;
    const parsedCheckOut = checkOutDate ? new Date(checkOutDate) : null;

    if ((parsedCheckIn && Number.isNaN(parsedCheckIn.getTime())) || (parsedCheckOut && Number.isNaN(parsedCheckOut.getTime()))) {
      return res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates must be valid dates.'
      });
    }

    if (parsedCheckIn && parsedCheckOut && parsedCheckOut <= parsedCheckIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date.'
      });
    }

    let targetProperty = null;
    let landlords = [];

    if (propertyId) {
      const { data: propertyRow, error: propertyError } = await supabase
        .from('properties')
        .select('id, title, property_type, property_category, landlord_id, location, hospitality_info, is_active, is_approved, listing_status')
        .eq('id', propertyId)
        .maybeSingle();

      if (propertyError) throw propertyError;

      if (!propertyRow || propertyRow.is_active === false || propertyRow.is_approved === false || propertyRow.listing_status === 'taken') {
        return res.status(404).json({
          success: false,
          message: 'Accommodation is not available for booking requests.'
        });
      }

      if (propertyRow.property_category !== 'hospitality') {
        return res.status(400).json({
          success: false,
          message: 'Booking requests are available only for hotels and guest houses.'
        });
      }

      targetProperty = propertyRow;

      const { data: landlordRows, error: landlordError } = await supabase
        .from('users')
        .select('id, name, email, is_active, verification_status')
        .eq('id', propertyRow.landlord_id)
        .eq('role', 'landlord')
        .eq('is_active', true)
        .eq('verification_status', 'approved');

      if (landlordError) throw landlordError;
      landlords = (landlordRows || []).filter((landlord) => landlord.id);
    }

    if (!propertyId) {
      const { data: landlordRows, error: landlordError } = await supabase
        .from('users')
        .select('id, name, email, is_active, verification_status')
        .eq('role', 'landlord')
        .eq('is_active', true)
        .eq('verification_status', 'approved');

      if (landlordError) throw landlordError;
      landlords = (landlordRows || []).filter((landlord) => landlord.id && landlord.email);
    }

    const normalizedPropertyType = propertyType || targetProperty?.property_type || accommodationType || 'accommodation';
    const normalizedCity = city || targetProperty?.location?.city || null;
    const notificationEvent = propertyId
      ? 'tenant_accommodation_booking_request'
      : 'tenant_accommodation_search_request';

    const formatStayWindow = (startDate, startTime, endDate, endTime) => {
      const start = startDate ? `${startDate}${startTime ? ` ${startTime}` : ''}` : null;
      const end = endDate ? `${endDate}${endTime ? ` ${endTime}` : ''}` : null;

      if (start && end) return ` from ${start} to ${end}`;
      if (start) return ` for ${start}`;
      if (end) return ` until ${end}`;
      return '';
    };

    const notificationRows = landlords.map((landlord) => ({
      user_id: landlord.id,
      title: propertyId ? `Booking request: ${targetProperty?.title || normalizedPropertyType}` : `Accommodation request: ${normalizedPropertyType}`,
      message: propertyId
        ? `A guest requested ${targetProperty?.title || 'your accommodation'}${normalizedCity ? ` in ${normalizedCity}` : ''}${formatStayWindow(checkInDate, checkInTime, checkOutDate, checkOutTime)}.`
        : `A guest is looking for ${normalizedPropertyType}${normalizedCity ? ` in ${normalizedCity}` : ''}. Respond to connect with them.`,
      type: 'admin_info',
      metadata: {
        event: notificationEvent,
        bookingStatus: 'pending',
        propertyId: targetProperty?.id || null,
        propertyTitle: targetProperty?.title || null,
        propertyType: normalizedPropertyType,
        accommodationType: accommodationType || targetProperty?.property_type || null,
        roomType: roomType || null,
        city: normalizedCity,
        checkInDate: checkInDate || null,
        checkOutDate: checkOutDate || null,
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        guests: guests ? Number(guests) : null,
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
      message: propertyId
        ? 'Your booking request was sent successfully.'
        : 'Your accommodation request was sent to verified providers successfully.'
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
    const { notificationId, response, bookingStatus } = req.body;

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
    const isLegacyPropertyRequest = metadata.event === 'tenant_property_request';
    const isAccommodationSearchRequest = metadata.event === 'tenant_accommodation_search_request';
    const isAccommodationBookingRequest = metadata.event === 'tenant_accommodation_booking_request';

    if ((!isLegacyPropertyRequest && !isAccommodationSearchRequest && !isAccommodationBookingRequest) || !metadata.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'This notification is not a valid tenant accommodation request.'
      });
    }

    const tenantId = metadata.tenantId;
    const propertyType = metadata.propertyType || metadata.accommodationType || 'accommodation';
    const city = metadata.city || 'your area';
    const normalizedBookingStatus = ['confirmed', 'cancelled', 'pending'].includes(String(bookingStatus || '').toLowerCase())
      ? String(bookingStatus || '').toLowerCase()
      : 'confirmed';
    const responseEvent = isAccommodationBookingRequest
      ? 'tenant_accommodation_booking_status'
      : 'tenant_accommodation_request_response';

    const responseTitle = isAccommodationBookingRequest
      ? `Booking ${normalizedBookingStatus}`
      : `Response from ${req.user.name}`;

    const responseMessage = isAccommodationBookingRequest
      ? `${req.user.name} marked your booking request as ${normalizedBookingStatus}${city ? ` for ${city}` : ''}.`
      : `${req.user.name} responded to your ${propertyType} request${city ? ` in ${city}` : ''}.`;

    const responseNotification = {
      user_id: tenantId,
      title: responseTitle,
      message: responseMessage,
      type: 'admin_info',
      metadata: {
        event: responseEvent,
        bookingStatus: isAccommodationBookingRequest ? normalizedBookingStatus : null,
        originalRequestNotificationId: notificationRow.id,
        landlordId: req.user._id,
        landlordName: req.user.name,
        landlordEmail: req.user.email,
        response,
        propertyType,
        accommodationType: metadata.accommodationType || null,
        roomType: metadata.roomType || null,
        city,
        checkInDate: metadata.checkInDate || null,
        checkOutDate: metadata.checkOutDate || null,
        guests: metadata.guests || null,
        propertyId: metadata.propertyId || null,
        propertyTitle: metadata.propertyTitle || null,
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
      bookingStatus: isAccommodationBookingRequest ? normalizedBookingStatus : metadata.bookingStatus,
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
