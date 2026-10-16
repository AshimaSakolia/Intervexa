import { Transform } from 'class-transformer';
import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

/** bcrypt only uses the first 72 *bytes*, so multibyte passwords must be capped by bytes. */
export function MaxBytes(max: number, options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'maxBytes',
      target: object.constructor,
      propertyName,
      options: {
        message: `$property must be at most ${max} bytes`,
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max,
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be at most ${max} bytes`,
      },
    });
}
