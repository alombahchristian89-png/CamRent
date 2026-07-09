import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { 
  Shield, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  User,
  Phone,
  Mail,
  Camera,
  X,
} from 'lucide-react'
import { landlordAPI, uploadAPI } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const Verification = () => {
  const [documents, setDocuments] = useState([])
  const [profileImage, setProfileImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const queryClient = useQueryClient()
  const { user, setUser } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm()

  const phone = watch('phone', user?.phone || '')

  const { data: verificationData, isLoading } = useQuery(
    'verificationStatus',
    landlordAPI.getVerificationStatus,
    {
      select: (response) => response.data.data
    }
  )

  const submitVerificationMutation = useMutation(
    landlordAPI.submitVerification,
    {
      onSuccess: (response) => {
        toast.success('Verification documents submitted successfully!')
        // Update user context with new verification status
        if (response.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user))
          setUser(response.data.user)
        }
        queryClient.invalidateQueries('verificationStatus')
        queryClient.invalidateQueries('auth')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to submit verification')
      }
    }
  )

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    setUploading(true)

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('documents', file))

      const response = await uploadAPI.uploadDocuments(formData)
      const uploadedUrls = response.data?.data?.documents || []

      const uploadedDocs = uploadedUrls.map((url, index) => ({
        name: files[index]?.name || `Document ${documents.length + index + 1}`,
        url,
        type: files[index]?.type || 'application/octet-stream'
      }))

      setDocuments(prev => [...prev, ...uploadedDocs])
      setValue('documents', [...documents, ...uploadedDocs])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload files')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await uploadAPI.uploadProfileImage(formData)
      const imageUrl = response.data?.data?.profileImage

      setProfileImage(imageUrl)
      setValue('profileImage', imageUrl)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload profile image')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeDocument = (index) => {
    const newDocuments = documents.filter((_, i) => i !== index)
    setDocuments(newDocuments)
    setValue('documents', newDocuments)
  }

  const onSubmit = (data) => {
    const submissionData = {
      ...data,
      documents: documents.map(doc => doc.url),
      profileImage: profileImage || user?.profileImage || ''
    }
    submitVerificationMutation.mutate(submissionData)
  }

  const { verificationStatus, isVerified, documents: existingDocuments } = verificationData || {}

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'rejected':
        return <AlertCircle className="h-6 w-6 text-red-600" />
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-600" />
      default:
        return <Shield className="h-6 w-6 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'approved':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getStatusText = () => {
    switch (verificationStatus) {
      case 'approved':
        return 'Verified'
      case 'rejected':
        return 'Verification Rejected'
      case 'pending':
        return 'Verification Pending'
      default:
        return 'Not Submitted'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Landlord Verification</h1>
          <p className="text-gray-600">Complete verification to start listing properties</p>
        </div>

        {/* Status Card */}
        <div className={`rounded-xl border p-6 mb-8 ${getStatusColor()}`}>
          <div className="flex items-center">
            {getStatusIcon()}
            <div className="ml-4">
              <h3 className="text-lg font-medium">Status: {getStatusText()}</h3>
              <p className="text-sm mt-1">
                {verificationStatus === 'approved' && 'Your account is verified. You can now list properties.'}
                {verificationStatus === 'pending' && 'Your verification is under review. We\'ll notify you once approved.'}
                {verificationStatus === 'rejected' && 'Your verification was rejected. Please resubmit with correct documents.'}
                {!verificationStatus && 'Complete the form below to submit your verification.'}
              </p>
            </div>
          </div>
        </div>

        {isVerified ? (
          <div className="bg-white rounded-2xl shadow-soft p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Complete!</h2>
            <p className="text-gray-600 mb-6">
              Your account has been verified. You can now list properties and connect with tenants.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/landlord/properties/add" className="btn-primary">
                Add Your First Property
              </a>
              <a href="/landlord/dashboard" className="btn-outline">
                Go to Dashboard
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    type="text"
                    defaultValue={user?.name}
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...register('phone', { required: 'Phone number is required' })}
                      type="tel"
                      value={phone}
                      onChange={(e) => setValue('phone', e.target.value)}
                      className="input-field pl-10"
                      placeholder="+237 XXX XXX XXX"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Image
                </label>
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {profileImage || user?.profileImage ? (
                        <img
                          src={profileImage || user?.profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary-hover">
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Upload a clear profile photo</p>
                    <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Required Documents */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Required Documents</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">National ID or Passport</p>
                    <p className="text-sm text-gray-600">Clear photo of your government-issued ID</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Property Ownership Proof</p>
                    <p className="text-sm text-gray-600">Property deed, title, or ownership certificate</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Additional Verification</p>
                    <p className="text-sm text-gray-600">Any other documents that verify your identity</p>
                  </div>
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Upload Documents
                </label>
                
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">PDF, JPG, PNG up to 10MB</p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="document-upload"
                  />
                  <label
                    htmlFor="document-upload"
                    className="btn-primary mt-4 cursor-pointer inline-block"
                  >
                    {uploading ? <LoadingSpinner size="sm" /> : 'Select Files'}
                  </label>
                </div>

                {/* Uploaded Documents */}
                {documents.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium text-gray-900">Uploaded Documents</h4>
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm text-gray-700">{doc.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitVerificationMutation.isLoading || documents.length === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitVerificationMutation.isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  'Submit for Verification'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Verification
