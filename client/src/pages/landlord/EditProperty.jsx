import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { propertyAPI } from '../../services/api'
import AddProperty from './AddProperty'
import LoadingSpinner from '../../components/LoadingSpinner'

const EditProperty = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: propertyData, isLoading } = useQuery(
    ['property', id],
    () => propertyAPI.getPropertyById(id),
    {
      enabled: !!id,
      select: (response) => response.data.data.property
    }
  )

  const updatePropertyMutation = useMutation(
    (data) => propertyAPI.updateProperty(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('landlordProperties')
        queryClient.invalidateQueries('landlordDashboard')
        navigate('/landlord/properties')
      },
      onError: (error) => {
        console.error('Failed to update property:', error)
      }
    }
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!propertyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Property not found</h2>
          <button
            onClick={() => navigate('/landlord/properties')}
            className="btn-primary"
          >
            Back to Properties
          </button>
        </div>
      </div>
    )
  }

  return (
    <AddProperty
      editMode={true}
      propertyData={propertyData}
      updatePropertyMutation={updatePropertyMutation}
    />
  )
}

export default EditProperty
