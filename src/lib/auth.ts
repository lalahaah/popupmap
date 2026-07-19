import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        if (
          credentials.email === process.env.ADMIN_EMAIL &&
          bcrypt.compareSync(credentials.password as string, process.env.ADMIN_PASSWORD_HASH as string)
        ) {
          return { id: "admin", email: credentials.email as string, name: "Admin" };
        }

        return null;
      }
    })
  ],
  pages: {
    signIn: "/admin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminPath = nextUrl.pathname.startsWith("/admin");
      // Allow access to /admin (login page) itself regardless, but actually middleware handles this better if we do it there,
      // or we can handle it here:
      if (isAdminPath) {
        if (nextUrl.pathname === "/admin") {
          return true; // allow access to login page
        }
        return isLoggedIn; // protect other /admin/* routes
      }
      return true;
    },
  },
});
