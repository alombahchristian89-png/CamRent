import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from 'react-query'
import { 
  Building, 
  Upload, 
  X, 
  Coins,
  Square,
  BedDouble,
  Bath,
  Calendar,
  Check,
  Video,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock3
} from 'lucide-react'
import { propertyAPI, uploadAPI } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const AddProperty = ({ editMode = false, propertyData = null, updatePropertyMutation = null }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isVerifiedLandlord } = useAuth()
  const [images, setImages] = useState([])
  const [videos, setVideos] = useState([])
  const [amenities, setAmenities] = useState([])
  const [customAmenity, setCustomAmenity] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm()

  const availableAmenities = [
    'Parking', 'Security', 'Water', 'Electricity', 'Air Conditioning', 
    'Furnished', 'Balcony', 'Garden', 'Swimming Pool', 'Gym', 
    'WiFi', 'Kitchen', 'Bathroom', 'Bedroom', 'Living Room'
  ]

  const cities = ['Douala', 'Yaoundé', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Edea', 'Kribi', 'Limbe', 'Other']
  const propertyTypes = [
    { value: 'apartment', label: 'Apartment', category: 'residential' },
    { value: 'house', label: 'House', category: 'residential' },
    { value: 'studio', label: 'Studio', category: 'residential' },
    { value: 'villa', label: 'Villa', category: 'residential' },
    { value: 'office', label: 'Office', category: 'commercial' },
    { value: 'shop', label: 'Shop', category: 'commercial' },
    { value: 'warehouse', label: 'Warehouse', category: 'commercial' },
    { value: 'hotel', label: 'Hotel', category: 'hospitality' },
    { value: 'guest-house', label: 'Guest House', category: 'hospitality' },
    { value: 'lodge', label: 'Lodge', category: 'hospitality' },
    { value: 'resort', label: 'Resort', category: 'hospitality' },
    { value: 'serviced-apartment', label: 'Serviced Apartment', category: 'hospitality' },
    { value: 'commercial', label: 'Commercial (General)', category: 'commercial' }
  ]
  const rentalTypes = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ]

  const selectedPropertyType = watch('propertyType')
  const selectedRentalType = watch('rentalType') || 'monthly'
  const selectedPropertyMeta = propertyTypes.find((type) => type.value === selectedPropertyType)
  const selectedCategory = selectedPropertyMeta?.category || 'residential'
  const isHospitality = selectedCategory === 'hospitality'
  const isResidential = selectedCategory === 'residential'

  const formatVideoDuration = (durationInSeconds) => {
    const totalSeconds = Math.max(0, Math.floor(Number(durationInSeconds) || 0))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  const getDurationBadgeClass = (durationInSeconds) => {
    const duration = Number(durationInSeconds) || 0
    if (duration >= 20) return 'bg-amber-500/90 text-white'
    return 'bg-emerald-500/90 text-white'
  }

  const createPropertyMutation = useMutation(
    (propertyData) => propertyAPI.createProperty(propertyData),
    {
      onSuccess: (response) => {
        const property = response.data.data.property;
        const imageCount = property.images.length;
        
        // Show detailed success message
        if (imageCount > 0) {
          toast.success(`Property "${property.title}" created successfully with ${imageCount} image${imageCount > 1 ? 's' : ''}! 🎉`, {
            duration: 5000,
            icon: '🏠',
          });
        } else {
          toast.success(`Property "${property.title}" created successfully! 🏠`, {
            duration: 4000,
            icon: '🏠',
          });
        }
        
        // Log success details
        console.log('✅ Property created successfully:', {
          id: property._id,
          title: property.title,
          images: imageCount,
          uploadedToCloudinary: imageCount > 0
        });
        
        queryClient.invalidateQueries('properties')
        navigate('/landlord/properties')
      },
      onError: (error) => {
        console.error('❌ Property creation failed:', error);
        toast.error(error.response?.data?.message || 'Failed to create property', {
          duration: 4000,
          icon: '❌',
        });
      }
    }
  )

  useEffect(() => {
    if (!editMode || !propertyData) return

    setValue('title', propertyData.title || '')
    setValue('description', propertyData.description || '')
    setValue('propertyType', propertyData.propertyType || '')
    setValue('propertyCategory', propertyData.propertyCategory || 'residential')
    setValue('rentalType', propertyData.rentalType || 'monthly')
    setValue('price', propertyData.price || '')
    setValue('pricing.daily', propertyData.pricing?.daily || '')
    setValue('pricing.weekly', propertyData.pricing?.weekly || '')
    setValue('pricing.monthly', propertyData.pricing?.monthly || '')
    setValue('pricing.yearly', propertyData.pricing?.yearly || '')
    setValue('hospitalityInfo.checkInTime', propertyData.hospitalityInfo?.checkInTime || '')
    setValue('hospitalityInfo.checkOutTime', propertyData.hospitalityInfo?.checkOutTime || '')
    setValue('hospitalityInfo.roomsAvailable', propertyData.hospitalityInfo?.roomsAvailable ?? '')
    setValue('hospitalityInfo.maxOccupancy', propertyData.hospitalityInfo?.maxOccupancy ?? '')
    setValue('hospitalityInfo.roomTypes', (propertyData.hospitalityInfo?.roomTypes || []).join(', '))
    setValue('hospitalityInfo.bookingAvailability.instantBooking', propertyData.hospitalityInfo?.bookingAvailability?.instantBooking ? 'true' : 'false')
    setValue('hospitalityInfo.bookingAvailability.minimumStayNights', propertyData.hospitalityInfo?.bookingAvailability?.minimumStayNights ?? '')
    setValue('hospitalityInfo.bookingAvailability.maximumStayNights', propertyData.hospitalityInfo?.bookingAvailability?.maximumStayNights ?? '')
    setValue('residentialInfo.leaseDurationMonths', propertyData.residentialInfo?.leaseDurationMonths ?? '')
    setValue('residentialInfo.securityDeposit', propertyData.residentialInfo?.securityDeposit ?? '')
    setValue('location.city', propertyData.location?.city || '')
    setValue('location.address', propertyData.location?.address || '')
    setValue('bedrooms', propertyData.bedrooms ?? '')
    setValue('bathrooms', propertyData.bathrooms ?? '')
    setValue('area', propertyData.area ?? '')

    if (propertyData.availableFrom) {
      const availableDate = new Date(propertyData.availableFrom)
      if (!Number.isNaN(availableDate.getTime())) {
        setValue('availableFrom', availableDate.toISOString().slice(0, 10))
      }
    }

    const existingImages = Array.isArray(propertyData.images)
      ? propertyData.images.map((url, index) => ({
          name: `Image ${index + 1}`,
          url,
          type: 'image/*'
        }))
      : []

    const existingVideos = Array.isArray(propertyData.videos)
      ? propertyData.videos.map((url, index) => ({
          name: `Video ${index + 1}`,
          url,
          type: 'video/*',
          durationSeconds: null
        }))
      : []

    const featuredVideoUrl = propertyData.contactInfo?.featuredVideo
    if (featuredVideoUrl) {
      const featuredIndex = existingVideos.findIndex((video) => video.url === featuredVideoUrl)
      if (featuredIndex > 0) {
        const [featuredVideo] = existingVideos.splice(featuredIndex, 1)
        existingVideos.unshift(featuredVideo)
      }
    }

    setImages(existingImages)
    setVideos(existingVideos)
    setAmenities(Array.isArray(propertyData.amenities) ? propertyData.amenities : [])
  }, [editMode, propertyData, setValue])

  useEffect(() => {
    if (!selectedRentalType) {
      setValue('rentalType', 'monthly')
    }
  }, [selectedRentalType, setValue])

  // Auto-calc weekly and daily prices from monthly price when user provides monthly
  const watchedPricingArray = watch(['pricing.monthly', 'pricing.weekly', 'pricing.daily']) || []
  const watchedMonthly = watchedPricingArray[0]
  const watchedWeekly = watchedPricingArray[1]
  const watchedDaily = watchedPricingArray[2]

  useEffect(() => {
    try {
      const monthly = Number(watchedMonthly || 0)
      if (!Number.isFinite(monthly) || monthly <= 0) return

      const weeklyCalc = Math.round(monthly / 4)
      const dailyCalc = Math.round(monthly / 30)

      const currentWeekly = Number(watchedWeekly || 0)
      const currentDaily = Number(watchedDaily || 0)

      // Only auto-fill if the fields are empty or zero to avoid overwriting user edits
      if (!currentWeekly) {
        setValue('pricing.weekly', String(weeklyCalc))
      }
      if (!currentDaily) {
        setValue('pricing.daily', String(dailyCalc))
      }
    } catch (err) {
      // swallow errors to avoid breaking the whole form UI
      console.warn('Auto-pricing calc failed', err)
    }
  }, [watchedMonthly, watchedWeekly, watchedDaily, setValue])

  useEffect(() => {
    setValue('propertyCategory', selectedCategory)
  }, [selectedCategory, setValue])

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    // Validate file sizes before upload (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      toast.error(`Some files are too large. Maximum size is 5MB per file.`, {
        duration: 5000,
        icon: '⚠️',
      })
      e.target.value = '' // Clear input
      return
    }
    
    setUploading(true)

    try {
      // Upload files one by one to avoid timeout issues
      const uploadedImages = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name}`);
        
        const formData = new FormData()
        formData.append('images', file)
        
        const response = await uploadAPI.uploadPropertyImages(formData)
        const imageUrl = response.data.data.images[0]
        
        if (imageUrl && imageUrl.includes('cloudinary') && !imageUrl.startsWith('blob:')) {
          uploadedImages.push({
            name: file.name,
            url: imageUrl,
            type: file.type
          })
          console.log(`✅ File ${i + 1} uploaded successfully`);
        } else {
          throw new Error(`File ${i + 1} failed to upload properly`)
        }
      }
      
      // Only add to state if all uploads succeeded
      setImages(prev => [...prev, ...uploadedImages])
      setValue('images', [...images, ...uploadedImages])
      
      console.log('✅ All images uploaded to Cloudinary successfully:', uploadedImages.length);
      toast.success(`${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''} uploaded to Cloudinary! ☁️`, {
        duration: 3000,
        icon: '📸',
      })
      
    } catch (error) {
      console.error('❌ Upload error:', error)
      
      // Clear the file input to prevent re-uploading the same failed files
      e.target.value = ''
      
      // Show more specific error message
      let errorMessage = 'Failed to upload images'
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timed out. Please try again with smaller images or check your connection.'
      } else if (error.response?.status === 413) {
        errorMessage = 'File too large. Please use images smaller than 5MB.'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, {
        duration: 5000,
        icon: '❌',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const maxSize = 25 * 1024 * 1024
    const maxCount = 5

    if (videos.length + files.length > maxCount) {
      toast.error(`You can upload up to ${maxCount} videos per property.`)
      e.target.value = ''
      return
    }
    const oversizedFiles = files.filter((file) => file.size > maxSize)

    if (oversizedFiles.length > 0) {
      toast.error('Some videos are too large. Maximum size is 25MB per video.')
      e.target.value = ''
      return
    }

    // Longer videos will be trimmed automatically to 2 minutes on upload.

    setUploadingVideos(true)

    try {
      const uploadedVideos = []

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]
        const formData = new FormData()
        formData.append('videos', file)

        const response = await uploadAPI.uploadPropertyVideos(formData)
        const videoUrl = response.data.data.videos?.[0]

        if (!videoUrl || !videoUrl.includes('cloudinary')) {
          throw new Error(`Video ${i + 1} failed to upload properly`)
        }

        uploadedVideos.push({
          name: file.name,
          url: videoUrl,
          type: file.type,
          durationSeconds: null
        })
      }

      setVideos((prev) => [...prev, ...uploadedVideos])
      toast.success(`${uploadedVideos.length} video${uploadedVideos.length > 1 ? 's' : ''} uploaded successfully`)
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload videos'
      toast.error(errorMessage)
      e.target.value = ''
    } finally {
      setUploadingVideos(false)
    }
  }

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    setValue('images', newImages)
  }

  const removeVideo = (index) => {
    setVideos((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  const moveVideo = (index, direction) => {
    setVideos((prev) => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev

      const updated = [...prev]
      const [moved] = updated.splice(index, 1)
      updated.splice(targetIndex, 0, moved)
      return updated
    })
  }

  const setFeaturedVideo = (index) => {
    setVideos((prev) => {
      if (index <= 0 || index >= prev.length) return prev
      const updated = [...prev]
      const [selected] = updated.splice(index, 1)
      updated.unshift(selected)
      return updated
    })
  }

  const setVideoDurationMetadata = (index, durationSeconds) => {
    const normalizedDuration = Number(durationSeconds || 0)
    if (!Number.isFinite(normalizedDuration) || normalizedDuration <= 0) return

    setVideos((prev) => {
      if (!prev[index]) return prev
      const existingDuration = Number(prev[index].durationSeconds || 0)
      if (Math.abs(existingDuration - normalizedDuration) < 0.25) return prev

      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        durationSeconds: normalizedDuration
      }
      return updated
    })
  }

  const addAmenity = (amenity) => {
    if (!amenities.includes(amenity)) {
      setAmenities(prev => [...prev, amenity])
      setValue('amenities', [...amenities, amenity])
    }
  }

  const removeAmenity = (amenity) => {
    const newAmenities = amenities.filter(a => a !== amenity)
    setAmenities(newAmenities)
    setValue('amenities', newAmenities)
  }

  const addCustomAmenity = () => {
    if (customAmenity.trim() && !amenities.includes(customAmenity.trim())) {
      addAmenity(customAmenity.trim())
      setCustomAmenity('')
    }
  }

  const onSubmit = (data) => {
    const toSafeNumber = (value) => {
      const numericValue = Number(value)
      return Number.isFinite(numericValue) ? numericValue : 0
    }

    const selectedPrice = parseFloat(data.pricing?.[data.rentalType] || data.price || 0)
    const baseContactInfo = editMode && propertyData?.contactInfo ? propertyData.contactInfo : {}
    const roomTypes = String(data.hospitalityInfo?.roomTypes || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    if (['daily', 'weekly'].includes(data.rentalType) && selectedCategory !== 'hospitality') {
      toast.error('Short-Term Accommodation listings must use Hotel, Guest House, Lodge, Resort, or Serviced Apartment types.')
      return
    }

    if (['daily', 'weekly'].includes(data.rentalType) && roomTypes.length === 0) {
      toast.error('Please add at least one room type for short-term accommodation listings.')
      return
    }

    const payload = {
      ...data,
      images: images.map(img => img.url),
      videos: videos.map((video) => video.url),
      amenities,
      price: Number.isFinite(selectedPrice) ? selectedPrice : 0,
      rentalType: data.rentalType || 'monthly',
      propertyCategory: data.propertyCategory || selectedCategory,
      pricing: {
        daily: toSafeNumber(data.pricing?.daily),
        weekly: toSafeNumber(data.pricing?.weekly),
        monthly: toSafeNumber(data.pricing?.monthly),
        yearly: toSafeNumber(data.pricing?.yearly),
        currency: 'XAF'
      },
      hospitalityInfo: {
        checkInTime: data.hospitalityInfo?.checkInTime || '',
        checkOutTime: data.hospitalityInfo?.checkOutTime || '',
        roomsAvailable: parseInt(data.hospitalityInfo?.roomsAvailable || 0, 10),
        maxOccupancy: parseInt(data.hospitalityInfo?.maxOccupancy || 0, 10),
        roomTypes,
        bookingAvailability: {
          instantBooking: data.hospitalityInfo?.bookingAvailability?.instantBooking === 'true',
          minimumStayNights: parseInt(data.hospitalityInfo?.bookingAvailability?.minimumStayNights || 1, 10),
          maximumStayNights: parseInt(data.hospitalityInfo?.bookingAvailability?.maximumStayNights || 30, 10)
        }
      },
      residentialInfo: {
        leaseDurationMonths: parseInt(data.residentialInfo?.leaseDurationMonths || 0, 10),
        securityDeposit: toSafeNumber(data.residentialInfo?.securityDeposit)
      },
      bedrooms: parseInt(data.bedrooms),
      bathrooms: parseInt(data.bathrooms),
      area: parseFloat(data.area),
      contactInfo: {
        ...baseContactInfo,
        featuredVideo: videos[0]?.url || null
      }
    }
    payload.accommodationInfo = payload.hospitalityInfo
    if (editMode && updatePropertyMutation) {
      updatePropertyMutation.mutate(payload)
      return
    }

    createPropertyMutation.mutate(payload)
  }

  if (!isVerifiedLandlord) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Required</h2>
          <p className="text-gray-600 mb-6">
            You need to complete verification before you can add properties.
          </p>
          <a href="/landlord/verification" className="btn-primary">
            Complete Verification
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{editMode ? 'Edit Property' : 'Add New Property'}</h1>
          <p className="text-gray-600">
            {editMode ? 'Update your property details, images, and videos' : 'List your rental property or short-term accommodation to connect with guests and tenants'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
            <input type="hidden" {...register('propertyCategory')} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Title *
                </label>
                <input
                  {...register('title', { required: 'Title is required' })}
                  type="text"
                  className="input-field"
                  placeholder="e.g., Modern 2-Bedroom Apartment in Douala"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type *
                </label>
                <select
                  {...register('propertyType', { required: 'Property type is required' })}
                  className="input-field"
                >
                  <option value="">Select property type</option>
                  {propertyTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.propertyType && (
                  <p className="mt-1 text-sm text-red-600">{errors.propertyType.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rental Type *
                </label>
                <select
                  {...register('rentalType', { required: 'Rental type is required' })}
                  className="input-field"
                >
                  {rentalTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                {errors.rentalType && (
                  <p className="mt-1 text-sm text-red-600">{errors.rentalType.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {`${selectedRentalType.charAt(0).toUpperCase() + selectedRentalType.slice(1)} Price (XAF) *`}
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register(`pricing.${selectedRentalType}`, { required: 'Price is required' })}
                    type="number"
                    min="0"
                    className="input-field pl-10"
                    placeholder="50000"
                  />
                </div>
                {errors.pricing?.[selectedRentalType] && (
                  <p className="mt-1 text-sm text-red-600">{errors.pricing[selectedRentalType].message}</p>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              {rentalTypes.map((type) => (
                <div key={type.value}>
                  <label className="block text-xs font-medium uppercase text-gray-600 mb-2">
                    {type.label} Price (XAF)
                  </label>
                  <input
                    {...register(`pricing.${type.value}`)}
                    type="number"
                    min="0"
                    className="input-field"
                    placeholder="Optional"
                  />
                </div>
              ))}
            </div>

            <p className="mt-3 text-sm text-gray-600">
              Category: <span className="font-medium capitalize">{selectedCategory}</span>
            </p>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description', { required: 'Description is required' })}
                rows={4}
                className="input-field"
                placeholder="Describe your property, its features, and what makes it special..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>
          </div>

          {(isHospitality || isResidential) && (
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {isHospitality ? 'Short-Term Accommodation Details (Hotels & Guest Houses)' : 'Residential Lease Details'}
              </h2>

              {isHospitality && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Time</label>
                    <input
                      {...register('hospitalityInfo.checkInTime')}
                      type="time"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Time</label>
                    <input
                      {...register('hospitalityInfo.checkOutTime')}
                      type="time"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rooms Available</label>
                    <input
                      {...register('hospitalityInfo.roomsAvailable')}
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Occupancy</label>
                    <input
                      {...register('hospitalityInfo.maxOccupancy')}
                      type="number"
                      min="1"
                      className="input-field"
                      placeholder="2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Types</label>
                    <input
                      {...register('hospitalityInfo.roomTypes')}
                      type="text"
                      className="input-field"
                      placeholder="Single, Double, Family Suite"
                    />
                    <p className="mt-1 text-xs text-gray-500">Use comma-separated room types.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Booking Mode</label>
                    <select
                      {...register('hospitalityInfo.bookingAvailability.instantBooking')}
                      className="input-field"
                    >
                      <option value="false">Request & Confirm</option>
                      <option value="true">Instant Booking</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Stay (nights)</label>
                    <input
                      {...register('hospitalityInfo.bookingAvailability.minimumStayNights')}
                      type="number"
                      min="1"
                      className="input-field"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Stay (nights)</label>
                    <input
                      {...register('hospitalityInfo.bookingAvailability.maximumStayNights')}
                      type="number"
                      min="1"
                      className="input-field"
                      placeholder="30"
                    />
                  </div>
                </div>
              )}

              {isResidential && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lease Duration (months)</label>
                    <input
                      {...register('residentialInfo.leaseDurationMonths')}
                      type="number"
                      min="1"
                      className="input-field"
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Security Deposit (XAF)</label>
                    <input
                      {...register('residentialInfo.securityDeposit')}
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder="120000"
                    />
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Location */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Location</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <select
                  {...register('location.city', { required: 'City is required' })}
                  className="input-field"
                >
                  <option value="">Select city</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.location?.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.location.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <input
                  {...register('location.address', { required: 'Address is required' })}
                  type="text"
                  className="input-field"
                  placeholder="e.g., Bonapriso, Rue 1234"
                />
                {errors.location?.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.location.address.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Details</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bedrooms *
                </label>
                <div className="relative">
                  <BedDouble className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('bedrooms', { required: 'Bedrooms is required' })}
                    type="number"
                    min="0"
                    max="20"
                    className="input-field pl-10"
                    placeholder="2"
                  />
                </div>
                {errors.bedrooms && (
                  <p className="mt-1 text-sm text-red-600">{errors.bedrooms.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bathrooms *
                </label>
                <div className="relative">
                  <Bath className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('bathrooms', { required: 'Bathrooms is required' })}
                    type="number"
                    min="0"
                    max="20"
                    className="input-field pl-10"
                    placeholder="1"
                  />
                </div>
                {errors.bathrooms && (
                  <p className="mt-1 text-sm text-red-600">{errors.bathrooms.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area (m²) *
                </label>
                <div className="relative">
                  <Square className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('area', { required: 'Area is required' })}
                    type="number"
                    min="1"
                    className="input-field pl-10"
                    placeholder="120"
                  />
                </div>
                {errors.area && (
                  <p className="mt-1 text-sm text-red-600">{errors.area.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available From *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('availableFrom', { required: 'Available date is required' })}
                    type="date"
                    className="input-field pl-10"
                  />
                </div>
                {errors.availableFrom && (
                  <p className="mt-1 text-sm text-red-600">{errors.availableFrom.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Amenities</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Amenities
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableAmenities.map(amenity => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => addAmenity(amenity)}
                    disabled={amenities.includes(amenity)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      amenities.includes(amenity)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {amenities.includes(amenity) && <Check className="h-3 w-3 inline mr-1" />}
                    {amenity}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Amenity
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={customAmenity}
                  onChange={(e) => setCustomAmenity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAmenity())}
                  className="input-field"
                  placeholder="Add custom amenity"
                />
                <button
                  type="button"
                  onClick={addCustomAmenity}
                  className="btn-primary"
                >
                  Add
                </button>
              </div>
            </div>

            {amenities.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Amenities:</p>
                <div className="flex flex-wrap gap-2">
                  {amenities.map(amenity => (
                    <span
                      key={amenity}
                      className="badge-primary flex items-center"
                    >
                      {amenity}
                      <button
                        type="button"
                        onClick={() => removeAmenity(amenity)}
                        className="ml-2 text-primary hover:text-primary-hover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Images</h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary transition-colors mb-6">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
              <p className="text-sm text-gray-500">JPG, PNG up to 5MB each</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="btn-primary mt-4 cursor-pointer inline-block"
              >
                {uploading ? <LoadingSpinner size="sm" /> : 'Select Images'}
              </label>
            </div>

            {images.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Uploaded Images ({images.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url}
                        alt={`Property ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Property Videos (Optional)</h2>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary transition-colors mb-6">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Upload walkthrough or exterior videos</p>
              <p className="text-sm text-gray-500">MP4, MOV, WEBM up to 25MB each, maximum 5 videos</p>
              <input
                type="file"
                multiple
                accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                onChange={handleVideoUpload}
                className="hidden"
                id="video-upload"
              />
              <label
                htmlFor="video-upload"
                className="btn-primary mt-4 cursor-pointer inline-block"
              >
                {uploadingVideos ? <LoadingSpinner size="sm" /> : 'Select Videos'}
              </label>
            </div>

            {videos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Uploaded Videos ({videos.length})</p>
                <p className="text-xs text-gray-500 mb-3">The first video is featured and shown first to tenants.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((video, index) => (
                    <div key={video.url || index} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-black">
                      <video
                        src={video.url}
                        controls
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-48 object-cover"
                        onLoadedMetadata={(event) => setVideoDurationMetadata(index, event.currentTarget.duration)}
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        {index === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-medium text-white">
                            <Star className="h-3 w-3" />
                            Featured
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setFeaturedVideo(index)}
                            className="inline-flex items-center rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-black/85"
                          >
                            Set Featured
                          </button>
                        )}
                        {video.durationSeconds ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${getDurationBadgeClass(video.durationSeconds)}`}>
                            <Clock3 className="h-3 w-3" />
                            {formatVideoDuration(video.durationSeconds)}
                          </span>
                        ) : null}
                      </div>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => moveVideo(index, 'left')}
                          disabled={index === 0}
                          className="rounded-full bg-black/75 p-1 text-white disabled:opacity-40"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveVideo(index, 'right')}
                          disabled={index === videos.length - 1}
                          className="rounded-full bg-black/75 p-1 text-white disabled:opacity-40"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/landlord/properties')}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(editMode ? updatePropertyMutation?.isLoading : createPropertyMutation.isLoading) || images.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(editMode ? updatePropertyMutation?.isLoading : createPropertyMutation.isLoading)
                ? <LoadingSpinner size="sm" />
                : editMode
                  ? 'Update Property'
                  : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddProperty
