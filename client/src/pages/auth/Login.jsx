import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/useAuth'
import { Building, Mail, Lock } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'
import AuthLanguageSwitcher from '../../components/settings/AuthLanguageSwitcher'

const Login = () => {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const formRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  })

  useEffect(() => {
    // Ensure auth fields are clean when this page mounts
    reset({ email: '', password: '' })
    
    // Clear all input fields directly from the DOM
    if (formRef.current) {
      const inputs = formRef.current.querySelectorAll('input')
      inputs.forEach((input) => {
        input.value = ''
      })
    }
    
    // Clear browser autocomplete/password manager cache
    if (typeof window !== 'undefined') {
      // Clear any stored credentials
      sessionStorage.removeItem('loginEmail')
      localStorage.removeItem('loginEmail')
      sessionStorage.removeItem('lastEmail')
      localStorage.removeItem('lastEmail')
    }
  }, [reset])

  const onSubmit = async (data) => {
    setLoading(true)
    const result = await login(data.email, data.password)
    
    if (result.success) {
      reset({ email: '', password: '' })
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
            Sign in to CAMRENT
          </h2>
          <p className="mt-2 text-sm text-white text-opacity-90">
            Cameroon's trusted rental platform
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-8">
          <form ref={formRef} className="space-y-6" onSubmit={handleSubmit(onSubmit)} autoComplete="off" noValidate>
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
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
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
                  type="password"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="input-field pl-10"
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center space-y-3">
            <div>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:text-primary-hover"
              >
                Forgot your password?
              </Link>
            </div>
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary hover:text-primary-hover">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-white text-opacity-75">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
