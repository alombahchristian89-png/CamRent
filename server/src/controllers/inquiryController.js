const {
  supabase,
  mapInquiry,
  mapProperty,
  getUsersMapByIds,
  getPropertiesMapByIds
} = require('../services/supabaseData');
const { logActivity } = require('../services/activityLogger');

const toObject = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
};

const getConversationMessages = (inquiryRow) => {
  const responsePayload = typeof inquiryRow?.landlord_response === 'object' && inquiryRow?.landlord_response
    ? inquiryRow.landlord_response
    : {};

  if (Array.isArray(responsePayload.messages)) {
    return responsePayload.messages.filter((entry) => entry && entry.message);
  }

  if (responsePayload.message) {
    return [{
      senderRole: 'landlord',
      message: responsePayload.message,
      createdAt: responsePayload.respondedAt || inquiryRow.updated_at || inquiryRow.created_at
    }];
  }

  return [];
};

const appendInquiryMessage = ({ inquiryRow, senderRole, senderId, senderName, message }) => {
  const conversationMessages = getConversationMessages(inquiryRow);
  const createdAt = new Date().toISOString();
  const currentLandlordResponse = toObject(inquiryRow?.landlord_response);
  const nextMessages = [
    ...conversationMessages,
    {
      senderRole,
      senderId,
      senderName,
      message,
      createdAt
    }
  ];

  return {
    messages: nextMessages,
    respondedAt: senderRole === 'landlord'
      ? createdAt
      : (currentLandlordResponse.respondedAt || null),
    tenantLastReadAt: senderRole === 'tenant'
      ? createdAt
      : (currentLandlordResponse.tenantLastReadAt || null),
    landlordLastReadAt: senderRole === 'landlord'
      ? createdAt
      : (currentLandlordResponse.landlordLastReadAt || null)
  };
};

const hydrateInquiries = async (inquiryRows) => {
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

const filterInquiries = (inquiries, { search, status, dateRange }) => {
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
      inquiry.message,
      inquiry.propertyId?.title,
      inquiry.propertyId?.location?.city,
      inquiry.tenantId?.name,
      inquiry.tenantId?.email,
      inquiry.landlordId?.name,
      inquiry.landlordId?.email,
      inquiry.landlordResponse?.message,
      inquiry.tenantContact?.email,
      inquiry.tenantContact?.phone
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
};

const sendInquiry = async (req, res) => {
  try {
    const { propertyId, message, tenantContact } = req.body;

    const { data: propertyRow, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .maybeSingle();

    if (propertyError) throw propertyError;

    if (!propertyRow) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const propertyContactInfo = toObject(propertyRow.contact_info);
    const listingStatus = propertyContactInfo.listingStatus === 'taken' ? 'taken' : 'available';
    if (listingStatus === 'taken') {
      return res.status(400).json({
        success: false,
        message: 'This property is already taken and no longer accepting inquiries.'
      });
    }

    const { data: inquiryRow, error: inquiryError } = await supabase
      .from('inquiries')
      .insert({
        tenant_id: req.user._id,
        landlord_id: propertyRow.landlord_id,
        property_id: propertyId,
        message,
        status: 'pending',
        tenant_contact: tenantContact || {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone
        },
        landlord_response: {
          messages: [],
          tenantLastReadAt: new Date().toISOString(),
          landlordLastReadAt: null,
          respondedAt: null
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (inquiryError) throw inquiryError;

    const { error: propertyUpdateError } = await supabase
      .from('properties')
      .update({
        inquiries: Number(propertyRow.inquiries || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', propertyId);

    if (propertyUpdateError) throw propertyUpdateError;

    const [inquiry] = await hydrateInquiries([inquiryRow]);

    try {
      await logActivity({
        actorUserId: req.user._id,
        targetUserId: propertyRow.landlord_id,
        actionType: 'create',
        entityType: 'inquiry',
        details: {
          message: `${req.user.name || 'Tenant'} opened inquiry for ${inquiry.propertyId?.title || 'a property'}`,
          inquiryId: inquiry._id,
          propertyId,
          actorRole: req.user.role || 'tenant'
        }
      });
    } catch (activityError) {
      console.warn('Inquiry create activity log skipped:', activityError.message || activityError);
    }

    res.status(201).json({
      success: true,
      message: 'Inquiry sent successfully',
      data: { inquiry }
    });
  } catch (error) {
    console.error('Send inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getTenantInquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { search = '', status = 'all', dateRange = 'all' } = req.query;

    const { data: inquiryRows, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('tenant_id', req.user._id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const hydratedInquiries = await hydrateInquiries(inquiryRows || []);
    const filteredInquiries = filterInquiries(hydratedInquiries, { search, status, dateRange });
    const inquiries = filteredInquiries.slice(from, to + 1);

    res.json({
      success: true,
      data: {
        inquiries,
        pagination: {
          page,
          limit,
          total: filteredInquiries.length,
          pages: Math.ceil(filteredInquiries.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get tenant inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getLandlordInquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { search = '', status = 'all', dateRange = 'all' } = req.query;

    const { data: inquiryRows, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('landlord_id', req.user._id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const hydratedInquiries = await hydrateInquiries(inquiryRows || []);
    const filteredInquiries = filterInquiries(hydratedInquiries, { search, status, dateRange });
    const inquiries = filteredInquiries.slice(from, to + 1);

    res.json({
      success: true,
      data: {
        inquiries,
        pagination: {
          page,
          limit,
          total: filteredInquiries.length,
          pages: Math.ceil(filteredInquiries.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get landlord inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const respondToInquiry = async (req, res) => {
  try {
    const { message } = req.body;

    const { data: inquiryRow, error: findError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw findError;

    if (!inquiryRow) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    if (inquiryRow.landlord_id !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this inquiry'
      });
    }

    if (inquiryRow.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Inquiry is closed'
      });
    }

    const landlordResponse = appendInquiryMessage({
      inquiryRow,
      senderRole: 'landlord',
      senderId: req.user._id,
      senderName: req.user.name,
      message
    });

    const { data: updatedRow, error: updateError } = await supabase
      .from('inquiries')
      .update({
        landlord_response: landlordResponse,
        status: 'responded',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const [inquiry] = await hydrateInquiries([updatedRow]);

    try {
      await logActivity({
        actorUserId: req.user._id,
        targetUserId: inquiryRow.tenant_id,
        actionType: 'message',
        entityType: 'inquiry',
        details: {
          message: `${req.user.name || 'Landlord'} replied to inquiry ${inquiry._id}`,
          inquiryId: inquiry._id,
          propertyId: inquiry.propertyId?._id || inquiry.propertyId || null,
          actorRole: req.user.role || 'landlord'
        }
      });
    } catch (activityError) {
      console.warn('Inquiry response activity log skipped:', activityError.message || activityError);
    }

    res.json({
      success: true,
      message: 'Response sent successfully',
      data: { inquiry }
    });
  } catch (error) {
    console.error('Respond to inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const sendInquiryMessage = async (req, res) => {
  try {
    const { message } = req.body;

    const { data: inquiryRow, error: findError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw findError;

    if (!inquiryRow) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    const isTenant = req.user.role === 'tenant' && inquiryRow.tenant_id === req.user._id;
    const isLandlord = req.user.role === 'landlord' && inquiryRow.landlord_id === req.user._id;

    if (!isTenant && !isLandlord) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this conversation'
      });
    }

    if (inquiryRow.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Inquiry is closed'
      });
    }

    const senderRole = isLandlord ? 'landlord' : 'tenant';
    const landlordResponse = appendInquiryMessage({
      inquiryRow,
      senderRole,
      senderId: req.user._id,
      senderName: req.user.name,
      message
    });

    const nextStatus = senderRole === 'landlord' ? 'responded' : 'pending';

    const { data: updatedRow, error: updateError } = await supabase
      .from('inquiries')
      .update({
        landlord_response: landlordResponse,
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const [inquiry] = await hydrateInquiries([updatedRow]);

    try {
      const targetUserId = senderRole === 'landlord' ? inquiryRow.tenant_id : inquiryRow.landlord_id;
      await logActivity({
        actorUserId: req.user._id,
        targetUserId,
        actionType: 'message',
        entityType: 'inquiry',
        details: {
          message: `${req.user.name || 'User'} sent a ${senderRole} message in inquiry ${inquiry._id}`,
          inquiryId: inquiry._id,
          propertyId: inquiry.propertyId?._id || inquiry.propertyId || null,
          actorRole: req.user.role || senderRole
        }
      });
    } catch (activityError) {
      console.warn('Inquiry message activity log skipped:', activityError.message || activityError);
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: { inquiry }
    });
  } catch (error) {
    console.error('Send inquiry message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const markInquiryAsRead = async (req, res) => {
  try {
    const { data: inquiryRow, error: findError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw findError;

    if (!inquiryRow) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    const isTenant = req.user.role === 'tenant' && inquiryRow.tenant_id === req.user._id;
    const isLandlord = req.user.role === 'landlord' && inquiryRow.landlord_id === req.user._id;

    if (!isTenant && !isLandlord) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this conversation'
      });
    }

    const now = new Date().toISOString();
    const currentLandlordResponse = toObject(inquiryRow.landlord_response);
    const landlordResponse = {
      ...currentLandlordResponse,
      tenantLastReadAt: isTenant ? now : (currentLandlordResponse.tenantLastReadAt || null),
      landlordLastReadAt: isLandlord ? now : (currentLandlordResponse.landlordLastReadAt || null),
      messages: Array.isArray(currentLandlordResponse.messages)
        ? currentLandlordResponse.messages
        : getConversationMessages(inquiryRow)
    };

    const { data: updatedRow, error: updateError } = await supabase
      .from('inquiries')
      .update({
        landlord_response: landlordResponse,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const [inquiry] = await hydrateInquiries([updatedRow]);

    res.json({
      success: true,
      message: 'Inquiry marked as read',
      data: { inquiry }
    });
  } catch (error) {
    console.error('Mark inquiry as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const closeInquiry = async (req, res) => {
  try {
    const { data: inquiryRow, error: findError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw findError;

    if (!inquiryRow) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    if (inquiryRow.tenant_id !== req.user._id && inquiryRow.landlord_id !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this inquiry'
      });
    }

    const { error: updateError } = await supabase
      .from('inquiries')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Inquiry closed successfully'
    });
  } catch (error) {
    console.error('Close inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getTenantStats = async (req, res) => {
  try {
    const tenantId = req.user._id;

    const { data: inquiryRows, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const inquiries = inquiryRows || [];
    const totalInquiries = inquiries.length;
    const pendingInquiries = inquiries.filter((item) => item.status === 'pending').length;
    const respondedInquiries = inquiries.filter((item) => item.status === 'responded').length;
    const closedInquiries = inquiries.filter((item) => item.status === 'closed').length;

    const recentRows = inquiries.slice(0, 5);
    const propertyMap = await getPropertiesMapByIds(recentRows.map((item) => item.property_id));
    const landlordMap = await getUsersMapByIds(recentRows.map((item) => item.landlord_id));

    const recentInquiries = recentRows.map((row) => {
      const property = propertyMap[row.property_id];
      const landlord = landlordMap[row.landlord_id];
      return mapInquiry(row, {
        property,
        landlord,
        tenant: { id: tenantId, name: req.user.name, email: req.user.email, phone: req.user.phone }
      });
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalInquiries,
          pendingInquiries,
          respondedInquiries,
          closedInquiries
        },
        recentInquiries
      }
    });
  } catch (error) {
    console.error('Get tenant stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  sendInquiry,
  getTenantInquiries,
  getLandlordInquiries,
  getTenantStats,
  respondToInquiry,
  sendInquiryMessage,
  markInquiryAsRead,
  closeInquiry
};
