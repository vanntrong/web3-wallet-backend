import { REGEX_CONTRACT_ADDRESS } from '@/constants/regex';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export function IsAddress(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: {
        message: "Invalid contract address must be '0x...' format",
        ...validationOptions,
      },
      validator: IsAddressConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'IsAddress' })
export class IsAddressConstraint implements ValidatorConstraintInterface {
  validate(value = '') {
    return REGEX_CONTRACT_ADDRESS.test(value);
  }
}
