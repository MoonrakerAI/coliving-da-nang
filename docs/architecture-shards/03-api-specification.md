# API Specification - Coliving Management System

## REST API Specification

```yaml
openapi: 3.0.0
info:
  title: Coliving Management System API
  version: 1.0.0
  description: RESTful API for coliving property management operations
servers:
  - url: https://your-app.vercel.app/api
    description: Production API

paths:
  /payments:
    get:
      summary: List payments with filtering
      parameters:
        - name: propertyId
          in: query
          schema:
            type: string
        - name: status
          in: query
          schema:
            type: string
            enum: [Pending, Paid, Overdue, Refunded]
        - name: tenantId
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Payment list retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  payments:
                    type: array
                    items:
                      $ref: '#/components/schemas/Payment'
                  total:
                    type: integer
    post:
      summary: Record a new payment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentCreate'
      responses:
        '201':
          description: Payment recorded successfully

  /expenses:
    get:
      summary: List expenses with filtering
      parameters:
        - name: propertyId
          in: query
          required: true
          schema:
            type: string
        - name: category
          in: query
          schema:
            type: string
        - name: startDate
          in: query
          schema:
            type: string
            format: date
        - name: endDate
          in: query
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Expense list retrieved successfully
    post:
      summary: Create new expense with photo upload
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                propertyId:
                  type: string
                amount:
                  type: number
                category:
                  type: string
                description:
                  type: string
                receiptPhotos:
                  type: array
                  items:
                    type: string
                    format: binary
                isReimbursement:
                  type: boolean
      responses:
        '201':
          description: Expense created successfully

  /tenants:
    get:
      summary: List tenants for property
      parameters:
        - name: propertyId
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Tenant list retrieved successfully
    post:
      summary: Create new tenant
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TenantCreate'
      responses:
        '201':
          description: Tenant created successfully

  /properties/{propertyId}/dashboard:
    get:
      summary: Get dashboard data for property
      parameters:
        - name: propertyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Dashboard data retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  tenants:
                    type: array
                    items:
                      $ref: '#/components/schemas/Tenant'
                  paymentSummary:
                    type: object
                    properties:
                      totalPending:
                        type: number
                      totalOverdue:
                        type: number
                      recentPayments:
                        type: array
                        items:
                          $ref: '#/components/schemas/Payment'
                  recentExpenses:
                    type: array
                    items:
                      $ref: '#/components/schemas/Expense'
                  dailyTasks:
                    type: array
                    items:
                      $ref: '#/components/schemas/Task'

components:
  schemas:
    Payment:
      type: object
      properties:
        id:
          type: string
        tenantId:
          type: string
        amount:
          type: number
        currency:
          type: string
        dueDate:
          type: string
          format: date
        status:
          type: string
          enum: [Pending, Paid, Overdue, Refunded]
        method:
          type: string
          enum: [Stripe, PayPal, Venmo, Wise, Revolut, Wire, Cash]
```
