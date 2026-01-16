import React from 'react';
import { Check, X } from 'lucide-react';
import {
  type PasswordValidation,
  getPasswordStrengthColor,
  getPasswordStrengthLabel
} from '@/lib/password-validation';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  validation: PasswordValidation | null;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  validation,
  className
}: PasswordStrengthIndicatorProps) {
  if (!password || !validation) {
    return null;
  }

  const requirements = [
    { text: 'At least 8 characters', met: password.length >= 8 },
    { text: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { text: 'One lowercase letter', met: /[a-z]/.test(password) },
    { text: 'One number', met: /[0-9]/.test(password) },
    { text: 'One special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const strengthColor = getPasswordStrengthColor(validation.strength);
  const strengthLabel = getPasswordStrengthLabel(validation.strength);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium',
            validation.strength === 'weak' && 'text-red-500',
            validation.strength === 'medium' && 'text-yellow-500',
            validation.strength === 'strong' && 'text-green-500'
          )}>
            {strengthLabel}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn(
              'h-full transition-all duration-300',
              strengthColor
            )}
            style={{
              width: validation.strength === 'weak' ? '33%' :
                     validation.strength === 'medium' ? '66%' : '100%'
            }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-xs"
          >
            {req.met ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={cn(
              req.met ? 'text-green-700' : 'text-muted-foreground'
            )}>
              {req.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
