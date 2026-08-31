import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { PasswordPolicy } from '../services/password-policy.service';

const SPECIAL_PATTERN = /[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/\\`~]/;

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

export function policyRequirementKeys(policy: PasswordPolicy): string[] {
  const keys: string[] = ['settings.passwordPolicy.reqMinLength'];
  if (policy.requireUppercase) {
    keys.push('settings.passwordPolicy.reqUppercase');
  }
  if (policy.requireLowercase) {
    keys.push('settings.passwordPolicy.reqLowercase');
  }
  if (policy.requireDigit) {
    keys.push('settings.passwordPolicy.reqDigit');
  }
  if (policy.requireSpecial) {
    keys.push('settings.passwordPolicy.reqSpecial');
  }
  return keys;
}
