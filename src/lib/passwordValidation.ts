 import { z } from 'zod';
 
 // Standardized password requirements across the application
 // Minimum 8 characters, at least one uppercase, one lowercase, one number
 export const passwordSchema = z.string()
   .min(8, 'Password must be at least 8 characters')
   .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
   .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
   .regex(/[0-9]/, 'Password must contain at least one number');
 
 export const validatePassword = (password: string): { valid: boolean; error?: string } => {
   try {
     passwordSchema.parse(password);
     return { valid: true };
   } catch (e) {
     if (e instanceof z.ZodError) {
       return { valid: false, error: e.errors[0].message };
     }
     return { valid: false, error: 'Invalid password' };
   }
 };
 
 export const PASSWORD_REQUIREMENTS = [
   'At least 8 characters',
   'At least one uppercase letter',
   'At least one lowercase letter',
   'At least one number',
 ];