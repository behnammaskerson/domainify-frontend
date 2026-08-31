import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { PasswordPolicy } from '../services/password-policy.service';

const SPECIAL_PATTERN = /[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/\\`~]/;

export type PolicyCheckId = 'minLength' | 'uppercase' | 'lowercase' | 'digit' | 'special';

export interface PasswordPolicyCheck {
  id: PolicyCheckId;
  label: string;
  met: boolean;
}

export function passwordMeetsPolicy(password: string, policy: PasswordPolicy): ValidationErrors | null {
  if (!password) {
    return null;
  }
  if (password.length < policy.minLength) {
    return { policyMinLength: { requiredLength: policy.minLength } };
  }
  if (password.length > policy.maxLength) {
    return { policyMaxLength: { requiredLength: policy.maxLength } };
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return { policyUppercase: true };
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    return { policyLowercase: true };
  }
  if (policy.requireDigit && !/\d/.test(password)) {
    return { policyDigit: true };
  }
  if (policy.requireSpecial && !SPECIAL_PATTERN.test(password)) {
    return { policySpecial: true };
  }
  return null;
}

export function passwordPolicyValidator(policy: PasswordPolicy): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    passwordMeetsPolicy(String(control.value ?? ''), policy);
}

export function buildPasswordValidators(policy: PasswordPolicy | null | undefined): ValidatorFn[] {
  if (!policy) {
    return [Validators.required, Validators.minLength(8)];
  }
  return [Validators.required, passwordPolicyValidator(policy)];
}

export function isPolicyCheckMet(id: PolicyCheckId, password: string, policy: PasswordPolicy): boolean {
  switch (id) {
    case 'minLength':
      return password.length >= policy.minLength;
    case 'uppercase':
      return /[A-Z]/.test(password);
    case 'lowercase':
      return /[a-z]/.test(password);
    case 'digit':
      return /\d/.test(password);
    case 'special':
      return SPECIAL_PATTERN.test(password);
    default:
      return false;
  }
}

/** Build checklist rows for the active policy; `met` reflects the current password. */
export function buildPasswordPolicyChecks(
  policy: PasswordPolicy,
  password: string,
  labels: Partial<Record<PolicyCheckId, string>>
): PasswordPolicyCheck[] {
  const checks: PasswordPolicyCheck[] = [
    {
      id: 'minLength',
      label: labels.minLength ?? '',
      met: isPolicyCheckMet('minLength', password, policy)
    }
  ];
  if (policy.requireUppercase) {
    checks.push({
      id: 'uppercase',
      label: labels.uppercase ?? '',
      met: isPolicyCheckMet('uppercase', password, policy)
    });
  }
  if (policy.requireLowercase) {
    checks.push({
      id: 'lowercase',
      label: labels.lowercase ?? '',
      met: isPolicyCheckMet('lowercase', password, policy)
    });
  }
  if (policy.requireDigit) {
    checks.push({
      id: 'digit',
      label: labels.digit ?? '',
      met: isPolicyCheckMet('digit', password, policy)
    });
  }
  if (policy.requireSpecial) {
    checks.push({
      id: 'special',
      label: labels.special ?? '',
      met: isPolicyCheckMet('special', password, policy)
    });
  }
  return checks;
}

/** 0–4 strength score aligned with register form heuristics, using policy min length. */
export function calculatePasswordStrength(password: string, minLength = 8): number {
  if (!password) {
    return 0;
  }
  let strength = 0;
  if (password.length >= minLength) strength++;
  if (password.length >= minLength + 4) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return Math.min(strength, 4);
}
