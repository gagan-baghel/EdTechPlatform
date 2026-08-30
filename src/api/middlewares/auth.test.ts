import type { Request, Response, NextFunction } from "express"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { requireRole, isStudent, isInstructor, isAdmin } from "./auth"

describe("requireRole middleware", () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonMock: ReturnType<typeof vi.fn>
  let statusMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    jsonMock = vi.fn()
    statusMock = vi.fn(() => ({ json: jsonMock }))
    mockRes = {
      status: statusMock as unknown as typeof mockRes.status,
      headersSent: false
    } as Response
    mockNext = vi.fn()
  })

  it("should fail with 401 if req.user is undefined", () => {
    mockReq = {} // No user
    
    isStudent(mockReq as Request, mockRes as Response, mockNext)
    
    expect(statusMock).toHaveBeenCalledWith(401)
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: "UNAUTHENTICATED"
    }))
    expect(mockNext).not.toHaveBeenCalled()
  })

  it("should fail with 403 if accountType does not match", () => {
    mockReq = {
      user: {
        id: "123",
        email: "test@test.com",
        accountType: "Student"
      }
    } as unknown as Request
    
    isInstructor(mockReq as Request, mockRes as Response, mockNext)
    
    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: "FORBIDDEN"
    }))
    expect(mockNext).not.toHaveBeenCalled()
  })

  it("should call next() if accountType matches", () => {
    mockReq = {
      user: {
        id: "123",
        email: "test@test.com",
        accountType: "Admin"
      }
    } as unknown as Request
    
    isAdmin(mockReq as Request, mockRes as Response, mockNext)
    
    expect(statusMock).not.toHaveBeenCalled()
    expect(mockNext).toHaveBeenCalled()
  })

  it("should support multiple allowed roles", () => {
    mockReq = {
      user: {
        id: "123",
        email: "test@test.com",
        accountType: "Instructor"
      }
    } as unknown as Request
    
    const isStaffOrInstructor = requireRole("Admin", "Instructor")
    isStaffOrInstructor(mockReq as Request, mockRes as Response, mockNext)
    
    expect(statusMock).not.toHaveBeenCalled()
    expect(mockNext).toHaveBeenCalled()
  })
})
