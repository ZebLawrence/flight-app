import { FormBuilder } from './FormBuilder';
import type { FieldConfig } from './FormBuilder';

export interface ContactFormProps {
  recipientEmail?: string;
  submitLabel?: string;
  successMessage?: string;
  additionalFields?: FieldConfig[];
}

const DEFAULT_FIELDS: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'message', label: 'Message', type: 'textarea', required: true },
];

export function ContactForm({
  recipientEmail,
  submitLabel = 'Send Message',
  successMessage = 'Thank you for your message!',
  additionalFields = [],
}: ContactFormProps) {
  const recipientField: FieldConfig[] = recipientEmail
    ? [{ name: 'recipientEmail', label: 'Recipient Email', type: 'hidden' }]
    : [];
  const fields: FieldConfig[] = [...DEFAULT_FIELDS, ...recipientField, ...additionalFields];

  return (
    <FormBuilder
      formId="contact"
      fields={fields}
      submitLabel={submitLabel}
      successMessage={successMessage}
    />
  );
}
