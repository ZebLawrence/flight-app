import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ContactForm } from '@/lib/addons/forms/components/ContactForm';
import type { FieldConfig } from '@/lib/addons/forms/components/FormBuilder';

afterEach(cleanup);

describe('ContactForm component', () => {
  it('renders name, email, and message fields by default', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText('Name')).not.toBeNull();
    expect(screen.getByLabelText('Email')).not.toBeNull();
    expect(screen.getByLabelText('Message')).not.toBeNull();
  });

  it('additionalFields appends extra fields after defaults', () => {
    const extra: FieldConfig[] = [
      { name: 'phone', label: 'Phone', type: 'tel' },
    ];
    const { container } = render(<ContactForm additionalFields={extra} />);
    const labels = Array.from(container.querySelectorAll('label')).map(
      (l) => l.textContent,
    );
    expect(labels).toEqual(['Name', 'Email', 'Message', 'Phone']);
  });

  it('passes through submitLabel and successMessage to FormBuilder', () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(
      <ContactForm
        submitLabel="Contact Us"
        successMessage="We will be in touch!"
      />,
    );
    expect(screen.getByRole('button', { name: 'Contact Us' })).not.toBeNull();
  });
});
