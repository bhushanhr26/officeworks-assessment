import type { InputHTMLAttributes } from 'react';
import styles from './EnquiryForm.module.css';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  multiline?: boolean;
  value: string;
  onChange: (value: string) => void;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}

/** Label, input and error message, wired together with aria-describedby and aria-invalid. */
export function FormField({
  id,
  label,
  error,
  multiline,
  value,
  onChange,
  inputProps,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const shared = {
    id,
    name: id,
    value,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    className: styles.input,
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {multiline ? (
        <textarea
          {...shared}
          rows={5}
          maxLength={2000}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input {...shared} {...inputProps} onChange={(e) => onChange(e.target.value)} />
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
