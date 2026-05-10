import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render without crashing', () => {
    const TestComponent = () => <div>Auth Test</div>

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Auth Test')).toBeInTheDocument()
  })

  it('should provide useAuth hook', () => {
    const TestComponent = () => {
      const { user } = useAuth()
      return <div>{user ? 'logged in' : 'logged out'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText(/logged out/i)).toBeInTheDocument()
  })
})

