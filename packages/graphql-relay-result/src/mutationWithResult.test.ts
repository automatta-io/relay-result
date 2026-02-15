import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  GraphQLUnionType,
} from 'graphql';
import { describe, expect, it } from 'vitest';

import { mutationWithResult } from './index';

describe('mutationWithResult', () => {
  it('returns a GraphQLFieldConfig with a non-null union type', () => {
    const field = mutationWithResult({
      name: 'CreateUser',
      inputFields: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      mutateAndGetPayload: () => ({ success: true as const }),
    });

    expect(field.type).toBeInstanceOf(GraphQLNonNull);

    const unionType = (field.type as GraphQLNonNull<GraphQLUnionType>).ofType;
    expect(unionType).toBeInstanceOf(GraphQLUnionType);
    expect(unionType.name).toBe('CreateUserPayload');
  });

  it('creates Success and Error types within the union', () => {
    const field = mutationWithResult({
      name: 'CreateUser',
      inputFields: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      mutateAndGetPayload: () => ({ success: true as const }),
    });

    const unionType = (field.type as GraphQLNonNull<GraphQLUnionType>).ofType;
    const types = unionType.getTypes();

    expect(types).toHaveLength(2);
    expect(types[0]!.name).toBe('CreateUserSuccess');
    expect(types[1]!.name).toBe('CreateUserError');
  });

  it('includes clientMutationId on success type fields', () => {
    const field = mutationWithResult({
      name: 'CreateUser',
      inputFields: {},
      successFields: {
        name: { type: GraphQLString },
      },
      mutateAndGetPayload: () => ({ success: true as const }),
    });

    const unionType = (field.type as GraphQLNonNull<GraphQLUnionType>).ofType;
    const successType = unionType.getTypes()[0] as GraphQLObjectType;
    const fields = successType.getFields();

    expect(fields['name']).toBeDefined();
    expect(fields['clientMutationId']).toBeDefined();
  });

  it('includes clientMutationId on error type fields', () => {
    const field = mutationWithResult({
      name: 'CreateUser',
      inputFields: {},
      errorFields: {
        message: { type: GraphQLString },
      },
      mutateAndGetPayload: () => ({ success: false as const }),
    });

    const unionType = (field.type as GraphQLNonNull<GraphQLUnionType>).ofType;
    const errorType = unionType.getTypes()[1] as GraphQLObjectType;
    const fields = errorType.getFields();

    expect(fields['message']).toBeDefined();
    expect(fields['clientMutationId']).toBeDefined();
  });

  it('resolves to the success type when success is true', () => {
    const field = mutationWithResult({
      name: 'CreateUser',
      inputFields: {},
      mutateAndGetPayload: () => ({ success: true as const }),
    });

    const unionType = (field.type as GraphQLNonNull<GraphQLUnionType>).ofType;
    const resolveType = unionType.resolveType!;
    const result = resolveType(
      { success: true },
      {} as never,
      {} as never,
      {} as never,
    );

    expect(result).toBe('CreateUserSuccess');
  });

  it('resolves to the error type when success is false', () => {
    const field = mutationWithResult({
      name: 'CreateUser',
      inputFields: {},
      mutateAndGetPayload: () => ({ success: false as const }),
    });

    const unionType = (field.type as GraphQLNonNull<GraphQLUnionType>).ofType;
    const resolveType = unionType.resolveType!;
    const result = resolveType(
      { success: false },
      {} as never,
      {} as never,
      {} as never,
    );

    expect(result).toBe('CreateUserError');
  });

  it('works with empty successFields and errorFields', () => {
    const field = mutationWithResult({
      name: 'DoSomething',
      inputFields: {},
      mutateAndGetPayload: () => ({ success: true as const }),
    });

    const unionType = (field.type as GraphQLNonNull<GraphQLUnionType>).ofType;
    const successType = unionType.getTypes()[0] as GraphQLObjectType;
    const errorType = unionType.getTypes()[1] as GraphQLObjectType;

    expect(Object.keys(successType.getFields())).toEqual(['clientMutationId']);
    expect(Object.keys(errorType.getFields())).toEqual(['clientMutationId']);
  });

  it('calls mutateAndGetPayload and returns success result via resolve', async () => {
    const field = mutationWithResult<
      { email: string },
      { userId: string },
      { message: string }
    >({
      name: 'CreateUser',
      inputFields: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      successFields: {
        userId: {
          type: GraphQLString,
          resolve: (obj) => obj.userId,
        },
      },
      errorFields: {
        message: { type: GraphQLString },
      },
      mutateAndGetPayload: ({ email }) => {
        if (email === 'valid@test.com') {
          return { success: true as const, userId: 'user-123' };
        }
        return { success: false as const, message: 'Invalid email' };
      },
    });

    const resolve = field.resolve!;
    const result = (await resolve(
      {},
      { input: { email: 'valid@test.com', clientMutationId: '1' } },
      {} as never,
      {} as never,
    )) as { success: boolean; userId?: string };

    expect(result.success).toBe(true);
    expect(result.userId).toBe('user-123');
  });

  it('calls mutateAndGetPayload and returns error result via resolve', async () => {
    const field = mutationWithResult<
      { email: string },
      { userId: string },
      { message: string }
    >({
      name: 'CreateUser',
      inputFields: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      successFields: {
        userId: { type: GraphQLString },
      },
      errorFields: {
        message: {
          type: GraphQLString,
          resolve: (obj) => obj.message,
        },
      },
      mutateAndGetPayload: ({ email }) => {
        if (email === 'valid@test.com') {
          return { success: true as const, userId: 'user-123' };
        }
        return { success: false as const, message: 'Invalid email' };
      },
    });

    const resolve = field.resolve!;
    const result = (await resolve(
      {},
      { input: { email: 'bad@test.com', clientMutationId: '1' } },
      {} as never,
      {} as never,
    )) as { success: boolean; message?: string };

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid email');
  });

  it('handles async mutateAndGetPayload', async () => {
    const field = mutationWithResult<
      Record<string, never>,
      { result: string },
      never
    >({
      name: 'AsyncMutation',
      inputFields: {},
      successFields: {
        result: {
          type: GraphQLString,
          resolve: (obj) => obj.result,
        },
      },
      mutateAndGetPayload: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { success: true as const, result: 'done' };
      },
    });

    const resolve = field.resolve!;
    const result = (await resolve(
      {},
      { input: { clientMutationId: '1' } },
      {} as never,
      {} as never,
    )) as { success: boolean; result?: string };

    expect(result.success).toBe(true);
    expect(result.result).toBe('done');
  });

  it('names follow the convention: {name}Success, {name}Error, {name}Payload', () => {
    const field = mutationWithResult({
      name: 'UpdateProfile',
      inputFields: {},
      mutateAndGetPayload: () => ({ success: true as const }),
    });

    const unionType = (field.type as GraphQLNonNull<GraphQLUnionType>).ofType;
    expect(unionType.name).toBe('UpdateProfilePayload');

    const types = unionType.getTypes();
    expect(types[0]!.name).toBe('UpdateProfileSuccess');
    expect(types[1]!.name).toBe('UpdateProfileError');
  });
});
