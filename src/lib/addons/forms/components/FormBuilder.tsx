'use client';

import { useState } from 'react';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'hidden';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  validation?: object;
}

export interface FormBuilderProps {
  formId: string;
  fields: FieldConfig[];
  submitLabel: string;
  successMessage: string;
}

export function FormBuilder({ formId, fields, submitLabel, successMessage }: FormBuilderProps) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.type === 'checkbox') {
        data[field.name] = formData.get(field.name) === 'on';
      } else {
        data[field.name] = formData.get(field.name);
      }
    }

    try {
      const res = await fetch(`/api/addons/forms/${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const json = await res.json();
        setError(json.error ?? 'Submission failed.');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    }
  }

  if (submitted) {
    return <p>{successMessage}</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {fields.map((field) => {
        if (field.type === 'hidden') {
          return <input key={field.name} type="hidden" name={field.name} />;
        }

        if (field.type === 'textarea') {
          return (
            <div key={field.name}>
              <label htmlFor={field.name}>{field.label}</label>
              <textarea
                id={field.name}
                name={field.name}
                required={field.required}
                placeholder={field.placeholder}
              />
            </div>
          );
        }

        if (field.type === 'select') {
          return (
            <div key={field.name}>
              <label htmlFor={field.name}>{field.label}</label>
              <select id={field.name} name={field.name} required={field.required}>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === 'checkbox') {
          return (
            <div key={field.name}>
              <label htmlFor={field.name}>{field.label}</label>
              <input
                id={field.name}
                type="checkbox"
                name={field.name}
                required={field.required}
              />
            </div>
          );
        }

        return (
          <div key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            <input
              id={field.name}
              type={field.type}
              name={field.name}
              required={field.required}
              placeholder={field.placeholder}
            />
          </div>
        );
      })}

      {error && <p role="alert">{error}</p>}

      <button type="submit">{submitLabel}</button>
    </form>
  );
}
