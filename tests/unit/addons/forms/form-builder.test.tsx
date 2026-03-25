import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { FormBuilder } from '@/lib/addons/forms/components/FormBuilder';
import type { FieldConfig } from '@/lib/addons/forms/components/FormBuilder';

afterEach(cleanup);

const baseFields: FieldConfig[] = [
  { name: 'firstName', label: 'First Name', type: 'text' },
  { name: 'email', label: 'Email Address', type: 'email' },
];

describe('FormBuilder component', () => {
  // Test 1: Renders a <form> element
  it('renders a <form> element', () => {
    const { container } = render(
      <FormBuilder
        formId="contact"
        fields={baseFields}
        submitLabel="Send"
        successMessage="Thank you!"
      />,
    );
    expect(container.querySelector('form')).not.toBeNull();
  });

  // Test 2: Renders input fields matching the fields prop
  it('renders input fields matching the fields prop', () => {
    render(
      <FormBuilder
        formId="contact"
        fields={baseFields}
        submitLabel="Send"
        successMessage="Thank you!"
      />,
    );
    expect(screen.getByLabelText('First Name')).not.toBeNull();
    expect(screen.getByLabelText('Email Address')).not.toBeNull();
  });

  // Test 3: Required fields have the required attribute
  it('required fields have the required attribute', () => {
    const fields: FieldConfig[] = [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'notes', label: 'Notes', type: 'text', required: false },
    ];
    render(
      <FormBuilder
        formId="contact"
        fields={fields}
        submitLabel="Send"
        successMessage="Done!"
      />,
    );
    expect(screen.getByLabelText('Name')).toHaveAttribute('required');
    expect(screen.getByLabelText('Notes')).not.toHaveAttribute('required');
  });

  // Test 4: Submit button displays submitLabel text
  it('submit button displays submitLabel text', () => {
    render(
      <FormBuilder
        formId="contact"
        fields={baseFields}
        submitLabel="Subscribe Now"
        successMessage="Done!"
      />,
    );
    expect(screen.getByRole('button', { name: 'Subscribe Now' })).not.toBeNull();
  });

  // Test 5: Renders correct input type per field config
  it('renders correct input type per field config', () => {
    const fields: FieldConfig[] = [
      { name: 'fullName', label: 'Full Name', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'tel' },
    ];
    render(
      <FormBuilder
        formId="multi"
        fields={fields}
        submitLabel="Go"
        successMessage="Done!"
      />,
    );
    expect(screen.getByLabelText('Full Name')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Phone')).toHaveAttribute('type', 'tel');
  });

  // Test 6: select type renders <select> with <option> elements from options prop
  it('select type renders <select> with <option> elements from options prop', () => {
    const fields: FieldConfig[] = [
      {
        name: 'country',
        label: 'Country',
        type: 'select',
        options: ['USA', 'Canada', 'Mexico'],
      },
    ];
    const { container } = render(
      <FormBuilder
        formId="survey"
        fields={fields}
        submitLabel="Submit"
        successMessage="Done!"
      />,
    );
    const select = container.querySelector('select');
    expect(select).not.toBeNull();
    const options = container.querySelectorAll('option');
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe('USA');
    expect(options[1].textContent).toBe('Canada');
    expect(options[2].textContent).toBe('Mexico');
  });

  // Test 7: placeholder prop applies to text/email/tel/textarea fields
  it('placeholder prop applies to text/email/tel/textarea fields', () => {
    const fields: FieldConfig[] = [
      { name: 'name', label: 'Name', type: 'text', placeholder: 'Enter your name' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
      { name: 'phone', label: 'Phone', type: 'tel', placeholder: '555-1234' },
      { name: 'bio', label: 'Bio', type: 'textarea', placeholder: 'Tell us about yourself' },
    ];
    render(
      <FormBuilder
        formId="profile"
        fields={fields}
        submitLabel="Save"
        successMessage="Saved!"
      />,
    );
    expect(screen.getByLabelText('Name')).toHaveAttribute('placeholder', 'Enter your name');
    expect(screen.getByLabelText('Email')).toHaveAttribute('placeholder', 'you@example.com');
    expect(screen.getByLabelText('Phone')).toHaveAttribute('placeholder', '555-1234');
    expect(screen.getByLabelText('Bio')).toHaveAttribute('placeholder', 'Tell us about yourself');
  });

  // Test 8: hidden type renders <input type="hidden">
  it('hidden type renders <input type="hidden">', () => {
    const fields: FieldConfig[] = [
      { name: 'source', label: 'Source', type: 'hidden' },
    ];
    const { container } = render(
      <FormBuilder
        formId="track"
        fields={fields}
        submitLabel="Submit"
        successMessage="Done!"
      />,
    );
    const hiddenInput = container.querySelector('input[type="hidden"]');
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput?.getAttribute('name')).toBe('source');
  });

  // Bonus: shows success message after successful API response
  it('shows successMessage after successful submission', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { container } = render(
      <FormBuilder
        formId="contact"
        fields={baseFields}
        submitLabel="Send"
        successMessage="Thank you for reaching out!"
      />,
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Thank you for reaching out!')).not.toBeNull();
    });
  });
});
