import { generateMnemonic } from 'ethereum-cryptography/bip39/index.js';
import { wordlist } from 'ethereum-cryptography/bip39/wordlists/english.js';
import { mnemonicToSeedSync } from 'ethereum-cryptography/bip39';
import { HDKey } from 'ethereum-cryptography/hdkey';
import { uint8ArrayToHex } from './converter';
import { privateKeyToAddress, privateKeyToPublicKey } from 'web3-eth-accounts';

/**
 * The function generates a random mnemonic phrase using a wordlist.
 * @returns The function `generateRandomMnemonic` is returning the result of calling another function
 * `generateMnemonic` with the `wordlist` parameter.
 */
export function generateRandomMnemonic() {
  return generateMnemonic(wordlist);
}

/**
 * The function `getAccountFromMnemonic` generates a private key, public key, and address from a given
 * mnemonic phrase.
 * @param {string} mnemonic - A mnemonic is a set of words used to generate a cryptographic key. It is
 * often used in cryptocurrency wallets as a way to easily backup and restore access to the wallet.
 * @returns The function `getAccountFromMnemonic` returns an object with three properties:
 * `privateKey`, `publicKey`, and `address`.
 */
export function getAccountFromMnemonic(mnemonic: string) {
  const seed = mnemonicToSeedSync(mnemonic);

  const hdWallet = HDKey.fromMasterSeed(seed);

  const privateKey = hdWallet.privateKey;
  const publicKey = privateKeyToPublicKey(privateKey, false);
  const address = privateKeyToAddress(privateKey);
  const privateKeyHex = uint8ArrayToHex(privateKey);

  return {
    privateKey: privateKeyHex,
    publicKey,
    address,
  };
}
