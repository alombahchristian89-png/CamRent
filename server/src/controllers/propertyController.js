const { validationResult } = require('express-validator');
const {
  sendNewPropertyBroadcastEmail,
  sendPropertyTakenFavoriteNotificationEmail
} = require('../services/emailService');
const {
  supabase,
  mapProperty,
  getUsersMapByIds
} = require('../services/supabaseData');
const { logActivity } = require('../services/activityLogger');

const notifyTenantsAboutNewProperty = async ({ property, landlordName }) => {
  try {
    const { data: tenantRows, error } = await supabase
      .from('users')
      .select('id, name, email, is_active')
      .eq('role', 'tenant')
      .eq('is_active', true)
      .not('email', 'is', null);

    if (error) throw error;

    const summary = await sendNewPropertyBroadcastEmail({
      tenants: tenantRows || [],
      property,
      landlordName
    });

    console.log(
      `New property broadcast complete. propertyId=${property?._id || property?.id} total=${summary.total} sent=${summary.sent} failed=${summary.failed}`
    );
  } catch (error) {
    console.error('New property broadcast failed:', error.message || error);
  }
};

const notifyFavoritedUsersPropertyTaken = async ({ property, landlordName }) => {
  try {
    const propertyId = property?._id || property?.id;
    if (!propertyId) return;

    const { data: favoriteRows, error: favoritesError } = await supabase
      .from('favorites')
      .select('user_id')
      .eq('property_id', propertyId);

    if (favoritesError) throw favoritesError;

    const userIds = (favoriteRows || []).map((row) => row.user_id).filter(Boolean);
    if (!userIds.length) return;

    const usersMap = await getUsersMapByIds(userIds);
    const recipients = userIds
      .map((id) => usersMap[id])
      .filter((user) => user && user.email && user.is_active !== false);

    const propertyTitle = property?.title || 'Property';
    const city = property?.location?.city || 'your area';
    const notificationRows = recipients.map((recipient) => ({
      user_id: recipient.id,
      title: 'Favorite Listing Update',
      message: `${propertyTitle} in ${city} is now marked as taken.`,
      type: 'admin_info',
      metadata: {
        event: 'property_taken',
        propertyId,
        propertyTitle,
        landlordName: landlordName || 'The landlord'
      },
      created_at: new Date().toISOString()
    }));

    if (notificationRows.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationRows);

      if (notificationError && !isMissingTableError(notificationError, 'notifications')) {
        throw notificationError;
      }
    }

    const summary = await sendPropertyTakenFavoriteNotificationEmail({
      recipients,
      property,
      landlordName
    });

    console.log(
      `Property taken notifications complete. propertyId=${propertyId} total=${summary.total} sent=${summary.sent} failed=${summary.failed}`
    );
  } catch (error) {
    console.error('Property taken notifications failed:', error.message || error);
  }
};

const addAdminNotification = async ({ title, message, metadata = {} }) => {
  try {
    const row = {
      title,
      message,
      type: 'admin_alert',
      metadata,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('notifications')
      .insert([row]);

    if (error && !isMissingTableError(error, 'notifications')) {
      throw error;
    }
    // Broadcast over realtime hub if available
    try {
      const hub = require('../services/notificationHub');
      if (hub && typeof hub.broadcastNotification === 'function') {
        hub.broadcastNotification(row);
      }
    } catch (err) {
      // ignore if hub not available
    }
  } catch (err) {
    console.error('Failed to add admin notification:', err?.message || err);
  }
};

const resolveImageUrl = (image) => {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (typeof image === 'object' && image.url) return image.url;
  return null;
};

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

const normalizeVideos = (videos) => {
  if (!Array.isArray(videos)) return [];
  return videos
    .map((video) => (typeof video === 'string' ? video.trim() : ''))
    .filter(Boolean);
};

const normalizeListingStatus = (value) => (value === 'taken' ? 'taken' : 'available');

const RENTAL_TYPES = ['daily', 'weekly', 'monthly', 'yearly'];
const PROPERTY_CATEGORY_BY_TYPE = {
  studio: 'residential',
  apartment: 'residential',
  house: 'residential',
  villa: 'residential',
  office: 'commercial',
  shop: 'commercial',
  warehouse: 'commercial',
  commercial: 'commercial',
  hotel: 'hospitality',
  'guest-house': 'hospitality',
  lodge: 'hospitality',
  resort: 'hospitality',
  'serviced-apartment': 'hospitality',
  'airbnb-unit': 'hospitality',
  'holiday-home': 'hospitality'
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeRentalType = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (RENTAL_TYPES.includes(normalized)) return normalized;
  return 'monthly';
};

const resolvePropertyCategory = ({ propertyType, propertyCategory }) => {
  if (propertyCategory && ['residential', 'commercial', 'hospitality'].includes(propertyCategory)) {
    return propertyCategory;
  }
  return PROPERTY_CATEGORY_BY_TYPE[propertyType] || 'residential';
};

const normalizePricing = (inputPricing, fallbackPrice, rentalType) => {
  const pricingInput = toObject(inputPricing);
  const normalized = {
    daily: toNumberOrNull(pricingInput.daily),
    weekly: toNumberOrNull(pricingInput.weekly),
    monthly: toNumberOrNull(pricingInput.monthly),
    yearly: toNumberOrNull(pricingInput.yearly),
    currency: 'XAF'
  };

  const fallback = toNumberOrNull(fallbackPrice);
  if (fallback !== null) {
    normalized[rentalType] = normalized[rentalType] ?? fallback;
  }

  const selectedPrice = normalized[rentalType] ?? fallback ?? 0;
  return {
    pricing: normalized,
    selectedPrice
  };
};

const normalizePricingForStorage = (pricing) => ({
  daily: Number(pricing?.daily || 0),
  weekly: Number(pricing?.weekly || 0),
  monthly: Number(pricing?.monthly || 0),
  yearly: Number(pricing?.yearly || 0),
  currency: 'XAF'
});

const normalizeHospitalityInfo = (value = {}) => {
  const source = toObject(value);
  return {
    checkInTime: source.checkInTime || '',
    checkOutTime: source.checkOutTime || '',
    roomsAvailable: Math.max(0, toNumberOrNull(source.roomsAvailable) || 0),
    maxOccupancy: Math.max(1, toNumberOrNull(source.maxOccupancy) || 1)
  };
};

const normalizeResidentialInfo = (value = {}) => {
  const source = toObject(value);
  return {
    leaseDurationMonths: Math.max(1, toNumberOrNull(source.leaseDurationMonths) || 12),
    securityDeposit: Math.max(0, toNumberOrNull(source.securityDeposit) || 0)
  };
};

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

const getMissingPropertyColumnName = (error) => {
  const message = String(error?.message || '');
  const postgresStyle = message.match(/column\s+properties\.([a-z_]+)\s+does not exist/i);
  if (postgresStyle && postgresStyle[1]) return postgresStyle[1].toLowerCase();

  const postgrestStyle = message.match(/'([a-z_]+)'\s+column\s+of\s+'properties'/i);
  if (postgrestStyle && postgrestStyle[1]) return postgrestStyle[1].toLowerCase();

  return null;
};

const applyPropertyQueryFilters = ({ query, req, unsupportedColumns }) => {
  let nextQuery = query;

  if (req.query.propertyCategory && !unsupportedColumns.has('property_category')) {
    nextQuery = nextQuery.eq('property_category', req.query.propertyCategory);
  }

  if (req.query.rentalType && !unsupportedColumns.has('rental_type')) {
    nextQuery = nextQuery.eq('rental_type', req.query.rentalType);
  }

  if (req.query.availability && !unsupportedColumns.has('listing_status')) {
    nextQuery = nextQuery.eq('listing_status', req.query.availability);
  }

  return nextQuery;
};

const getProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const sortBy = String(req.query.sortBy || '').toLowerCase();
    const sortDirection = String(req.query.sortDirection || 'desc').toLowerCase() === 'asc';
    const orderColumn = sortBy === 'price' ? 'price' : 'created_at';

    const unsupportedColumns = new Set();
    let propertyRows = [];
    let count = 0;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      let query = supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      const verifiedOnly = req.query.verifiedOnly !== 'false';
      if (verifiedOnly) {
        query = query.eq('is_approved', true);
      }

      if (req.query.city) {
        query = query.filter('location->>city', 'eq', req.query.city);
      }

      if (req.query.propertyType) {
        query = query.eq('property_type', req.query.propertyType);
      }

      query = applyPropertyQueryFilters({ query, req, unsupportedColumns });

      if (req.query.minPrice) {
        query = query.gte('price', parseFloat(req.query.minPrice));
      }

      if (req.query.maxPrice) {
        query = query.lte('price', parseFloat(req.query.maxPrice));
      }

      if (req.query.bedrooms) {
        query = query.eq('bedrooms', parseInt(req.query.bedrooms, 10));
      }

      if (req.query.amenities) {
        const amenities = String(req.query.amenities)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

        if (amenities.length > 0) {
          query = query.contains('amenities', amenities);
        }
      }

      if (req.query.search) {
        const search = String(req.query.search).replace(/,/g, ' ').trim();
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const result = await query
        .order(orderColumn, { ascending: sortDirection })
        .range(from, to);

      if (!result.error) {
        propertyRows = result.data || [];
        count = result.count || 0;
        break;
      }

      const missingColumn = getMissingPropertyColumnName(result.error);
      if (missingColumn && !unsupportedColumns.has(missingColumn)) {
        unsupportedColumns.add(missingColumn);
        continue;
      }

      throw result.error;
    }

    const landlordMap = await getUsersMapByIds((propertyRows || []).map((row) => row.landlord_id));
    const properties = (propertyRows || []).map((row) => mapProperty(row, landlordMap[row.landlord_id]));

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

const getPropertyById = async (req, res) => {
  try {
    const { data: propertyRow, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;

    if (!propertyRow) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const nextViews = Number(propertyRow.views || 0) + 1;
    await supabase
      .from('properties')
      .update({ views: nextViews, updated_at: new Date().toISOString() })
      .eq('id', propertyRow.id);

    const landlordMap = await getUsersMapByIds([propertyRow.landlord_id]);
    const property = mapProperty({ ...propertyRow, views: nextViews }, landlordMap[propertyRow.landlord_id]);

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const createProperty = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const incomingContactInfo = toObject(req.body.contactInfo);
    const videos = normalizeVideos(req.body.videos !== undefined ? req.body.videos : incomingContactInfo.videos);
    const listingStatus = normalizeListingStatus(req.body.listingStatus || incomingContactInfo.listingStatus);
    const rentalType = normalizeRentalType(req.body.rentalType || incomingContactInfo.rentalType);
    const propertyCategory = resolvePropertyCategory({
      propertyType: req.body.propertyType,
      propertyCategory: req.body.propertyCategory || incomingContactInfo.propertyCategory
    });
    const normalizedPricing = normalizePricing(
      req.body.pricing || incomingContactInfo.pricing,
      req.body.price,
      rentalType
    );

    const hospitalityInfo = normalizeHospitalityInfo(req.body.hospitalityInfo || incomingContactInfo.hospitalityInfo);
    const residentialInfo = normalizeResidentialInfo(req.body.residentialInfo || incomingContactInfo.residentialInfo);

    const payload = {
      title: req.body.title,
      description: req.body.description,
      price: normalizedPricing.selectedPrice,
      location: req.body.location,
      images: req.body.images || [],
      amenities: req.body.amenities || [],
      property_type: req.body.propertyType,
      bedrooms: req.body.bedrooms,
      bathrooms: req.body.bathrooms,
      area: req.body.area,
      landlord_id: req.user._id,
      is_approved: true,
      is_active: true,
      views: 0,
      inquiries: 0,
      available_from: new Date(req.body.availableFrom).toISOString(),
      property_category: propertyCategory,
      rental_type: rentalType,
      pricing: normalizePricingForStorage(normalizedPricing.pricing),
      hospitality_info: hospitalityInfo,
      residential_info: residentialInfo,
      listing_status: listingStatus,
      contact_info: {
        ...incomingContactInfo,
        videos,
        listingStatus,
        rentalType,
        propertyCategory,
        pricing: normalizePricingForStorage(normalizedPricing.pricing),
        hospitalityInfo,
        residentialInfo
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let propertyRow = null;
    let insertPayload = { ...payload };

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const result = await supabase
        .from('properties')
        .insert(insertPayload)
        .select('*')
        .single();

      if (!result.error) {
        propertyRow = result.data;
        break;
      }

      const missingColumn = getMissingPropertyColumnName(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(insertPayload, missingColumn)) {
        delete insertPayload[missingColumn];
        continue;
      }

      throw result.error;
    }

    if (!propertyRow) {
      throw new Error('Property insert failed after schema fallback attempts');
    }

    const landlordMap = await getUsersMapByIds([propertyRow.landlord_id]);
    const property = mapProperty(propertyRow, landlordMap[propertyRow.landlord_id]);

    void notifyTenantsAboutNewProperty({
      property,
      landlordName: landlordMap[propertyRow.landlord_id]?.name || 'A verified landlord'
    });

    // Notify admins about the new property with details
    void addAdminNotification({
      title: 'New property listed',
      message: `${property.title || 'A property'} was listed by ${landlordMap[propertyRow.landlord_id]?.name || 'a landlord'}`,
      metadata: {
        event: 'property_created',
        propertyId: property._id,
        landlordId: propertyRow.landlord_id,
        price: property.price,
        city: property.location?.city || null
      }
    });

    try {
      await logActivity({
        actorUserId: req.user._id,
        actionType: 'create',
        entityType: 'property',
        details: {
          message: `${req.user.name || 'Landlord'} added a new property: ${property.title || 'Untitled property'}`,
          propertyId: property._id,
          propertyTitle: property.title || null,
          actorRole: req.user.role || 'landlord'
        }
      });
    } catch (activityError) {
      console.warn('Property create activity log skipped:', activityError.message || activityError);
    }

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property }
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateProperty = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

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

    if (propertyRow.landlord_id !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    const updates = {
      updated_at: new Date().toISOString()
    };

    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.price !== undefined) updates.price = req.body.price;
    if (req.body.location !== undefined) updates.location = req.body.location;
    if (req.body.images !== undefined) updates.images = req.body.images;
    if (req.body.amenities !== undefined) updates.amenities = req.body.amenities;
    if (req.body.propertyType !== undefined) updates.property_type = req.body.propertyType;
    if (req.body.bedrooms !== undefined) updates.bedrooms = req.body.bedrooms;
    if (req.body.bathrooms !== undefined) updates.bathrooms = req.body.bathrooms;
    if (req.body.area !== undefined) updates.area = req.body.area;
    if (req.body.availableFrom !== undefined) updates.available_from = new Date(req.body.availableFrom).toISOString();

    const nextPropertyType = req.body.propertyType !== undefined ? req.body.propertyType : propertyRow.property_type;
    const existingContactInfo = toObject(propertyRow.contact_info);
    const requestedRentalType = req.body.rentalType || existingContactInfo.rentalType;
    const rentalType = normalizeRentalType(requestedRentalType);

    const normalizedPricing = normalizePricing(
      req.body.pricing || existingContactInfo.pricing,
      req.body.price !== undefined ? req.body.price : propertyRow.price,
      rentalType
    );

    if (req.body.price !== undefined || req.body.pricing !== undefined || req.body.rentalType !== undefined) {
      updates.price = normalizedPricing.selectedPrice;
    }

    if (req.body.rentalType !== undefined) updates.rental_type = rentalType;
    if (req.body.propertyCategory !== undefined || req.body.propertyType !== undefined) {
      updates.property_category = resolvePropertyCategory({
        propertyType: nextPropertyType,
        propertyCategory: req.body.propertyCategory || existingContactInfo.propertyCategory
      });
    }
    if (req.body.pricing !== undefined || req.body.price !== undefined || req.body.rentalType !== undefined) {
      updates.pricing = normalizePricingForStorage(normalizedPricing.pricing);
    }
    if (req.body.hospitalityInfo !== undefined || req.body.propertyType !== undefined) {
      updates.hospitality_info = normalizeHospitalityInfo(req.body.hospitalityInfo || existingContactInfo.hospitalityInfo);
    }
    if (req.body.residentialInfo !== undefined || req.body.propertyType !== undefined) {
      updates.residential_info = normalizeResidentialInfo(req.body.residentialInfo || existingContactInfo.residentialInfo);
    }

    if (req.body.contactInfo !== undefined || req.body.videos !== undefined) {
      const incomingContactInfo = toObject(req.body.contactInfo);
      const mergedContactInfo = {
        ...existingContactInfo,
        ...incomingContactInfo
      };

      if (req.body.videos !== undefined) {
        mergedContactInfo.videos = normalizeVideos(req.body.videos);
      } else if (incomingContactInfo.videos !== undefined) {
        mergedContactInfo.videos = normalizeVideos(incomingContactInfo.videos);
      }

      updates.contact_info = mergedContactInfo;
    }

    if (
      req.body.contactInfo !== undefined
      || req.body.videos !== undefined
      || req.body.listingStatus !== undefined
      || req.body.rentalType !== undefined
      || req.body.propertyCategory !== undefined
      || req.body.pricing !== undefined
      || req.body.hospitalityInfo !== undefined
      || req.body.residentialInfo !== undefined
      || req.body.propertyType !== undefined
      || req.body.price !== undefined
    ) {
      const contactInfoBase = toObject(updates.contact_info || propertyRow.contact_info);
      updates.contact_info = {
        ...contactInfoBase,
        rentalType,
        propertyCategory: resolvePropertyCategory({
          propertyType: nextPropertyType,
          propertyCategory: req.body.propertyCategory || contactInfoBase.propertyCategory
        }),
        pricing: normalizePricingForStorage(normalizedPricing.pricing),
        hospitalityInfo: normalizeHospitalityInfo(req.body.hospitalityInfo || contactInfoBase.hospitalityInfo),
        residentialInfo: normalizeResidentialInfo(req.body.residentialInfo || contactInfoBase.residentialInfo)
      };
    }

    if (req.body.listingStatus !== undefined) {
      updates.listing_status = normalizeListingStatus(req.body.listingStatus);
      const existingContactInfo = toObject(updates.contact_info || propertyRow.contact_info);
      updates.contact_info = {
        ...existingContactInfo,
        listingStatus: normalizeListingStatus(req.body.listingStatus)
      };
    }

    let updatedRow = null;
    let updatePayload = { ...updates };

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const result = await supabase
        .from('properties')
        .update(updatePayload)
        .eq('id', req.params.id)
        .select('*')
        .single();

      if (!result.error) {
        updatedRow = result.data;
        break;
      }

      const missingColumn = getMissingPropertyColumnName(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(updatePayload, missingColumn)) {
        delete updatePayload[missingColumn];
        continue;
      }

      throw result.error;
    }

    if (!updatedRow) {
      throw new Error('Property update failed after schema fallback attempts');
    }

    const landlordMap = await getUsersMapByIds([updatedRow.landlord_id]);
    const property = mapProperty(updatedRow, landlordMap[updatedRow.landlord_id]);

    const previousListingStatus = normalizeListingStatus(propertyRow.listing_status || toObject(propertyRow.contact_info).listingStatus);
    const nextListingStatus = normalizeListingStatus(updatedRow.listing_status || toObject(updatedRow.contact_info).listingStatus);
    if (previousListingStatus !== 'taken' && nextListingStatus === 'taken') {
      void notifyFavoritedUsersPropertyTaken({
        property,
        landlordName: landlordMap[updatedRow.landlord_id]?.name || 'The landlord'
      });
    }

    // Determine which top-level fields were changed (exclude updated_at)
    const changedKeys = Object.keys(updates || {}).filter((k) => k !== 'updated_at');
    const changes = changedKeys.map((key) => ({
      field: key,
      before: propertyRow[key],
      after: updatedRow[key]
    }));

    // Notify admins when a property is updated with a detailed change list
    void addAdminNotification({
      title: 'Property updated',
      message: `${property.title || 'A property'} was updated by ${property.landlord?.name || 'a landlord'}: ${changedKeys.join(', ')}`,
      metadata: { event: 'property_updated', propertyId: property._id, changes }
    });

    try {
      await logActivity({
        actorUserId: req.user._id,
        actionType: 'update',
        entityType: 'property',
        details: {
          message: `${req.user.name || 'Landlord'} updated property ${property.title || 'Untitled property'}`,
          propertyId: property._id,
          propertyTitle: property.title || null,
          changedFields: changedKeys,
          actorRole: req.user.role || 'landlord'
        }
      });
    } catch (activityError) {
      console.warn('Property update activity log skipped:', activityError.message || activityError);
    }

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: { property }
    });
  } catch (error) {
    console.error('Update property error:', error);
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

    if (propertyRow.landlord_id !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }

    if (propertyRow.images && propertyRow.images.length > 0) {
      const { deleteFromCloudinary, getPublicIdFromUrl } = require('../services/cloudinary');

      for (const image of propertyRow.images) {
        const imageUrl = resolveImageUrl(image);
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

    const propertyVideos = normalizeVideos(toObject(propertyRow.contact_info).videos);
    if (propertyVideos.length > 0) {
      const { deleteFromCloudinary, getPublicIdFromUrl } = require('../services/cloudinary');

      for (const videoUrl of propertyVideos) {
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

    try {
      await logActivity({
        actorUserId: req.user._id,
        actionType: 'delete',
        entityType: 'property',
        details: {
          message: `${req.user.name || 'Landlord'} deleted property ${propertyRow.title || 'Untitled property'}`,
          propertyId: propertyRow.id,
          propertyTitle: propertyRow.title || null,
          actorRole: req.user.role || 'landlord'
        }
      });
    } catch (activityError) {
      console.warn('Property delete activity log skipped:', activityError.message || activityError);
    }

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const adminDeleteProperty = async (req, res) => {
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
        const imageUrl = resolveImageUrl(image);
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

    const propertyVideos = normalizeVideos(toObject(propertyRow.contact_info).videos);
    if (propertyVideos.length > 0) {
      const { deleteFromCloudinary, getPublicIdFromUrl } = require('../services/cloudinary');

      for (const videoUrl of propertyVideos) {
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

    try {
      await logActivity({
        actorUserId: req.user?._id || null,
        actionType: 'delete',
        entityType: 'property',
        details: {
          message: `${req.user?.name || 'Admin'} deleted property ${propertyRow.title || 'Untitled property'} from admin panel`,
          propertyId: propertyRow.id,
          propertyTitle: propertyRow.title || null,
          actorRole: req.user?.role || 'admin'
        }
      });
    } catch (activityError) {
      console.warn('Admin property delete activity log skipped:', activityError.message || activityError);
    }

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

const getLandlordProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const normalizedSearch = String(req.query.search || '').trim().toLowerCase();
    const statusFilter = String(req.query.status || 'all').toLowerCase();

    const { data: propertyRows, error } = await supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', req.user._id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const landlordMap = await getUsersMapByIds([req.user._id]);
    const mappedProperties = (propertyRows || []).map((row) => mapProperty(row, landlordMap[row.landlord_id]));

    const filteredProperties = mappedProperties.filter((property) => {
      if (normalizedSearch) {
        const haystack = [property.title, property.description, property.location?.city, property.location?.address]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      if (statusFilter === 'active' && !property.isActive) return false;
      if (statusFilter === 'inactive' && property.isActive) return false;
      if (statusFilter === 'available' && property.listingStatus !== 'available') return false;
      if (statusFilter === 'taken' && property.listingStatus !== 'taken') return false;

      return true;
    });

    const total = filteredProperties.length;
    const from = (page - 1) * limit;
    const to = from + limit;
    const properties = filteredProperties.slice(from, to);

    res.json({
      success: true,
      data: {
        properties,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get landlord properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  adminDeleteProperty,
  getLandlordProperties
};
