import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  Users, 
  Ban, 
  CheckCircle, 
  Eye,
  Search,
  Filter,
  User,
  XCircle,
  Key
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { getSavedLanguage } from '../../utils/preferences'
import { translate } from '../../utils/i18n'

const formatShortId = (idValue) => String(idValue ?? '').slice(-8)

const validatePasswordStrength = (password) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)
}

const normalizePhone = (phone) => {
  const cleaned = String(phone || '').trim().replace(/[^\d+]/g, '')
  if (!cleaned) return ''
  if (cleaned.startsWith('+')) {
    return `+${cleaned.slice(1).replace(/\+/g, '')}`
  }
  return cleaned.replace(/\+/g, '')
}

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
const isValidPhone = (value) => /^\+?[1-9]\d{7,14}$/.test(String(value || ''))

const AdminUsers = () => {
  const [language, setLanguage] = useState('en')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedRole, setSelectedRole] = useState('tenant')
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' })
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const syncLanguagePreference = () => {
      setLanguage(getSavedLanguage())
    }

    syncLanguagePreference()
    window.addEventListener('camrent:preferences-updated', syncLanguagePreference)
    window.addEventListener('storage', syncLanguagePreference)

    return () => {
      window.removeEventListener('camrent:preferences-updated', syncLanguagePreference)
      window.removeEventListener('storage', syncLanguagePreference)
    }
  }, [])

  const t = (key, fallback) => translate(language, key, fallback)
  const locale = language === 'fr' ? 'fr-FR' : 'en-US'

  const getRoleLabel = (role) => {
    if (role === 'admin') return t('adminUsersRoleAdmin', 'Admin')
    if (role === 'landlord') return t('adminUsersRoleLandlord', 'Landlord')
    return t('adminUsersRoleTenant', 'Tenant')
  }

  const getVerificationLabel = (status) => {
    if (status === 'approved') return t('adminUsersVerificationApproved', 'Approved')
    if (status === 'rejected') return t('adminUsersVerificationRejected', 'Rejected')
    if (status === 'pending') return t('adminUsersVerificationPending', 'Pending')
    return t('adminUsersVerificationNA', 'n/a')
  }

  const { data: usersData, isLoading } = useQuery(
    ['adminUsers', { page, search: searchQuery, role: filterRole, isActive: filterStatus }],
    () => adminAPI.getUsers({ page, search: searchQuery, role: filterRole, isActive: filterStatus }),
    {
      select: (response) => response.data.data
    }
  )

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value)
    setPage(1)
  }

  const handleRoleChange = (event) => {
    setFilterRole(event.target.value)
    setPage(1)
  }

  const handleStatusChange = (event) => {
    setFilterStatus(event.target.value)
    setPage(1)
  }

  const banUserMutation = useMutation(
    ({ id, isActive }) => adminAPI.banUser(id, { isActive }),
    {
      onSuccess: (response, { isActive }) => {
        toast.success(
          isActive
            ? t('adminUsersToastUserActivated', 'User activated successfully')
            : t('adminUsersToastUserBanned', 'User banned successfully')
        )
        queryClient.invalidateQueries('adminUsers')
        queryClient.invalidateQueries('adminDashboard')
        setSelectedUser(response.data.data.user)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('adminUsersErrorUpdateStatus', 'Failed to update user status'))
      }
    }
  )

  const updateRoleMutation = useMutation(
    ({ id, role }) => adminAPI.updateUserRole(id, { role }),
    {
      onSuccess: (response) => {
        toast.success(t('adminUsersToastRoleUpdated', 'User role updated successfully'))
        queryClient.invalidateQueries('adminUsers')
        queryClient.invalidateQueries('adminDashboard')
        setSelectedUser(response.data.data.user)
        setSelectedRole(response.data.data.user.role)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('adminUsersErrorUpdateRole', 'Failed to update user role'))
      }
    }
  )

  const updateUserMutation = useMutation(
    ({ id, payload }) => adminAPI.updateUser(id, payload),
    {
      onSuccess: (response) => {
        toast.success(t('adminUsersToastInfoUpdated', 'User information updated successfully'))
        queryClient.invalidateQueries('adminUsers')
        setSelectedUser(response.data.data.user)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('adminUsersErrorUpdateUser', 'Failed to update user'))
      }
    }
  )

  const resetPasswordMutation = useMutation(
    (id) => adminAPI.resetUserPassword(id),
    {
      onSuccess: (response) => {
        toast.success(t('adminUsersToastResetSent', 'Password reset email sent successfully'))
        setSelectedUser(response.data.data.user)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('adminUsersErrorResetEmail', 'Failed to send reset email'))
      }
    }
  )

  const updateUserPasswordMutation = useMutation(
    ({ id, newPassword }) => adminAPI.updateUserPassword(id, { newPassword }),
    {
      onSuccess: (response) => {
        toast.success(t('adminUsersToastPasswordUpdated', 'User password updated successfully'))
        queryClient.invalidateQueries('adminUsers')
        setSelectedUser(response.data.data.user)
        setNewPassword('')
        setConfirmNewPassword('')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('adminUsersErrorUpdatePassword', 'Failed to update password'))
      }
    }
  )

  const deleteUserMutation = useMutation(
    (id) => adminAPI.deleteUser(id),
    {
      onSuccess: () => {
        toast.success(t('adminUsersToastDeleted', 'User deleted successfully'))
        queryClient.invalidateQueries('adminUsers')
        queryClient.invalidateQueries('adminDashboard')
        closeUserModal()
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || t('adminUsersErrorDeleteUser', 'Failed to delete user'))
      }
    }
  )

  const handleBanUser = (userId, isActive) => {
    const actionLabel = isActive ? t('adminUsersActionActivate', 'activate') : t('adminUsersActionBan', 'ban')
    if (window.confirm(t('adminUsersConfirmStatusChange', `Are you sure you want to ${actionLabel} this user?`).replace('{action}', actionLabel))) {
      banUserMutation.mutate({ id: userId, isActive })
    }
  }

  const handleOpenUser = (user) => {
    setSelectedUser(user)
    setSelectedRole(user.role)
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || ''
    })
  }

  const handleSendPasswordReset = () => {
    if (!selectedUser) return

    if (window.confirm(t('adminUsersConfirmResetEmail', `Send a password reset email to ${selectedUser.email}?`).replace('{email}', selectedUser.email))) {
      resetPasswordMutation.mutate(selectedUser._id)
    }
  }

  const handleRoleUpdate = () => {
    if (!selectedUser || selectedRole === selectedUser.role) {
      return
    }

    const roleLabel = selectedRole === 'landlord' ? t('adminUsersRoleLandlord', 'landlord') : t('adminUsersRoleTenant', 'tenant')
    if (window.confirm(t('adminUsersConfirmRoleChange', `Change this user role to ${roleLabel}?`).replace('{role}', roleLabel))) {
      updateRoleMutation.mutate({ id: selectedUser._id, role: selectedRole })
    }
  }

  const closeUserModal = () => {
    setSelectedUser(null)
    setSelectedRole('tenant')
    setEditForm({ name: '', email: '', phone: '' })
  }

  const handleSaveUserDetails = () => {
    if (!selectedUser) return

    const safeName = String(editForm.name || '').trim()
    const safeEmail = String(editForm.email || '').trim().toLowerCase()
    const safePhone = normalizePhone(editForm.phone)

    if (safeName.length < 2 || safeName.length > 100) {
      toast.error(t('adminUsersErrorNameInvalid', 'Name must be between 2 and 100 characters'))
      return
    }

    if (!isValidEmail(safeEmail)) {
      toast.error(t('adminUsersErrorEmailInvalid', 'Please provide a valid email'))
      return
    }

    if (safePhone && !isValidPhone(safePhone)) {
      toast.error(t('adminUsersErrorPhoneInvalid', 'Please provide a valid phone number'))
      return
    }

    const payload = {
      name: safeName,
      email: safeEmail,
      phone: safePhone
    }

    updateUserMutation.mutate({ id: selectedUser._id, payload })
  }

  const handleDeleteUser = () => {
    if (!selectedUser) return

    if (window.confirm(t('adminUsersConfirmDelete', `Delete ${selectedUser.name}? This action cannot be undone.`).replace('{name}', selectedUser.name))) {
      deleteUserMutation.mutate(selectedUser._id)
    }
  }

  const handleUpdateUserPassword = () => {
    if (!selectedUser) return

    if (!validatePasswordStrength(newPassword)) {
      toast.error(t('adminUsersPasswordRule', 'Password must be at least 8 characters and include uppercase, lowercase, and a number'))
      return
    }

    if (newPassword !== confirmNewPassword) {
      toast.error(t('adminUsersPasswordsNoMatch', 'Passwords do not match'))
      return
    }

    if (window.confirm(t('adminUsersConfirmSetPassword', `Set a new password for ${selectedUser.name}?`).replace('{name}', selectedUser.name))) {
      updateUserPasswordMutation.mutate({ id: selectedUser._id, newPassword })
    }
  }

  const { users, pagination } = usersData || {}

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('adminUsersPageTitle', 'User Management')}</h1>
          <p className="text-gray-600">{t('adminUsersPageDescription', 'Manage platform users and their access')}</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 flex items-center">
              <Search className="h-5 w-5 text-gray-400 mr-3" />
              <input
                type="text"
                placeholder={t('adminUsersSearchPlaceholder', 'Search users...')}
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full focus:outline-none"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Filter className="hidden sm:block h-5 w-5 text-gray-400" />
              <select
                value={filterRole}
                onChange={handleRoleChange}
                className="input-field w-full sm:w-auto"
              >
                <option value="all">{t('adminUsersAllRoles', 'All Roles')}</option>
                <option value="tenant">{t('adminUsersRoleTenants', 'Tenants')}</option>
                <option value="landlord">{t('adminUsersRoleLandlords', 'Landlords')}</option>
                <option value="admin">{t('adminUsersRoleAdmins', 'Admins')}</option>
              </select>
              <select
                value={filterStatus}
                onChange={handleStatusChange}
                className="input-field w-full sm:w-auto"
              >
                <option value="all">{t('adminUsersAllStatus', 'All Status')}</option>
                <option value="true">{t('adminUsersStatusActive', 'Active')}</option>
                <option value="false">{t('adminUsersStatusBanned', 'Banned')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        {users?.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('adminUsersEmptyTitle', 'No users found')}</h2>
            <p className="text-gray-600">
              {t('adminUsersEmptyDescription', 'No users match your current filters.')}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            <div className="md:hidden space-y-3 p-3">
              {users?.map((user) => (
                <article key={user._id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        user.role === 'admin' ? 'bg-red-100' :
                        user.role === 'landlord' ? 'bg-blue-100' :
                        'bg-green-100'
                      }`}>
                        <User className={`h-5 w-5 ${
                          user.role === 'admin' ? 'text-red-600' :
                          user.role === 'landlord' ? 'text-blue-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500">{t('adminUsersIdPrefix', 'ID')}: {formatShortId(user._id)}</p>
                      </div>
                    </div>
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {user.isActive ? t('adminUsersStatusActive', 'Active') : t('adminUsersStatusBanned', 'Banned')}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-gray-900 break-all">{user.email}</p>
                    {user.phone && <p className="text-gray-600">{user.phone}</p>}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`badge capitalize ${
                        user.role === 'admin' ? 'badge-danger' :
                        user.role === 'landlord' ? 'badge-primary' :
                        'badge-success'
                      }`}>
                        {getRoleLabel(user.role)}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString(locale)}</span>
                    </div>
                    {user.role === 'landlord' && user.verificationStatus && (
                      <p className="text-xs text-gray-500">{getVerificationLabel(user.verificationStatus)}</p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => handleOpenUser(user)}
                      className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover text-sm font-medium"
                      title={t('adminUsersViewDetails', 'View details')}
                    >
                      <Eye className="h-4 w-4" />
                      {t('adminUsersViewDetails', 'View details')}
                    </button>
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleBanUser(user._id, !user.isActive)}
                        disabled={banUserMutation.isLoading}
                        className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                          user.isActive
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                        title={user.isActive ? t('adminUsersBanUser', 'Ban User') : t('adminUsersActivateUser', 'Activate User')}
                      >
                        {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        {user.isActive ? t('adminUsersBanUser', 'Ban User') : t('adminUsersActivateUser', 'Activate User')}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminUser', 'User')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminUsersContact', 'Contact')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminRole', 'Role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminStatus', 'Status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminJoined', 'Joined')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('adminActions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users?.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                            user.role === 'admin' ? 'bg-red-100' :
                            user.role === 'landlord' ? 'bg-blue-100' :
                            'bg-green-100'
                          }`}>
                            <User className={`h-5 w-5 ${
                              user.role === 'admin' ? 'text-red-600' :
                              user.role === 'landlord' ? 'text-blue-600' :
                              'text-green-600'
                            }`} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{t('adminUsersIdPrefix', 'ID')}: {formatShortId(user._id)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                        {user.phone && (
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge capitalize ${
                          user.role === 'admin' ? 'badge-danger' :
                          user.role === 'landlord' ? 'badge-primary' :
                          'badge-success'
                        }`}>
                          {getRoleLabel(user.role)}
                        </span>
                        {user.role === 'landlord' && user.verificationStatus && (
                          <div className="text-xs text-gray-500 mt-1">
                            {getVerificationLabel(user.verificationStatus)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${
                          user.isActive ? 'badge-success' : 'badge-danger'
                        }`}>
                          {user.isActive ? t('adminUsersStatusActive', 'Active') : t('adminUsersStatusBanned', 'Banned')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString(locale)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleOpenUser(user)}
                            className="text-primary hover:text-primary-hover"
                            title={t('adminUsersViewDetails', 'View details')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleBanUser(user._id, !user.isActive)}
                              disabled={banUserMutation.isLoading}
                              className={`${
                                user.isActive 
                                  ? 'text-red-600 hover:text-red-800' 
                                  : 'text-green-600 hover:text-green-800'
                              }`}
                              title={user.isActive ? t('adminUsersBanUser', 'Ban User') : t('adminUsersActivateUser', 'Activate User')}
                            >
                              {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="w-full max-w-3xl">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 sm:hidden">
                <button
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={pagination.page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('adminUsersPrevious', 'Previous')}
                </button>
                <span className="text-sm text-gray-600">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPage((currentPage) => Math.min(pagination.pages, currentPage + 1))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('adminUsersNext', 'Next')}
                </button>
              </div>

              <div className="hidden sm:flex items-center justify-center space-x-2">
              <button
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('adminUsersPrevious', 'Previous')}
              </button>

              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-2 rounded-lg ${
                    pagination.page === i + 1
                      ? 'bg-primary text-white'
                      : 'border border-gray-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setPage((currentPage) => Math.min(pagination.pages, currentPage + 1))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('adminUsersNext', 'Next')}
              </button>
              </div>
            </div>
          </div>
        )}

        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{t('adminUsersModalTitle', 'User Details')}</h2>
                    <p className="text-sm text-gray-500">{t('adminUsersModalDescription', 'Review account access and update role status.')}</p>
                  </div>
                  <button
                    onClick={closeUserModal}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <XCircle className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">{t('adminUsersFullName', 'Full Name')}</p>
                      <input
                        value={editForm.name}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">{t('adminUsersEmail', 'Email')}</p>
                      <input
                        value={editForm.email}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">{t('adminUsersPhone', 'Phone')}</p>
                      <input
                        value={editForm.phone}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2"
                        placeholder={t('adminUsersNoPhone', 'No phone')}
                      />
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">{t('adminJoined', 'Joined')}</p>
                      <p className="font-medium text-gray-900">{new Date(selectedUser.createdAt).toLocaleString(locale)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border border-gray-200 rounded-xl">
                      <p className="text-sm text-gray-500 mb-2">{t('adminUsersCurrentRole', 'Current Role')}</p>
                      <span className={`badge capitalize ${
                        selectedUser.role === 'admin' ? 'badge-danger' :
                        selectedUser.role === 'landlord' ? 'badge-primary' :
                        'badge-success'
                      }`}>
                        {getRoleLabel(selectedUser.role)}
                      </span>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-xl">
                      <p className="text-sm text-gray-500 mb-2">{t('adminUsersAccountStatus', 'Account Status')}</p>
                      <span className={`badge ${selectedUser.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {selectedUser.isActive ? t('adminUsersStatusActive', 'Active') : t('adminUsersStatusBanned', 'Banned')}
                      </span>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-xl">
                      <p className="text-sm text-gray-500 mb-2">{t('adminUsersVerification', 'Verification')}</p>
                      <span className={`badge ${
                        selectedUser.verificationStatus === 'approved' ? 'badge-success' :
                        selectedUser.verificationStatus === 'rejected' ? 'badge-danger' :
                        'badge-warning'
                      }`}>
                        {getVerificationLabel(selectedUser.verificationStatus)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">{t('adminUsersPassword', 'Password')}</p>
                      <p className="font-medium text-gray-900">********</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {t('adminUsersPasswordHint', 'Passwords are stored securely and cannot be viewed in plain text. Use the reset or change password controls below.')}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">{t('adminUsersUpdatedAt', 'Updated At')}</p>
                      <p className="font-medium text-gray-900">{new Date(selectedUser.updatedAt).toLocaleString(locale)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">{t('adminUsersAccountId', 'Account ID')}</p>
                      <p className="font-medium text-gray-900 break-all">{selectedUser._id}</p>
                    </div>
                  </div>

                  {selectedUser.role !== 'admin' && (
                    <div className="border border-gray-200 rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{t('adminUsersManageAccess', 'Manage Access')}</h3>
                          <p className="text-sm text-gray-500">{t('adminUsersManageAccessHint', 'Change the user role or suspend account access.')}</p>
                        </div>
                        <button
                          onClick={() => handleBanUser(selectedUser._id, !selectedUser.isActive)}
                          disabled={banUserMutation.isLoading}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            selectedUser.isActive
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          } disabled:opacity-50`}
                        >
                          {banUserMutation.isLoading
                            ? t('adminUsersUpdating', 'Updating...')
                            : selectedUser.isActive
                              ? t('adminUsersBanUser', 'Ban User')
                              : t('adminUsersActivateUser', 'Activate User')}
                        </button>
                      </div>

                      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                        <div className="flex-1 w-full">
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminRole', 'Role')}</label>
                          <select
                            value={selectedRole}
                            onChange={(event) => setSelectedRole(event.target.value)}
                            className="input-field w-full"
                          >
                            <option value="tenant">{t('adminUsersRoleTenant', 'Tenant')}</option>
                            <option value="landlord">{t('adminUsersRoleLandlord', 'Landlord')}</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-2">
                            {t('adminUsersRoleSwitchHint', 'Switching a user to landlord resets verification to pending for admin review.')}
                          </p>
                        </div>
                        <button
                          onClick={handleRoleUpdate}
                          disabled={updateRoleMutation.isLoading || selectedRole === selectedUser.role}
                          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updateRoleMutation.isLoading ? t('adminUsersSaving', 'Saving...') : t('adminUsersUpdateRole', 'Update Role')}
                        </button>
                      </div>

                      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Key className="h-5 w-5 text-gray-500" />
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminUsersNewPassword', 'New Password')}</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(event) => setNewPassword(event.target.value)}
                              autoComplete="new-password"
                              className="input-field w-full"
                              placeholder={t('adminUsersEnterNewPassword', 'Enter new password')}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              {t('adminUsersPasswordRule', 'Must be at least 8 characters and include uppercase, lowercase, and a number.')}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminUsersConfirmNewPassword', 'Confirm New Password')}</label>
                            <input
                              type="password"
                              value={confirmNewPassword}
                              onChange={(event) => setConfirmNewPassword(event.target.value)}
                              autoComplete="new-password"
                              className="input-field w-full"
                              placeholder={t('adminUsersConfirmNewPasswordPlaceholder', 'Confirm new password')}
                            />
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={handleUpdateUserPassword}
                              disabled={updateUserPasswordMutation.isLoading}
                              className="btn-primary disabled:opacity-50"
                            >
                              {updateUserPasswordMutation.isLoading ? t('adminUsersUpdating', 'Updating...') : t('adminUsersSetNewPassword', 'Set New Password')}
                            </button>
                            <button
                              onClick={handleSendPasswordReset}
                              disabled={resetPasswordMutation.isLoading}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                            >
                              {resetPasswordMutation.isLoading ? t('adminUsersSending', 'Sending...') : t('adminUsersSendResetEmail', 'Send Reset Email')}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-4">
                        <button
                          onClick={handleSaveUserDetails}
                          disabled={updateUserMutation.isLoading}
                          className="btn-secondary disabled:opacity-50"
                        >
                          {updateUserMutation.isLoading ? t('adminUsersUpdating', 'Updating...') : t('adminUsersSaveProfileChanges', 'Save Profile Changes')}
                        </button>
                        <button
                          onClick={handleDeleteUser}
                          disabled={deleteUserMutation.isLoading}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deleteUserMutation.isLoading ? t('adminUsersDeleting', 'Deleting...') : t('adminUsersDeleteUser', 'Delete User')}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedUser.documents?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">{t('adminUsersDocuments', 'Documents')}</h3>
                      <div className="space-y-2">
                        {selectedUser.documents.map((documentUrl, index) => (
                          <a
                            key={documentUrl || index}
                            href={documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-primary hover:text-primary-hover"
                          >
                            <span>{t('adminDocument', 'Document')} {index + 1}</span>
                            <span className="text-sm">{t('adminUsersOpen', 'Open')}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUsers
