import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export function Mnemonic(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: {
        ...validationOptions,
        message: 'Invalid mnemonic must be at least 12 words',
      },
      validator: MnemonicConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'Mnemonic' })
export class MnemonicConstraint implements ValidatorConstraintInterface {
  validate(value = '', args: ValidationArguments) {
    const valueSplit = value.split(' ');
    return valueSplit.length >= 12;
  }
}
