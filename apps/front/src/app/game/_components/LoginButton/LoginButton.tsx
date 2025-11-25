import { LoginForm } from "@/app/game/_components/LoginButton/LoginForm";
import { Modal } from "@/components/Modal";
import { useState } from "react";

export const LoginButton = () => {
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);

  return (
    <>
      <button
        className="p-2 bg-white/20 hover:bg-white/50 active:bg-white/80 text-white transition-all"
        onClick={() => setIsLoginModalVisible(true)}
      >
        Login
      </button>
      <Modal isVisible={isLoginModalVisible} onClose={() => setIsLoginModalVisible(false)}>
        <div className="w-[500px] p-4">
          <h1 className="text-xl font-semibold text-center">Sign In</h1>
          <LoginForm />
        </div>
      </Modal>
    </>
  );
};
