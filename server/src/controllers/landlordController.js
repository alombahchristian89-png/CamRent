const { validationResult } = require('express-validator');
const { supabase, mapUser, mapProperty } = require('../services/supabaseData');

const isNotFoundError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  return code === 'pgrst116' || message.includes('0 rows');
};

const submitVerification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { documents, phone, profileImage } = req.body;
    const incomingDocs = Array.isArray(documents) ? documents : [];
    const validDocuments = incomingDocs.filter(
      (docUrl) => typeof docUrl === 'string' && /^https?:\/\//i.test(docUrl.trim())
    );

    if (req.user.role !== 'landlord') {
      return res.status(403).json({
        success: false,
        message: 'Only landlords can submit verification documents'
      });
    }

    if (req.user.verificationStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Account is already verified'
      });
    }

    if (!incomingDocs.length || !validDocuments.length) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one valid document before submitting verification.'
      });
    }

    if (validDocuments.length !== incomingDocs.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more document links are invalid. Please re-upload your documents.'
      });
    }

    const { data: userRow, error } = await supabase
      .from('users')
      .update({
        documents: validDocuments,
        phone,
        profile_image: profileImage || req.user.profileImage,
        verification_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user._id)
      .select('*')
      .maybeSingle();

    if (error) throw error;

    if (!userRow) {
      return res.status(404).json({
        success: false,
        message: 'Landlord account not found'
      });
    }

    const user = mapUser(userRow);

    res.json({
      success: true,
      message: 'Verification documents submitted successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Submit verification error:', error);

    if (isNotFoundError(error)) {
      return res.status(404).json({
        success: false,
        message: 'Landlord account not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getVerificationStatus = async (req, res) => {
  try {
    const { data: userRow, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user._id)
      .maybeSingle();

    if (error) throw error;

    if (!userRow) {
      return res.status(404).json({
        success: false,
        message: 'Landlord account not found'
      });
    }

    const user = mapUser(userRow);

    res.json({
      success: true,
      data: {
        verificationStatus: user.verificationStatus,
        documents: user.documents,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Get verification status error:', error);

    if (isNotFoundError(error)) {
      return res.status(404).json({
        success: false,
        message: 'Landlord account not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getLandlordDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const { data: propertyRows, error } = await supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const properties = propertyRows || [];
    const totalListings = properties.length;
    const activeListings = properties.filter((property) => property.is_active !== false).length;
    const totalViews = properties.reduce((sum, property) => sum + Number(property.views || 0), 0);
    const totalInquiries = properties.reduce((sum, property) => sum + Number(property.inquiries || 0), 0);

    const recentProperties = properties.slice(0, 5).map((property) =>
      mapProperty(property, {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        profile_image: req.user.profileImage,
        is_verified: req.user.isVerified
      })
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalListings,
          activeListings,
          totalViews,
          totalInquiries
        },
        recentProperties
      }
    });
  } catch (error) {
    console.error('Get landlord dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  submitVerification,
  getVerificationStatus,
  getLandlordDashboard
};
