import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Modal } from '@/components/cms/interactive/Modal';

afterEach(cleanup);

describe('Modal component', () => {
  it('renders trigger button with correct label text', () => {
    render(
      <Modal trigger={{ label: 'Open Modal' }}>
        <p>Modal body content</p>
      </Modal>
    );
    expect(screen.getByText('Open Modal')).not.toBeNull();
  });

  it('modal overlay/content is hidden on initial render', () => {
    const { container } = render(
      <Modal trigger={{ label: 'Open Modal' }}>
        <p>Modal body content</p>
      </Modal>
    );
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('style')).toContain('display: none');
  });

  it('modal content is present in DOM (for SSR)', () => {
    render(
      <Modal trigger={{ label: 'Open Modal' }}>
        <p>Modal body content</p>
      </Modal>
    );
    expect(screen.getByText('Modal body content')).not.toBeNull();
  });
});
