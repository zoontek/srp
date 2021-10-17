import { getParams } from "./params";
import { SRPInt } from "./SRPInt";
import { Ephemeral, Session } from "./types";

export const createSRPClient = (...args: Parameters<typeof getParams>) => {
  const { N, g, k, H, PAD, hashBytes } = getParams(...args);

  return {
    generateSalt: (): string => {
      const s = SRPInt.getRandom(hashBytes); // User's salt
      return s.toHex();
    },

    derivePrivateKey: async (
      salt: string,
      username: string,
      password: string,
    ): Promise<string> => {
      const s = SRPInt.fromHex(salt); // User's salt
      const I = String(username); // Username
      const p = String(password); // Cleartext Password

      // x = H(s, H(I | ':' | p))  (s is chosen randomly)
      const x = await H(s, await H(`${I}:${p}`));
      return x.toHex();
    },

    deriveVerifier: (privateKey: string): string => {
      const x = SRPInt.fromHex(privateKey); // Private key (derived from p and s)

      // v = g^x  (computes password verifier)
      const v = g.modPow(x, N);
      return v.toHex();
    },

    generateEphemeral: (): Ephemeral => {
      const a = SRPInt.getRandom(hashBytes);

      // A = g^a  (a = random number)
      const A = g.modPow(a, N);

      return {
        secret: a.toHex(),
        public: A.toHex(),
      };
    },

    deriveSession: async (
      clientSecretEphemeral: string,
      serverPublicEphemeral: string,
      salt: string,
      username: string,
      privateKey: string,
    ): Promise<Session> => {
      const a = SRPInt.fromHex(clientSecretEphemeral); // Secret ephemeral values
      const B = SRPInt.fromHex(serverPublicEphemeral); // Public ephemeral values
      const s = SRPInt.fromHex(salt); // User's salt
      const I = String(username); // Username
      const x = SRPInt.fromHex(privateKey); // Private key (derived from p and s)

      // A = g^a  (a = random number)
      const A = g.modPow(a, N);

      // B % N > 0
      if (B.mod(N).equals(SRPInt.ZERO)) {
        // fixme: .code, .statusCode, etc.
        throw new Error("The server sent an invalid public ephemeral");
      }

      // u = H(PAD(A), PAD(B))
      const u = await H(PAD(A), PAD(B));

      // S = (B - kg^x) ^ (a + ux)
      const S = B.subtract((await k).multiply(g.modPow(x, N))).modPow(
        a.add(u.multiply(x)),
        N,
      );

      // K = H(S)
      const K = await H(S);

      // M = H(H(N) xor H(g), H(I), s, A, B, K)
      const M = await H((await H(N)).xor(await H(g)), await H(I), s, A, B, K);

      return {
        key: K.toHex(),
        proof: M.toHex(),
      };
    },

    verifySession: async (
      clientPublicEphemeral: string,
      clientSession: Session,
      serverSessionProof: string,
    ): Promise<void> => {
      const A = SRPInt.fromHex(clientPublicEphemeral); // Public ephemeral values
      const M = SRPInt.fromHex(clientSession.proof); // Proof of K
      const K = SRPInt.fromHex(clientSession.key); // Shared, strong session key

      // H(A, M, K)
      const expected = await H(A, M, K);
      const actual = SRPInt.fromHex(serverSessionProof);

      if (!actual.equals(expected)) {
        // fixme: .code, .statusCode, etc.
        throw new Error("Server provided session proof is invalid");
      }
    },
  };
};
