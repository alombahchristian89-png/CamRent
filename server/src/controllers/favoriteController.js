const {
  supabase,
  mapFavorite,
  mapProperty,
  getUsersMapByIds,
  getPropertiesMapByIds
} = require('../services/supabaseData');

const addFavorite = async (req, res) => {
  try {
    const { propertyId } = req.body;

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .maybeSingle();

    if (propertyError) throw propertyError;

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const { data: existingFavorite, error: existingError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.user._id)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Property already in favorites'
      });
    }

    const { data: favoriteRow, error: insertError } = await supabase
      .from('favorites')
      .insert({
        user_id: req.user._id,
        property_id: propertyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    const favorite = mapFavorite(favoriteRow);

    res.status(201).json({
      success: true,
      message: 'Property added to favorites',
      data: { favorite }
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { data: favoriteRow, error: findError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', req.user._id)
      .eq('property_id', req.params.propertyId)
      .maybeSingle();

    if (findError) throw findError;

    if (!favoriteRow) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    const { error: deleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteRow.id);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: 'Property removed from favorites'
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getFavorites = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: favoriteRows, error, count } = await supabase
      .from('favorites')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const propertyMap = await getPropertiesMapByIds((favoriteRows || []).map((row) => row.property_id));
    const landlordMap = await getUsersMapByIds(Object.values(propertyMap).map((property) => property.landlord_id));

    const favorites = (favoriteRows || []).map((row) => {
      const property = propertyMap[row.property_id];
      const landlord = property ? landlordMap[property.landlord_id] : null;
      const mappedProperty = property ? mapProperty(property, landlord) : null;
      return mapFavorite(row, mappedProperty ? { ...property, landlord } : null);
    });

    res.json({
      success: true,
      data: {
        favorites,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const checkFavorite = async (req, res) => {
  try {
    const { data: favoriteRow, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.user._id)
      .eq('property_id', req.params.propertyId)
      .maybeSingle();

    if (error) throw error;

    res.json({
      success: true,
      data: { isFavorited: !!favoriteRow }
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  addFavorite,
  removeFavorite,
  getFavorites,
  checkFavorite
};
