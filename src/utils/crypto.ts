import * as crypto from 'crypto';

export const validateSignature = (
  signature: string,
  message: string,
  publicKey: string,
) => {
  const verifier = crypto.createVerify('sha512');
  verifier.update(message);
  return verifier.verify(publicKey, signature, 'base64');
};
