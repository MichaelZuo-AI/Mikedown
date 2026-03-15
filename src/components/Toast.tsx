import { useAppStore } from "@/store/appStore";

export default function Toast() {
  const message = useAppStore((s) => s.toastMessage);
  const visible = useAppStore((s) => s.toastVisible);
  const dismiss = useAppStore((s) => s.dismissToast);

  if (!visible) return null;

  return (
    <div className="toast" role="alert">
      <span className="toast-message">{message}</span>
      <button className="toast-dismiss" onClick={dismiss} aria-label="Dismiss">&#x2715;</button>
    </div>
  );
}
