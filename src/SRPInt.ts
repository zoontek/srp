import { modPow } from "bigint-mod-arith";
import { getRandomValues } from "./crypto";
import { bufferToHex } from "./utils";

const bi = Symbol("big-int");

const WHITESPACE_RE = /\s+/g;

export class SRPInt {
  [bi]: bigint;

  constructor(
    bigInt: bigint,
    public hexLength: number | null,
  ) {
    this[bi] = bigInt;
  }

  static ZERO = new SRPInt(0n, null);

  static fromHex(hex: string): SRPInt {
    const sanitized = hex.replace(WHITESPACE_RE, "");
    return new SRPInt(BigInt(`0x${sanitized}`), sanitized.length);
  }

  static getRandom(bytes: number): SRPInt {
    const array = new Uint8Array(bytes);
    getRandomValues(array);
    return SRPInt.fromHex(bufferToHex(array));
  }

  add(value: SRPInt): SRPInt {
    return new SRPInt(this[bi] + value[bi], null);
  }

  equals(value: SRPInt): boolean {
    return this[bi] === value[bi];
  }

  mod(modulus: SRPInt): SRPInt {
    return new SRPInt(this[bi] % modulus[bi], modulus.hexLength);
  }

  modPow(exponent: SRPInt, modulus: SRPInt): SRPInt {
    const b = this[bi];
    const e = exponent[bi];
    const m = modulus[bi];

    return new SRPInt(modPow(b, e, m), modulus.hexLength);
  }

  multiply(value: SRPInt): SRPInt {
    return new SRPInt(this[bi] * value[bi], null);
  }

  pad(paddedHexLength: number): SRPInt {
    if (this.hexLength !== null && paddedHexLength < this.hexLength) {
      throw new Error("Cannot pad to a shorter length");
    }

    return new SRPInt(this[bi], paddedHexLength);
  }

  subtract(value: SRPInt): SRPInt {
    return new SRPInt(this[bi] - value[bi], this.hexLength);
  }

  toHex(): string {
    if (this.hexLength === null) {
      throw new Error("This SRPInt has no specified length");
    }

    return this[bi].toString(16).padStart(this.hexLength, "0");
  }

  xor(value: SRPInt): SRPInt {
    return new SRPInt(this[bi] ^ value[bi], this.hexLength);
  }
}
