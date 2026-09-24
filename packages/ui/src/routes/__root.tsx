import { createRootRoute, Link, Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { AdminSchema } from '@blackwaves/admingen-types'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

const fetchAdminSchema = async (): Promise<AdminSchema> => {
  const res = await fetch('/admin/api/_schema', {
    credentials: 'include' 
  })
  if (!res.ok) {
    throw new Error('Failed to fetch admin schema')
  }
  return res.json()
}

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user, isLoading: authLoading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    data: schema,
    isLoading: schemaLoading,
    error,
  } = useQuery({
    queryKey: ['adminSchema'],
    queryFn: fetchAdminSchema,
    // Don't fetch schema if not authenticated, to avoid 401s on schema endpoint
    enabled: !!user 
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user && location.pathname !== '/login') {
      navigate({ to: '/login' })
    }
  }, [user, authLoading, navigate, location])

  // Show nothing or loading state while checking auth
  if (authLoading) return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Loading...</div>

  // Allow rendering if on login page (even if no user)
  if (!user && location.pathname === '/login') {
    return <Outlet />
  }

  // If not on login page and no user (should rely on useEffect redirect, but safe guard)
  if (!user) return null

  return (
    <>
      <div className="flex min-h-screen bg-linear-to-br from-[#050505] via-[#0a0a0a] to-[#0f1f3a]">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`fixed top-4 left-4 cursor-pointer z-50 p-2 rounded-md bg-[#1a1a1a] text-white lg:hidden ${
            isSidebarOpen ? 'hidden' : ''
          }`}
          aria-label="Toggle menu"
        >
          {isSidebarOpen ? '' : <Menu size={24} />}
        </button>

        {/* Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out
            bg-linear-to-b from-[#0b0b0b] to-[#1a1a1a] text-white p-4
            lg:relative lg:translate-x-0 lg:z-auto
            flex flex-col
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="font-bold text-lg">
              Admin Dashboard
            </Link>
            {/* Close button inside sidebar on mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden"
              aria-label="Close menu"
            >
              <X className="cursor-pointer" size={20} />
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {schemaLoading && <div className="text-sm">Loading...</div>}
            {schema?.resources.map((resource) => (
              <Link
                key={resource.name}
                to="/$resource"
                params={{ resource: resource.name }}
                onClick={() => setIsSidebarOpen(false)} // Close on click (mobile)
                className="block px-3 py-2 rounded-md transition-all duration-200
                  hover:bg-[#00eaff]/10 hover:text-[#00eaff] 
                  [&.active]:font-bold [&.active]:text-[#00eaff]"
              >
                {resource.label}
              </Link>
            ))}
          </nav>
          
          <div className="mt-auto pt-4 border-t border-gray-800">
             <div className="px-3 py-2 text-sm text-gray-400 mb-2">
                User: {user?.name || user?.email || 'Unknown'}
             </div>
             <button
                onClick={() => logout()}
                className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
              >
                Logout
              </button>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 p-6 pt-0 lg:pt-6 lg:ml-0">
          <Outlet />
        </div>
      </div>
    </>
  )
}
