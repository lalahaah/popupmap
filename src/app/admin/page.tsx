import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export default function AdminLoginPage() {
  async function authenticate(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin/submissions",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        // Simple error handling, ideally we would pass state back
        // but NextAuth handles redirects automatically for errors too if configured.
      }
      throw error;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-ink text-center">관리자 로그인</h1>
        <form action={authenticate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1" htmlFor="email">이메일</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required
              className="w-full rounded border px-3 py-2 text-ink focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1" htmlFor="password">비밀번호</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required
              className="w-full rounded border px-3 py-2 text-ink focus:border-ink focus:outline-none"
            />
          </div>
          <button 
            type="submit"
            className="w-full rounded bg-ink px-4 py-2 font-bold text-white hover:bg-ink/90 mt-4"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
