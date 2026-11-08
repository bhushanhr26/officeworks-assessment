import type { Product } from '@catalogue/contracts';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage } from '../../api/error-message';
import { useSubmitEnquiry } from '../../api/queries';
import { FormField } from './FormField';
import { EMPTY_VALUES, ENQUIRY_FIELDS, validateEnquiry } from './enquiry-validation';
import type { EnquiryField, EnquiryValues, FieldErrors } from './enquiry-validation';
import styles from './EnquiryForm.module.css';

interface EnquiryFormProps {
  product: Product;
  onSubmitted: (email: string) => void;
}

export function EnquiryForm({ product, onSubmitted }: EnquiryFormProps) {
  const [values, setValues] = useState<EnquiryValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  // Honeypot: hidden from people and assistive tech. Only bots fill it in.
  const [website, setWebsite] = useState('');
  const submit = useSubmitEnquiry();

  const setField = (field: EnquiryField) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateEnquiry(values, product.id, website);
    if (!result.ok) {
      setErrors(result.errors);
      const firstInvalid = ENQUIRY_FIELDS.find((field) => result.errors[field]);
      if (firstInvalid) document.getElementById(`enquiry-${firstInvalid}`)?.focus();
      return;
    }
    submit.mutate(result.payload, { onSuccess: () => onSubmitted(values.email.trim()) });
  }

  const fieldProps = (field: EnquiryField) => ({
    id: `enquiry-${field}`,
    value: values[field],
    error: errors[field],
    onChange: setField(field),
  });

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormField
        {...fieldProps('name')}
        label="Name"
        inputProps={{ autoComplete: 'name', maxLength: 100 }}
      />
      <FormField
        {...fieldProps('email')}
        label="Email"
        inputProps={{ type: 'email', autoComplete: 'email', maxLength: 254 }}
      />
      <FormField
        {...fieldProps('phone')}
        label="Phone (optional)"
        inputProps={{ type: 'tel', autoComplete: 'tel', maxLength: 20 }}
      />
      <FormField {...fieldProps('message')} label="Message" multiline />

      <div className="offscreen" aria-hidden="true">
        <label htmlFor="enquiry-website">Website</label>
        <input
          id="enquiry-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {submit.isError && (
        <p className={styles.submitError} role="alert">
          {errorMessage(submit.error)}
        </p>
      )}

      <button type="submit" className="button" disabled={submit.isPending}>
        {submit.isPending ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  );
}
