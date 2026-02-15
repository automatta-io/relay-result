import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { MutationResultProvider } from './MutationResultProvider';
import { useMutationResult } from './useMutationResult';

const mockExecute = vi.fn();
let mockIsPending = false;

vi.mock('react-relay', () => ({
  useMutation: () => [mockExecute, mockIsPending],
}));

const MOCK_MUTATION = {} as never;

type TestMutation = {
  variables: { input: { email: string } };
  response: {
    createUser:
      | { readonly __typename: 'createUserSuccess'; userId: string }
      | { readonly __typename: 'createUserError'; message: string }
      | { readonly __typename: '%other' };
  };
};

const createWrapper =
  (
    props: {
      onError?: (result: { __typename: string }) => void;
      onGraphqlError?: (error: Error) => void;
    } = {},
  ) =>
  ({ children }: { children: ReactNode }) => (
    <MutationResultProvider {...props}>{children}</MutationResultProvider>
  );

describe('useMutationResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it('returns an execute function and isPending flag', () => {
    const { result } = renderHook(
      () =>
        useMutationResult<TestMutation, 'createUser'>({
          mutation: MOCK_MUTATION,
          name: 'createUser',
        }),
      { wrapper: createWrapper() },
    );

    const [execute, isPending] = result.current;
    expect(typeof execute).toBe('function');
    expect(isPending).toBe(false);
  });

  it('reflects isPending from useMutation', () => {
    mockIsPending = true;

    const { result } = renderHook(
      () =>
        useMutationResult<TestMutation, 'createUser'>({
          mutation: MOCK_MUTATION,
          name: 'createUser',
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current[1]).toBe(true);
  });

  it('calls relay execute when the returned execute function is called', () => {
    const { result } = renderHook(
      () =>
        useMutationResult<TestMutation, 'createUser'>({
          mutation: MOCK_MUTATION,
          name: 'createUser',
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current[0]({
        variables: { input: { email: 'test@test.com' } },
      });
    });

    expect(mockExecute).toHaveBeenCalledOnce();
  });

  describe('onCompleted - success path', () => {
    it('calls hook-level onSuccess for a success result', () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
            onSuccess,
          }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      call.onCompleted({
        createUser: {
          __typename: 'createUserSuccess',
          userId: 'user-1',
        },
      });

      expect(onSuccess).toHaveBeenCalledWith({
        __typename: 'createUserSuccess',
        userId: 'user-1',
      });
    });

    it('calls execute-level onSuccess for a success result', () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
          }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
          onSuccess,
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      call.onCompleted({
        createUser: {
          __typename: 'createUserSuccess',
          userId: 'user-1',
        },
      });

      expect(onSuccess).toHaveBeenCalledWith({
        __typename: 'createUserSuccess',
        userId: 'user-1',
      });
    });

    it('calls both hook-level and execute-level onSuccess', () => {
      const hookOnSuccess = vi.fn();
      const execOnSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
            onSuccess: hookOnSuccess,
          }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
          onSuccess: execOnSuccess,
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      call.onCompleted({
        createUser: {
          __typename: 'createUserSuccess',
          userId: 'user-1',
        },
      });

      expect(hookOnSuccess).toHaveBeenCalledOnce();
      expect(execOnSuccess).toHaveBeenCalledOnce();
    });
  });

  describe('onCompleted - error path', () => {
    it('calls hook-level onError for an error result', () => {
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
            onError,
          }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      call.onCompleted({
        createUser: {
          __typename: 'createUserError',
          message: 'Something failed',
        },
      });

      expect(onError).toHaveBeenCalledWith({
        __typename: 'createUserError',
        message: 'Something failed',
      });
    });

    it('falls back to execute-level onError when no hook-level onError', () => {
      const execOnError = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
          }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
          onError: execOnError,
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      call.onCompleted({
        createUser: {
          __typename: 'createUserError',
          message: 'Something failed',
        },
      });

      expect(execOnError).toHaveBeenCalledWith({
        __typename: 'createUserError',
        message: 'Something failed',
      });
    });

    it('falls back to context onError when no hook or execute-level onError', () => {
      const contextOnError = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
          }),
        { wrapper: createWrapper({ onError: contextOnError }) },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      call.onCompleted({
        createUser: {
          __typename: 'createUserError',
          message: 'Something failed',
        },
      });

      expect(contextOnError).toHaveBeenCalledWith({
        __typename: 'createUserError',
        message: 'Something failed',
      });
    });

    it('hook-level onError takes priority over execute-level and context', () => {
      const hookOnError = vi.fn();
      const execOnError = vi.fn();
      const contextOnError = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
            onError: hookOnError,
          }),
        { wrapper: createWrapper({ onError: contextOnError }) },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
          onError: execOnError,
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      call.onCompleted({
        createUser: {
          __typename: 'createUserError',
          message: 'Something failed',
        },
      });

      expect(hookOnError).toHaveBeenCalledOnce();
      expect(execOnError).not.toHaveBeenCalled();
      expect(contextOnError).not.toHaveBeenCalled();
    });
  });

  describe('onError - GraphQL error path', () => {
    it('calls execute-level onGraphqlError for a GraphQL error', () => {
      const onGraphqlError = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
          }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
          onGraphqlError,
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      const error = new Error('Network error');
      call.onError(error);

      expect(onGraphqlError).toHaveBeenCalledWith(error);
    });

    it('falls back to hook-level onGraphqlError', () => {
      const hookOnGraphqlError = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
            onGraphqlError: hookOnGraphqlError,
          }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      const error = new Error('Network error');
      call.onError(error);

      expect(hookOnGraphqlError).toHaveBeenCalledWith(error);
    });

    it('falls back to context onGraphqlError', () => {
      const contextOnGraphqlError = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
          }),
        {
          wrapper: createWrapper({
            onGraphqlError: contextOnGraphqlError,
          }),
        },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      const error = new Error('Network error');
      call.onError(error);

      expect(contextOnGraphqlError).toHaveBeenCalledWith(error);
    });

    it('execute-level onGraphqlError takes priority over hook-level and context', () => {
      const execOnGraphqlError = vi.fn();
      const hookOnGraphqlError = vi.fn();
      const contextOnGraphqlError = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
            onGraphqlError: hookOnGraphqlError,
          }),
        {
          wrapper: createWrapper({
            onGraphqlError: contextOnGraphqlError,
          }),
        },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
          onGraphqlError: execOnGraphqlError,
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      const error = new Error('Network error');
      call.onError(error);

      expect(execOnGraphqlError).toHaveBeenCalledOnce();
      expect(hookOnGraphqlError).not.toHaveBeenCalled();
      expect(contextOnGraphqlError).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('does nothing when result has no __typename', () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
            onSuccess,
            onError,
          }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      call.onCompleted({ createUser: {} });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('does nothing for %other typename', () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
            onSuccess,
            onError,
          }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      call.onCompleted({
        createUser: { __typename: '%other' },
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('passes through additional config to relay execute', () => {
      const { result } = renderHook(
        () =>
          useMutationResult<TestMutation, 'createUser'>({
            mutation: MOCK_MUTATION,
            name: 'createUser',
          }),
        { wrapper: createWrapper() },
      );

      const uploadables = {};

      act(() => {
        result.current[0]({
          variables: { input: { email: 'test@test.com' } },
          uploadables,
        });
      });

      const call = mockExecute.mock.calls[0]![0];
      expect(call.variables).toEqual({ input: { email: 'test@test.com' } });
      expect(call.uploadables).toBe(uploadables);
    });
  });
});
