import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/useAuth'
import { Eye, EyeOff, Building, Mail, Lock, User, Phone } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'
import AuthLanguageSwitcher from '../../components/settings/AuthLanguageSwitcher'
import { getSavedLanguage, saveLanguage } from '../../utils/preferences'

const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const formRef = useRef(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    reset({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: ''
    })
    setShowPassword(false)
    
    // Clear all input fields directly from the DOM
    if (formRef.current) {
      const inputs = formRef.current.querySelectorAll('input')
      inputs.forEach((input) => {
        input.value = ''
      })
    }
    
    // Clear any stored registration data
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('registerEmail')
      localStorage.removeItem('registerEmail')
    }
  }, [reset])

  const password = watch('password')

  const onSubmit = async (data) => {
    setLoading(true)
    const selectedLanguage = getSavedLanguage()
    saveLanguage(selectedLanguage)

    const result = await registerUser({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      password: data.password,
      role: data.role,
      language: selectedLanguage
    })
    
    if (result.success) {
      reset({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: ''
      })
      setShowPassword(false)
      const redirectPath = result.user?.role === 'admin' ? '/admin/dashboard' : 
                          result.user?.role === 'landlord' ? '/landlord/dashboard' : 
                          '/tenant/dashboard'
      navigate(redirectPath, { replace: true })
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-accent py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <AuthLanguageSwitcher />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Building className="h-12 w-12 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">
            Join CAMRENT
          </h2>
          <p className="mt-2 text-sm text-white text-opacity-90">
            Create your account to get started
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-8">
          <form ref={formRef} className="space-y-6" onSubmit={handleSubmit(onSubmit)} autoComplete="off" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('name', {
                    required: 'Name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters'
                    }
                  })}
                  type="text"
                  autoComplete="off"
                  className="input-field pl-10"
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  autoComplete="off"
                  className="input-field pl-10"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('phone', {
                    pattern: {
                      value: /^\+?[0-9\s\-()]{7,20}$/,
                      message: 'Invalid phone number'
                    }
                  })}
                  type="tel"
                  autoComplete="off"
                  className="input-field pl-10"
                  placeholder="Enter your phone number (optional)"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
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
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="input-field pl-10 pr-10"
                  placeholder="Create a password"
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
                Confirm Password
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
                  type="password"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="input-field pl-10"
                  placeholder="Confirm your password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                I want to
              </label>
              <select
                {...register('role', { required: 'Please select a role' })}
                className="input-field"
              >
                <option value="">Select your role</option>
                <option value="tenant">Rent a Property (Tenant)</option>
                <option value="landlord">List a Property (Landlord)</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-white text-opacity-75">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
