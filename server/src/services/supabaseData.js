const { supabase } = require('./supabaseClient');

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

const mapUser = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isVerified: Boolean(row.is_verified),
    verificationStatus: row.verification_status,
    documents: Array.isArray(row.documents) ? row.documents : [],
    profileImage: row.profile_image || '',
    phone: row.phone || '',
    // Do not force a language default here; frontend keeps the last saved preference
    // when schema migrations for language columns are not yet applied.
    language: row.language || row.preferred_language || null,
    preferredLanguage: row.preferred_language || row.language || null,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const mapProperty = (row, landlord = null) => {
  if (!row) return null;
  const contactInfo = toObject(row.contact_info);
  const videosFromContact = Array.isArray(contactInfo.videos) ? contactInfo.videos : [];
  const listingStatus = (row.listing_status || contactInfo.listingStatus) === 'taken' ? 'taken' : 'available';
  const rentalType = ['daily', 'weekly', 'monthly', 'yearly'].includes(row.rental_type || contactInfo.rentalType)
    ? (row.rental_type || contactInfo.rentalType)
    : 'monthly';
  const columnPricing = toObject(row.pricing);
  const pricing = {
    daily: Number(columnPricing?.daily || contactInfo?.pricing?.daily || 0),
    weekly: Number(columnPricing?.weekly || contactInfo?.pricing?.weekly || 0),
    monthly: Number(columnPricing?.monthly || contactInfo?.pricing?.monthly || 0),
    yearly: Number(columnPricing?.yearly || contactInfo?.pricing?.yearly || 0),
    currency: 'XAF'
  };
  if (!pricing[rentalType] || pricing[rentalType] <= 0) {
    pricing[rentalType] = Number(row.price || 0);
  }
  const propertyCategory = ['residential', 'commercial', 'hospitality'].includes(row.property_category || contactInfo.propertyCategory)
    ? (row.property_category || contactInfo.propertyCategory)
    : 'residential';
  const columnHospitalityInfo = toObject(row.hospitality_info);
  const hospitalityInfo = {
    checkInTime: columnHospitalityInfo?.checkInTime || contactInfo?.hospitalityInfo?.checkInTime || '',
    checkOutTime: columnHospitalityInfo?.checkOutTime || contactInfo?.hospitalityInfo?.checkOutTime || '',
    roomsAvailable: Number(columnHospitalityInfo?.roomsAvailable || contactInfo?.hospitalityInfo?.roomsAvailable || 0),
    maxOccupancy: Number(columnHospitalityInfo?.maxOccupancy || contactInfo?.hospitalityInfo?.maxOccupancy || 0)
  };
  const columnResidentialInfo = toObject(row.residential_info);
  const residentialInfo = {
    leaseDurationMonths: Number(columnResidentialInfo?.leaseDurationMonths || contactInfo?.residentialInfo?.leaseDurationMonths || 0),
    securityDeposit: Number(columnResidentialInfo?.securityDeposit || contactInfo?.residentialInfo?.securityDeposit || 0)
  };
  return {
    _id: row.id,
    id: row.id,
    title: row.title,
    description: row.description,
    price: Number(row.price || 0),
    location: toObject(row.location),
    images: Array.isArray(row.images) ? row.images : [],
    videos: Array.isArray(row.videos) ? row.videos : videosFromContact,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    propertyType: row.property_type,
    bedrooms: Number(row.bedrooms || 0),
    bathrooms: Number(row.bathrooms || 0),
    area: Number(row.area || 0),
    landlord: landlord ? mapUser(landlord) : row.landlord_id,
    isApproved: row.is_approved !== false,
    isActive: row.is_active !== false,
    listingStatus,
    rentalType,
    propertyCategory,
    pricing,
    hospitalityInfo,
    residentialInfo,
    views: Number(row.views || 0),
    inquiries: Number(row.inquiries || 0),
    availableFrom: row.available_from,
    contactInfo,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const mapInquiry = (row, relations = {}) => {
  if (!row) return null;
  const tenant = relations.tenant || null;
  const landlord = relations.landlord || null;
  const property = relations.property || null;
  const landlordResponse = toObject(row.landlord_response);
  const normalizedMessages = [];

  if (row.message) {
    normalizedMessages.push({
      senderRole: 'tenant',
      message: row.message,
      createdAt: row.created_at
    });
  }

  if (Array.isArray(landlordResponse.messages)) {
    landlordResponse.messages.forEach((entry) => {
      if (!entry || !entry.message) return;
      normalizedMessages.push({
        senderRole: entry.senderRole || 'landlord',
        senderId: entry.senderId,
        senderName: entry.senderName,
        message: entry.message,
        createdAt: entry.createdAt || row.updated_at || row.created_at
      });
    });
  } else if (landlordResponse.message) {
    normalizedMessages.push({
      senderRole: 'landlord',
      message: landlordResponse.message,
      createdAt: landlordResponse.respondedAt || row.updated_at || row.created_at
    });
  }

  normalizedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const latestLandlordMessage = [...normalizedMessages].reverse().find((entry) => entry.senderRole === 'landlord');

  return {
    _id: row.id,
    id: row.id,
    tenantId: tenant ? mapUser(tenant) : row.tenant_id,
    landlordId: landlord ? mapUser(landlord) : row.landlord_id,
    propertyId: property ? mapProperty(property, relations.propertyLandlord || null) : row.property_id,
    message: row.message,
    status: row.status,
    tenantContact: toObject(row.tenant_contact),
    landlordResponse,
    readState: {
      tenantLastReadAt: landlordResponse.tenantLastReadAt || null,
      landlordLastReadAt: landlordResponse.landlordLastReadAt || null
    },
    messages: normalizedMessages,
    response: latestLandlordMessage?.message || landlordResponse.message,
    respondedAt: latestLandlordMessage?.createdAt || landlordResponse.respondedAt,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const mapFavorite = (row, property = null) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    propertyId: property ? mapProperty(property, property.landlord || null) : row.property_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const sanitizeUserForAuth = (user) => {
  const mapped = mapUser(user);
  if (!mapped) return null;
  return mapped;
};

const getUsersMapByIds = async (ids) => {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return {};

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('id', uniqueIds);

  if (error) throw error;

  return (data || []).reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});
};

const getPropertiesMapByIds = async (ids) => {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return {};

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .in('id', uniqueIds);

  if (error) throw error;

  return (data || []).reduce((acc, property) => {
    acc[property.id] = property;
    return acc;
  }, {});
};

module.exports = {
  supabase,
  mapUser,
  mapProperty,
  mapInquiry,
  mapFavorite,
  sanitizeUserForAuth,
  getUsersMapByIds,
  getPropertiesMapByIds
};
