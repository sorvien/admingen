import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { AdminField } from '@sorvien/admingen-types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface PasswordFieldProps {
  field: AdminField
  fieldApi: any
  disabled?: boolean
}

export function PasswordField({ field, fieldApi, disabled }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex flex-col gap-2 text-white">
      <Label htmlFor={fieldApi.name} className="capitalize text-white">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative flex items-center">
        <Input
          id={fieldApi.name}
          name={fieldApi.name}
          type={showPassword ? 'text' : 'password'}
          placeholder={`Enter ${field.label}`}
          className="
            bg-[#111827] text-white border border-gray-700 
            rounded-md px-3 py-2 pr-10 shadow-sm
            placeholder-gray-400 placeholder-opacity-70
            focus:outline-none focus:ring-2 focus:ring-[#00eaff] focus:border-[#00eaff] 
            transition-colors duration-200 selection:bg-[#00eaff] selection:text-black w-full
          "
          value={fieldApi.state.value ?? ''}
          onBlur={fieldApi.handleBlur}
          onChange={(e) => fieldApi.handleChange(e.target.value)}
          disabled={field.readOnly || disabled}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-2.5 text-gray-400 hover:text-gray-200 focus:outline-none cursor-pointer p-1 rounded"
          title={showPassword ? 'Hide password' : 'Show password'}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
