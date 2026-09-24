import React from 'react'
import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import type { AdminSchema, AdminField } from '@sorvien/admingen-types'

// --- Shadcn Components ---
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// --- Data Fetching ---
async function fetchAdminSchema(): Promise<AdminSchema> {
  const res = await fetch('/admin/api/_schema', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch admin schema')
  return res.json()
}

async function fetchResourceItem(resourceName: string, id: string) {
  const res = await fetch(`/admin/api/${resourceName}/${id}`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to fetch ${resourceName} item ${id}`)
  return res.json()
}

// --- Route Definition ---
export const Route = createFileRoute('/$resource/$id')({
  component: EditComponent,
})

// Component for relationship field that can use hooks
function RelationshipField({
  field,
  fieldApi,
  getRelatedItemLabel,
}: {
  field: AdminField
  fieldApi: any
  getRelatedItemLabel: (item: any) => string
}) {
  const targetResource = field.relationTo

  const { data: response, isLoading } = useQuery({
    queryKey: ['relatedResource', targetResource],
    queryFn: async () => {
      if (!targetResource) return { data: [] }
      const res = await fetch(`/admin/api/${targetResource}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Failed to fetch ${targetResource}`)
      return res.json()
    },
    enabled: !!targetResource,
    staleTime: 60000,
  })

  const relatedData = response?.data || []

  return (
    <div className="flex flex-col gap-2 text-white">
      <Label htmlFor={fieldApi.name} className="capitalize text-white">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </Label>
      <Select
        value={fieldApi.state.value ? String(fieldApi.state.value) : ''}
        onValueChange={(value) => {
          const numValue = !isNaN(Number(value)) ? Number(value) : value
          fieldApi.handleChange(numValue)
        }}
        disabled={isLoading || field.readOnly}
      >
        <SelectTrigger id={fieldApi.name} className="w-full bg-[#111827] text-white border-gray-700">
          <SelectValue
            placeholder={isLoading ? 'Loading...' : `Select ${field.label}`}
          />
        </SelectTrigger>
        <SelectContent>
          {Array.isArray(relatedData) && relatedData.map((item: any) => {
            const itemId = item.id
            const itemLabel = getRelatedItemLabel(item)
            return (
              <SelectItem key={itemId} value={String(itemId)}>
                {itemLabel}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

function SelectField({
  field,
  fieldApi,
}: {
  field: AdminField
  fieldApi: any
}) {
  return (
    <div className="flex flex-col gap-2 text-white">
      <Label htmlFor={fieldApi.name} className="capitalize text-white">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </Label>
      <Select
        value={fieldApi.state.value ? String(fieldApi.state.value) : ''}
        onValueChange={(value) => {
          fieldApi.handleChange(value)
        }}
        disabled={field.readOnly}
      >
        <SelectTrigger id={fieldApi.name} className="w-full bg-[#111827] text-white border-gray-700">
          <SelectValue placeholder={`Select ${field.label}`} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function JsonField({
  field,
  fieldApi,
}: {
  field: AdminField
  fieldApi: any
}) {
  const [localValue, setLocalValue] = React.useState('')
  const [isError, setIsError] = React.useState(false)

  // Initialize and keep in sync with field value
  React.useEffect(() => {
    const val = fieldApi.state.value
    if (val && typeof val === 'object') {
      setLocalValue(JSON.stringify(val, null, 2))
    } else if (typeof val === 'string') {
      try {
        // Test if it's already a JSON string
        const parsed = JSON.parse(val)
        if (typeof parsed === 'object' && parsed !== null) {
          setLocalValue(JSON.stringify(parsed, null, 2))
        } else {
          setLocalValue(val)
        }
      } catch (e) {
        setLocalValue(val)
      }
    } else {
      setLocalValue(String(val ?? ''))
    }
  }, [fieldApi.state.value])

  const handleChange = (val: string) => {
    setLocalValue(val)
    try {
      if (val.trim() === '') {
        fieldApi.handleChange(null)
        setIsError(false)
        return
      }
      const parsed = JSON.parse(val)
      fieldApi.handleChange(parsed)
      setIsError(false)
    } catch (e) {
      // If it's invalid JSON, we still update the local value for typing,
      // but maybe we shouldn't update the field API or keep the string.
      // For JSONB columns, Drizzle/Postgres expects an object.
      setIsError(true)
    }
  }

  return (
    <div className="flex flex-col gap-2 text-white">
      <Label htmlFor={fieldApi.name} className="capitalize text-white">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </Label>
      <textarea
        id={fieldApi.name}
        name={fieldApi.name}
        placeholder={`Enter ${field.label} (JSON)`}
        className={`bg-[#111827] text-white border ${isError ? 'border-red-500' : 'border-gray-700'} rounded-md px-3 py-2 min-h-[150px] font-mono text-xs`}
        value={localValue}
        onBlur={fieldApi.handleBlur}
        onChange={(e) => handleChange(e.target.value)}
        disabled={field.readOnly}
      />
      {isError && <span className="text-xs text-red-500">Invalid JSON format</span>}
    </div>
  )
}

function TextareaField({
  field,
  fieldApi,
}: {
  field: AdminField
  fieldApi: any
}) {
  return (
    <div className="flex flex-col gap-2 text-white">
      <Label htmlFor={fieldApi.name} className="capitalize text-white">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </Label>
      <Textarea
        id={fieldApi.name}
        name={fieldApi.name}
        placeholder={`Enter ${field.label}`}
        className="bg-[#111827] text-white border border-gray-700 rounded-md px-3 py-2 min-h-[100px] placeholder-gray-400 placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-[#00eaff] focus:border-[#00eaff]"
        value={fieldApi.state.value ?? ''}
        onBlur={fieldApi.handleBlur}
        onChange={(e) => fieldApi.handleChange(e.target.value)}
        disabled={field.readOnly}
      />
    </div>
  )
}

// --- Main Component ---
function EditComponent() {
  const { resource: resourceName, id } = useParams({ from: '/$resource/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: schema, isLoading: schemaLoading } = useQuery({
    queryKey: ['adminSchema'],
    queryFn: fetchAdminSchema,
    staleTime: 60000,
  })

  const { data: itemData, isLoading: itemLoading } = useQuery({
    queryKey: ['resourceItem', resourceName, id],
    queryFn: () => fetchResourceItem(resourceName, id),
    enabled: !!resourceName && !!id,
  })

  const resource = React.useMemo(
    () => schema?.resources.find((r) => r.name === resourceName),
    [schema, resourceName],
  )

  const fields = React.useMemo(
    () => resource?.fields.filter((f) => !f.isId) ?? [],
    [resource],
  )

  // Helper to get display value for related items
  const getRelatedItemLabel = (item: any): string => {
    if (!item) return ''
    return (
      item.name || item.email || item.title || item.username || item.id || JSON.stringify(item)
    )
  }

  // 3. Setup the API Mutation
  const { mutate, isPending: isMutating } = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch(`/admin/api/${resourceName}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData),
        credentials: 'include'
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || `Failed to update ${resourceName}`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['resourceData', resourceName],
      })
      queryClient.invalidateQueries({
        queryKey: ['resourceItem', resourceName, id],
      })
      navigate({ to: '/$resource', params: { resource: resourceName } })
    },
    onError: (err) => {
      alert(`Error: ${err.message}`)
    },
  })

  // 4. Setup TanStack Form
  const form = useForm({
    defaultValues: React.useMemo(() => {
      if (!itemData) return {}
      const defaults: Record<string, any> = {}
      fields.forEach((field: AdminField) => {
        if (itemData[field.name] !== undefined) {
            // Handle relationship objects by extracting ID if needed
            if (field.type === 'relationship' && typeof itemData[field.name] === 'object' && itemData[field.name] !== null) {
                 // Try to find the foreign key value if available, or ID from the object
                 // Ideally the API returns the ID in the foreign key field, but let's be safe
                 // If the API returns { author: { id: 1, name: '...' } }, we want 1.
                 defaults[field.name] = itemData[field.name].id;
            } else {
                defaults[field.name] = itemData[field.name]
            }
        } else {
             if (field.type === 'relationship') {
                defaults[field.name] = undefined
              } else if (field.type === 'number') {
                defaults[field.name] = 0
              } else {
                defaults[field.name] = ''
              }
        }
      })
      return defaults
    }, [fields, itemData]),
    onSubmit: async ({ value }) => {
      mutate(value)
    },
  })

  if (schemaLoading || itemLoading) return <div className="p-6">Loading...</div>
  if (!resource) return <div className="p-6 text-red-500">Resource not found.</div>

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 text-white">
      <h1 className="text-3xl font-bold mb-8 capitalize text-white">
        Edit {resource.label}
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-6"
      >
        {fields.map((field: AdminField) => (
          <form.Field
            key={field.name}
            name={field.name}
            children={(fieldApi) => {
              
              if (field.type === 'relationship' && field.relationTo) {
                return (
                  <RelationshipField
                    field={field}
                    fieldApi={fieldApi}
                    getRelatedItemLabel={getRelatedItemLabel}
                  />
                )
              }

              if (field.type === 'select') {
                return (
                  <SelectField
                    field={field}
                    fieldApi={fieldApi}
                  />
                )
              }

              // RENDER REGULAR FIELDS
              const isObject = fieldApi.state.value && typeof fieldApi.state.value === 'object';
              
              if (field.type === 'json' || (isObject && field.type !== 'textarea')) {
                return (
                  <JsonField
                    field={field}
                    fieldApi={fieldApi}
                  />
                )
              }

              if (field.type === 'textarea') {
                return (
                  <TextareaField
                    field={field}
                    fieldApi={fieldApi}
                  />
                )
              }

              return (
                <div className="flex flex-col gap-2 text-white">
                  <Label htmlFor={fieldApi.name} className="capitalize text-white">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  {field.type === 'boolean' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={fieldApi.name}
                        checked={!!fieldApi.state.value}
                        onChange={(e) => fieldApi.handleChange(e.target.checked)}
                        disabled={field.readOnly}
                        className="w-4 h-4 rounded border-gray-700 bg-[#111827] text-[#00eaff] focus:ring-[#00eaff]"
                      />
                      <Label htmlFor={fieldApi.name}>Active</Label>
                    </div>
                  ) : (
                    <Input
                      id={fieldApi.name}
                      name={fieldApi.name}
                      placeholder={`Enter ${field.label}`}
                      className="
                        bg-[#111827] text-white border border-gray-700 
                        rounded-md px-3 py-2 shadow-sm
                        placeholder-gray-400 placeholder-opacity-70
                        focus:outline-none focus:ring-2 focus:ring-[#00eaff] focus:border-[#00eaff] 
                        transition-colors duration-200 selection:bg-[#00eaff] selection:text-black
                      "
                      value={fieldApi.state.value ?? ''}
                      onBlur={fieldApi.handleBlur}
                      onChange={(e) => {
                        const val = e.target.value
                        fieldApi.handleChange(
                          field.type === 'number'
                            ? val === '' ? '' : Number(val)
                            : val,
                        )
                      }}
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      disabled={field.readOnly}
                    />
                  )}
                </div>
              )
            }}
          />
        ))}

        <div className="pt-4">
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className={`
                  w-full py-2 px-4 rounded-md text-white font-medium 
                  bg-[#00eaff]/20 hover:bg-[#00eaff]/40 
                  border border-[#00eaff] 
                  focus:outline-none focus:ring-2 focus:ring-[#00eaff] focus:ring-offset-1
                  transition-all duration-200 cursor-pointer
                  ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}
                `}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          />
        </div>
      </form>
    </div>
  )
}
