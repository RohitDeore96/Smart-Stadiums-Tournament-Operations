/**
 * @file apps/web/tests/ChatPanel.test.tsx
 * @description Component test for ChatPanel — verifies rendering, input,
 *   and send button states.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../src/context/I18nContext';
import { ChatPanel } from '../src/components/ChatPanel';
import type { ReactNode } from 'react';

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe('ChatPanel', () => {
  it('renders the welcome message when no messages exist', () => {
    render(
      <Wrapper>
        <ChatPanel />
      </Wrapper>,
    );
    // The welcome text contains part of the welcome message
    expect(screen.getByText(/Hi! I'm your stadium assistant/i)).toBeInTheDocument();
  });

  it('renders a textarea for input', () => {
    render(
      <Wrapper>
        <ChatPanel />
      </Wrapper>,
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('disables the send button when input is empty', () => {
    render(
      <Wrapper>
        <ChatPanel />
      </Wrapper>,
    );
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('renders the chat panel with role=log for screen readers', () => {
    render(
      <Wrapper>
        <ChatPanel />
      </Wrapper>,
    );
    expect(screen.getByRole('log')).toBeInTheDocument();
  });
});
