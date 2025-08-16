'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Send, 
  ArrowLeft, 
  Mail, 
  Calendar,
  User,
  Building,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { AgreementTemplate, TemplateVariable } from '@/lib/db/models/agreement'

interface SendAgreementForm {
  templateId: string
  prospectName: string
  prospectEmail: string
  prospectPhone: string
  customMessage: string
  expirationDays: number
  ownerName: string
  ownerEmail: string
  variableValues: Record<string, any>
}

export default function SendAgreementPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<AgreementTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<AgreementTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  const [form, setForm] = useState<SendAgreementForm>({
    templateId: '',
    prospectName: '',
    prospectEmail: '',
    prospectPhone: '',
    customMessage: '',
    expirationDays: 7,
    ownerName: '',
    ownerEmail: '',
    variableValues: {}
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    if (form.templateId) {
      const template = templates.find(t => t.id === form.templateId)
      setSelectedTemplate(template || null)
      
      // Initialize variable values
      if (template) {
        const initialValues: Record<string, any> = {}
        template.variables.forEach(variable => {
          initialValues[variable.name] = variable.defaultValue || ''
        })
        setForm(prev => ({ ...prev, variableValues: initialValues }))
      }
    }
  }, [form.templateId, templates])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agreements/templates?activeOnly=true')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): string[] => {
    const errors: string[] = []
    
    if (!form.templateId) errors.push('Please select a template')
    if (!form.prospectName.trim()) errors.push('Prospect name is required')
    if (!form.prospectEmail.trim()) errors.push('Prospect email is required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.prospectEmail)) {
      errors.push('Please enter a valid email address')
    }
    if (form.expirationDays < 1 || form.expirationDays > 30) {
      errors.push('Expiration days must be between 1 and 30')
    }

    // Validate required template variables
    if (selectedTemplate) {
      selectedTemplate.variables.forEach(variable => {
        if (variable.required && !form.variableValues[variable.name]?.toString().trim()) {
          errors.push(`${variable.label} is required`)
        }
      })
    }

    return errors
  }

  const handleSend = async () => {
    const validationErrors = validateForm()
    setErrors(validationErrors)
    
    if (validationErrors.length > 0) {
      return
    }

    try {
      setSending(true)
      
      // Convert variable values to the expected format
      const variableValues = Object.entries(form.variableValues).map(([name, value]) => {
        const variable = selectedTemplate?.variables.find(v => v.name === name)
        return {
          variableId: variable?.id || '',
          name,
          value
        }
      })

      const response = await fetch('/api/agreements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: form.templateId,
          prospectName: form.prospectName,
          prospectEmail: form.prospectEmail,
          prospectPhone: form.prospectPhone || undefined,
          customMessage: form.customMessage || undefined,
          expirationDays: form.expirationDays,
          ownerName: form.ownerName || undefined,
          ownerEmail: form.ownerEmail || undefined,
          variableValues
        })
      })

      if (response.ok) {
        setSuccess(true)
        // Reset form after success
        setTimeout(() => {
          router.push('/agreements/track')
        }, 2000)
      } else {
        const error = await response.json()
        setErrors([error.message || 'Failed to send agreement'])
      }
    } catch (error) {
      console.error('Error sending agreement:', error)
      setErrors(['Failed to send agreement'])
    } finally {
      setSending(false)
    }
  }

  const updateVariableValue = (variableName: string, value: any) => {
    setForm(prev => ({
      ...prev,
      variableValues: {
        ...prev.variableValues,
        [variableName]: value
      }
    }))
  }

  const renderVariableInput = (variable: TemplateVariable) => {
    const value = form.variableValues[variable.name] || ''

    switch (variable.type) {
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => updateVariableValue(variable.name, newValue)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${variable.label}`} />
            </SelectTrigger>
            <SelectContent>
              {variable.selectOptions?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateVariableValue(variable.name, e.target.value)}
            placeholder={variable.placeholder}
          />
        )
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updateVariableValue(variable.name, e.target.value)}
          />
        )
      
      case 'boolean':
        return (
          <Select
            value={value.toString()}
            onValueChange={(newValue) => updateVariableValue(variable.name, newValue === 'true')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        )
      
      default: // text
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => updateVariableValue(variable.name, e.target.value)}
            placeholder={variable.placeholder}
          />
        )
    }
  }

  if (success) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Agreement Sent!</h2>
            <p className="text-gray-600 mb-4">
              The agreement has been successfully sent to {form.prospectEmail}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to tracking page...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Send Agreement</h1>
          <p className="text-gray-600 mt-1">
            Send a digital lease agreement to a prospective tenant
          </p>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Please fix the following errors:</h3>
                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Agreement Template
              </CardTitle>
              <CardDescription>
                Choose the template for this agreement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template">Template</Label>
                  <Select
                    value={form.templateId}
                    onValueChange={(value) => setForm(prev => ({ ...prev, templateId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - {template.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedTemplate && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Description:</strong> {selectedTemplate.description || 'No description'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Variables:</strong> {selectedTemplate.variables.length} fields to fill
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prospect Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Prospect Information
              </CardTitle>
              <CardDescription>
                Details of the person who will receive the agreement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="prospectName">Full Name *</Label>
                <Input
                  id="prospectName"
                  value={form.prospectName}
                  onChange={(e) => setForm(prev => ({ ...prev, prospectName: e.target.value }))}
                  placeholder="Enter prospect's full name"
                />
              </div>
              
              <div>
                <Label htmlFor="prospectEmail">Email Address *</Label>
                <Input
                  id="prospectEmail"
                  type="email"
                  value={form.prospectEmail}
                  onChange={(e) => setForm(prev => ({ ...prev, prospectEmail: e.target.value }))}
                  placeholder="Enter prospect's email"
                />
              </div>
              
              <div>
                <Label htmlFor="prospectPhone">Phone Number</Label>
                <Input
                  id="prospectPhone"
                  type="tel"
                  value={form.prospectPhone}
                  onChange={(e) => setForm(prev => ({ ...prev, prospectPhone: e.target.value }))}
                  placeholder="Enter prospect's phone (optional)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings
              </CardTitle>
              <CardDescription>
                Customize the email delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customMessage">Custom Message</Label>
                <Textarea
                  id="customMessage"
                  value={form.customMessage}
                  onChange={(e) => setForm(prev => ({ ...prev, customMessage: e.target.value }))}
                  placeholder="Add a personal message (optional)"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="expirationDays">Agreement Expires In (Days)</Label>
                <Input
                  id="expirationDays"
                  type="number"
                  min="1"
                  max="30"
                  value={form.expirationDays}
                  onChange={(e) => setForm(prev => ({ ...prev, expirationDays: parseInt(e.target.value) || 7 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="ownerName">Your Name</Label>
                <Input
                  id="ownerName"
                  value={form.ownerName}
                  onChange={(e) => setForm(prev => ({ ...prev, ownerName: e.target.value }))}
                  placeholder="Your name (optional)"
                />
              </div>
              
              <div>
                <Label htmlFor="ownerEmail">Your Email</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm(prev => ({ ...prev, ownerEmail: e.target.value }))}
                  placeholder="Your email for replies (optional)"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Variables */}
        <div className="space-y-6">
          {selectedTemplate && selectedTemplate.variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Agreement Details
                </CardTitle>
                <CardDescription>
                  Fill in the template variables for this agreement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable.id}>
                    <Label htmlFor={variable.name}>
                      {variable.label}
                      {variable.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderVariableInput(variable)}
                    {variable.description && (
                      <p className="text-sm text-gray-500 mt-1">{variable.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Send Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleSend} 
                disabled={sending || !selectedTemplate}
                className="w-full"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Sending Agreement...' : 'Send Agreement'}
              </Button>
              
              {selectedTemplate && (
                <p className="text-sm text-gray-500 text-center mt-3">
                  The agreement will be sent to {form.prospectEmail || 'the prospect'} 
                  {form.expirationDays && ` and will expire in ${form.expirationDays} days`}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
