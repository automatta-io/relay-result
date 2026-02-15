import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useContext } from 'react';

import {
  MutationResultContext,
  MutationResultProvider,
  type MutationResultContextValue,
} from './MutationResultProvider';

const ContextConsumer = () => {
  const ctx = useContext(MutationResultContext);
  return (
    <div>
      <span data-testid="has-on-error">{String(!!ctx.onError)}</span>
      <span data-testid="has-on-graphql-error">
        {String(!!ctx.onGraphqlError)}
      </span>
    </div>
  );
};

describe('MutationResultProvider', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders children', () => {
    render(
      <MutationResultProvider>
        <div data-testid="child">Hello</div>
      </MutationResultProvider>,
    );

    expect(screen.getByTestId('child')).toBeDefined();
    expect(screen.getByTestId('child').textContent).toBe('Hello');
  });

  it('provides onError through context', () => {
    const onError = () => {};

    render(
      <MutationResultProvider onError={onError}>
        <ContextConsumer />
      </MutationResultProvider>,
    );

    expect(screen.getByTestId('has-on-error').textContent).toBe('true');
  });

  it('provides onGraphqlError through context', () => {
    const onGraphqlError = () => {};

    render(
      <MutationResultProvider onGraphqlError={onGraphqlError}>
        <ContextConsumer />
      </MutationResultProvider>,
    );

    expect(screen.getByTestId('has-on-graphql-error').textContent).toBe(
      'true',
    );
  });

  it('provides both handlers through context', () => {
    render(
      <MutationResultProvider
        onError={() => {}}
        onGraphqlError={() => {}}
      >
        <ContextConsumer />
      </MutationResultProvider>,
    );

    expect(screen.getByTestId('has-on-error').textContent).toBe('true');
    expect(screen.getByTestId('has-on-graphql-error').textContent).toBe(
      'true',
    );
  });

  it('defaults to empty context when no handlers provided', () => {
    render(
      <MutationResultProvider>
        <ContextConsumer />
      </MutationResultProvider>,
    );

    expect(screen.getByTestId('has-on-error').textContent).toBe('false');
    expect(screen.getByTestId('has-on-graphql-error').textContent).toBe(
      'false',
    );
  });

  it('has empty default context value when used outside provider', () => {
    render(<ContextConsumer />);

    expect(screen.getByTestId('has-on-error').textContent).toBe('false');
    expect(screen.getByTestId('has-on-graphql-error').textContent).toBe(
      'false',
    );
  });
});
