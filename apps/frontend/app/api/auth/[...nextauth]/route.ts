import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "agustin-ferrazzano" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ username: credentials.username, password: credentials.password }),
            headers: { "Content-Type": "application/json" }
          });
          const user = await res.json();
          if (res.ok && user) {
            return {
              id: user.userId,
              name: user.displayName,
              email: credentials.username, // Using username as email fallback for credentials
              accessToken: user.accessToken,
              refreshToken: user.refreshToken,
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    })
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (account && user) {
        if (account.provider === "google") {
          // Register/Login Google user in backend
          try {
            const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
              method: 'POST',
              body: JSON.stringify({
                email: user.email,
                displayName: user.name,
                googleId: account.providerAccountId
              }),
              headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (res.ok && data) {
              return {
                ...token,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                userId: data.userId,
                // Access token expires in 15 mins (15 * 60 * 1000)
                accessTokenExpires: Date.now() + 15 * 60 * 1000,
              };
            }
          } catch (e) {
            console.error("Error authenticating google user with backend", e);
          }
        } else if (account.provider === "credentials") {
          return {
            ...token,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
            userId: user.id,
            accessTokenExpires: Date.now() + 15 * 60 * 1000,
          };
        }
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to update it
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          body: JSON.stringify({ refreshToken: token.refreshToken }),
          headers: { "Content-Type": "application/json" }
        });
        const refreshedTokens = await res.json();

        if (!res.ok) {
          throw refreshedTokens;
        }

        return {
          ...token,
          accessToken: refreshedTokens.accessToken,
          refreshToken: refreshedTokens.refreshToken ?? token.refreshToken, // Fall back to old refresh token
          accessTokenExpires: Date.now() + 15 * 60 * 1000,
        };
      } catch (error) {
        console.error("Error refreshing access token", error);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
    async session({ session, token }) {
      session.user = session.user || {};
      session.accessToken = token.accessToken as string;
      session.error = token.error as string;
      session.user.id = token.userId as string;
      return session;
    },
  },
  pages: {
    signIn: '/login', // Adjust if you have a custom login page route
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "super-secret-nextauth-key-for-dev",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
