'use client'

import { useProfile } from '@/hooks/useProfile'

export function ProfileSection() {
  const { profile, loading, error, refreshProfile } = useProfile()

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
          Profile Status
        </h2>
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
          Profile Status
        </h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 mb-4 font-medium">
            Error loading profile
          </p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={refreshProfile}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
          Profile Status
        </h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-yellow-600 dark:text-yellow-400 mb-4 font-medium">
            Profile not found
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Creating your profile...
          </p>
          <button
            onClick={refreshProfile}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Create Profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
        Profile Status
      </h2>
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-green-600 dark:text-green-400 mb-4 font-medium">
          ✅ Profile Connected!
        </p>
        <div className="text-sm text-gray-500 space-y-1">
          <p>ID: {profile.id.slice(0, 8)}...</p>
          <p>Email: {profile.email || 'Not provided'}</p>
          <p>Name: {profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : 'Not provided'}</p>
          <p>Created: {new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
        <button
          onClick={refreshProfile}
          className="mt-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
