import { GraphQLNonNull, GraphQLString, resolveObjMapThunk } from 'graphql';
import {
  GraphQLUnionType,
  type GraphQLFieldConfig,
  type GraphQLInputFieldConfig,
  type GraphQLResolveInfo,
  type ThunkObjMap,
  GraphQLObjectType,
} from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';

type MutationFn<TInput = unknown, TOutput = unknown, TContext = unknown> = (
  object: TInput,
  ctx: TContext,
  info: GraphQLResolveInfo,
) => TOutput;

type MutationConfig<
  TInput = unknown,
  TSuccess = unknown,
  TError = unknown,
  TContext = unknown,
  TExtensions extends Record<string, unknown> = Record<string, unknown>,
> = {
  name: string;
  description?: string;
  deprecationReason?: string;
  extensions?: TExtensions;
  inputFields: ThunkObjMap<GraphQLInputFieldConfig>;
  errorFields?: ThunkObjMap<GraphQLFieldConfig<TError, TContext>>;
  successFields?: ThunkObjMap<GraphQLFieldConfig<TSuccess, TContext>>;
  mutateAndGetPayload: MutationFn<
    TInput,
    | Promise<(TSuccess & { success: true }) | (TError & { success: false })>
    | ({ success: true } & TSuccess)
    | ({ success: false } & TError),
    TContext
  >;
};

export const mutationWithResult = <
  TInput = unknown,
  TSuccess = unknown,
  TError = unknown,
  TContext = unknown,
>({
  name,
  successFields = {},
  errorFields = {},
  ...config
}: MutationConfig<TInput, TSuccess, TError, TContext>): GraphQLFieldConfig<
  unknown,
  TContext
> => {
  const augmentedSuccessFields = () => ({
    ...resolveObjMapThunk(successFields),
    clientMutationId: {
      type: GraphQLString,
    },
  });

  const augmentedErrorFields = () => ({
    ...resolveObjMapThunk(errorFields),
    clientMutationId: {
      type: GraphQLString,
    },
  });

  const successType = new GraphQLObjectType({
    name: name + 'Success',
    fields: augmentedSuccessFields,
  });

  const errorType = new GraphQLObjectType({
    name: name + 'Error',
    fields: augmentedErrorFields,
  });

  const outputType = new GraphQLUnionType({
    name: name + 'Payload',
    types: [successType, errorType],
    resolveType: (node: { success: boolean }) => {
      if (node.success) {
        return successType.name;
      }

      return errorType.name;
    },
  });

  return {
    ...mutationWithClientMutationId({
      ...config,
      name,
      outputFields: {},
    }),

    type: new GraphQLNonNull(outputType),
  };
};
