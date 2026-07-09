import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { authAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import AuthLanguageSwitcher from '../../components/settings/AuthLanguageSwitcher'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [tokenError, setTokenError] = useState(false)

  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm()

  const password = watch('password')

  useEffect(() => {
    if (!token) {
      setTokenError(true)
    }
  }, [token])

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await authAPI.resetPassword({
        token,
        newPassword: data.password
      })
      setIsSuccess(true)
      toast.success('Password reset successfully!')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password'
      toast.error(message)
      if (message.includes('expired') || message.includes('invalid')) {
        setTokenError(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenError) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-accent py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <AuthLanguageSwitcher />
        </div>
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-red-400" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-white">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-sm text-white text-opacity-90">
              This password reset link is invalid or has expired.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-8">
            <div className="text-center space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  What can you do?
                </h3>
                <ul className="text-sm text-yellow-700 text-left space-y-1">
                  <li>• Request a new password reset link</li>
                  <li>• Check if the link was copied correctly</li>
                  <li>• Reset links expire after 1 hour</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <Link
                  to="/forgot-password"
                  className="w-full btn-primary flex items-center justify-center"
                >
                  Request New Link
                </Link>
                
                <Link
                  to="/login"
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-accent py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <AuthLanguageSwitcher />
        </div>
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-400" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-white">
              Password Reset Successful!
            </h2>
            <p className="mt-2 text-sm text-white text-opacity-90">
              Your password has been successfully updated.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-8">
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">
                  All set!
                </h3>
                <p className="text-sm text-green-700">
                  You can now sign in with your new password.
                </p>
              </div>
              
              <Link
                to="/login"
                className="w-full btn-primary flex items-center justify-center"
              >
                Sign In Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-accent py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <AuthLanguageSwitcher />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Lock className="h-12 w-12 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">
            Create New Password
          </h2>
          <p className="mt-2 text-sm text-white text-opacity-90">
            Enter your new password below
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters long'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
