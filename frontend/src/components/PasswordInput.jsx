import { useState } from "react";
import { Eye, EyeOff } from "./icons";

export function PasswordInput({ className = "form-input", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        {...props}
        className={className}
        type={visible ? "text" : "password"}
      />
      <button
        type="button"
        className="password-visibility-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
