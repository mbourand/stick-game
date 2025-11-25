import { RegisterForm } from "@/app/game/_components/RegisterButton/RegisterForm";
import { Modal } from "@/components/Modal";
import { useState } from "react";

export const RegisterButton = () => {
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);

  return (
    <>
      <button
        className="p-2 bg-white/20 hover:bg-white/50 active:bg-white/80 text-white transition-all"
        onClick={() => setIsRegisterModalVisible(true)}
      >
        Register
      </button>
      <Modal isVisible={isRegisterModalVisible} onClose={() => setIsRegisterModalVisible(false)}>
        <div className="w-[500px] p-4">
          <h1 className="text-xl font-semibold text-center">Create an account</h1>
          <RegisterForm />
        </div>
      </Modal>
    </>
  );
};
