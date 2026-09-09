import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '../../components/primitives';

export const Field = forwardRef<HTMLInputElement, { label: string } & InputHTMLAttributes<HTMLInputElement>>(
  function Field({ label, id, ...props }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <label htmlFor={inputId} className="block">
        <span className="mb-1.5 block text-sm font-medium text-brame-dark dark:text-gray-200">{label}</span>
        <Input id={inputId} ref={ref} {...props} />
      </label>
    );
  }
);

export const PasswordField = forwardRef<
  HTMLInputElement,
  { label: string } & InputHTMLAttributes<HTMLInputElement>
>(function PasswordField({ label, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-brame-dark dark:text-gray-200">{label}</span>
      <div className="relative">
        <Input id={inputId} ref={ref} type={visible ? 'text' : 'password'} className="pr-10" {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
});
