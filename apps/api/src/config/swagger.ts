import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HARI HR System API',
      version: '1.1.0',
      description: `
## HARI - Human Affairs & Resource Integration

A comprehensive HR management API for managing employees, leave requests, documents, and more.

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### Rate Limiting
- General: 100 requests per 15 minutes
- Authentication: 5 attempts per 15 minutes
- API: 30 requests per minute
      `,
      contact: {
        name: 'HARI HR Team',
        email: 'support@hari-hr.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.hari-hr.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            message: {
              type: 'string',
              description: 'Detailed error message',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            employeeId: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['HR_ADMIN', 'EMPLOYEE'] },
            avatar: { type: 'string', format: 'uri' },
            jobTitle: { type: 'string' },
            department: { type: 'string' },
          },
        },
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string' },
            department: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            salary: { type: 'number' },
            avatar: { type: 'string', format: 'uri' },
            status: { type: 'string', enum: ['Active', 'On Leave', 'Terminated'] },
          },
        },
        CreateEmployee: {
          type: 'object',
          required: ['name', 'email', 'role', 'department'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', minLength: 2, maxLength: 50 },
            department: { type: 'string', minLength: 2, maxLength: 50 },
            startDate: { type: 'string', format: 'date' },
            salary: { type: 'number' },
            password: { type: 'string', minLength: 8 },
          },
        },
        LeaveRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            employeeId: { type: 'string', format: 'uuid' },
            employeeName: { type: 'string' },
            type: { type: 'string', enum: ['Vacation', 'Sick Leave', 'Personal Day'] },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            days: { type: 'integer' },
            reason: { type: 'string' },
            status: { type: 'string', enum: ['Pending', 'Approved', 'Rejected'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateLeaveRequest: {
          type: 'object',
          required: ['type', 'startDate', 'endDate'],
          properties: {
            type: { type: 'string', enum: ['Vacation', 'Sick Leave', 'Personal Day'] },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            reason: { type: 'string', maxLength: 500 },
          },
        },
        LeaveBalance: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            total: { type: 'integer' },
            used: { type: 'number' },
            remaining: { type: 'number' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' },
              },
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: {
              type: 'string',
              minLength: 8,
              description: 'Must contain uppercase, lowercase, number, and special character',
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Employees', description: 'Employee management endpoints' },
      { name: 'Leave Requests', description: 'Leave request management endpoints' },
      { name: 'Documents', description: 'Document management endpoints' },
      { name: 'System', description: 'System configuration and utilities' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/docs/*.yaml'],
};

export const swaggerSpec = swaggerJsdoc(options);
