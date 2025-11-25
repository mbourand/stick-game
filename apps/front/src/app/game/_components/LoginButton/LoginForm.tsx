import { useLogin } from "@/modules/auth/useLogin";

export const LoginForm = () => {
  const login = useLogin();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate({
          username: (e.target as any).username.value,
          password: (e.target as any).password.value,
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <label>Username:</label>
        <input className="text-black" type="text" name="username" required />
      </div>
      <div className="flex flex-col gap-2">
        <label>Password:</label>
        <input className="text-black" type="password" name="password" required />
      </div>
      <button
        type="submit"
        className="mt-4 p-2 bg-white/20 hover:bg-white/50 active:bg-white/80 text-white transition-all"
      >
        Sign In
      </button>
    </form>
  );
};
