import { useState } from 'react'
import { Camera, Loader2, Save, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadAPI } from '../../services/api'
import { useAuth } from '../../context/useAuth'

const ProfileSettingsCard = () => {
  const { user, updateProfile, setUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [profileImage, setProfileImage] = useState(user?.profileImage || '')
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const onUploadProfileImage = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await uploadAPI.uploadProfileImage(formData)
      const imageUrl = response?.data?.data?.profileImage || ''

      if (imageUrl) {
        setProfileImage(imageUrl)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to upload profile image')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const onSaveProfile = async () => {
    setIsSaving(true)
    try {
      const result = await updateProfile({
        name: name?.trim() || user?.name,
        phone: phone?.trim() || user?.phone,
        profileImage: profileImage || user?.profileImage || ''
      })

      if (result?.success) {
        setUser((prev) => ({
          ...(prev || {}),
          name: name?.trim() || prev?.name,
          phone: phone?.trim() || prev?.phone,
          profileImage: profileImage || prev?.profileImage || ''
        }))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-900">Profile</p>
        <p className="text-sm text-slate-500">Update your name, phone number, and profile photo.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
            {profileImage || user?.profileImage ? (
              <img src={profileImage || user?.profileImage} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <User className="h-9 w-9 text-slate-400" />
            )}
          </div>

          <label className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white cursor-pointer hover:bg-primary-hover transition-colors">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <input
              type="file"
              accept="image/*"
              onChange={onUploadProfileImage}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>

        <div className="text-sm text-slate-500">
          <p>JPG/PNG up to 5MB</p>
          <p>Available for all account roles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1.5 text-sm font-medium text-slate-700">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input-field"
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-medium text-slate-700">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="input-field"
            placeholder="+237 XXX XXX XXX"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSaveProfile}
          disabled={isSaving || isUploading}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Profile
        </button>
      </div>
    </div>
  )
}

export default ProfileSettingsCard
