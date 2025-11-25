import { useRegister } from "@/modules/auth/useRegister";

export const RegisterForm = () => {
  const register = useRegister();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        register.mutate({
          username: (e.target as any).username.value,
          email: (e.target as any).email.value,
          password: (e.target as any).password.value,
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <label>Username:</label>
        <input className="text-black" type="text" name="username" required />
      </div>
      <div className="flex flex-col gap-2">
        <label>Email:</label>
        <input className="text-black" type="email" name="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <label>Password:</label>
        <input className="text-black" type="password" name="password" required />
      </div>
      <button
        type="submit"
        className="mt-4 p-2 bg-white/20 hover:bg-white/50 active:bg-white/80 text-white transition-all"
      >
        Sign Up
      </button>
    </form>
  );
};
