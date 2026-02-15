import { useContext } from 'react';
import { useMutation, type UseMutationConfig } from 'react-relay';
import type { GraphQLTaggedNode, MutationParameters } from 'relay-runtime';

import { MutationResultContext } from './MutationResultProvider';

type MutationResultSuccess<N extends string> = {
  readonly __typename: `${N}Success`;
  [K: string]: unknown;
};

type MutationResultError<N extends string> = {
  readonly __typename: `${N}Error`;
  [K: string]: unknown;
};

type MutationResultOther = {
  readonly __typename: '%other';
};

type MutationResultParameters<N extends string> = Omit<
  MutationParameters,
  'response'
> & {
  response: {
    readonly [K in N]:
      | MutationResultSuccess<N>
      | MutationResultError<N>
      | MutationResultOther;
  };
};

type UseMutationExecuteArgs<
  TMutation extends MutationResultParameters<N>,
  N extends string,
> = {
  onSuccess?: (
    result: Extract<TMutation['response'][N], MutationResultSuccess<N>>,
  ) => void | Promise<void>;
  onError?: (
    result: Extract<TMutation['response'][N], MutationResultError<N>>,
  ) => void | Promise<void>;
  onGraphqlError?: (error: Error) => void;
};

type UseMutationResultArgs<
  TMutation extends MutationResultParameters<N>,
  N extends string,
> = {
  mutation: GraphQLTaggedNode;
  name: keyof TMutation['response'];
} & UseMutationExecuteArgs<TMutation, N>;

export const useMutationResult = <
  TMutation extends MutationResultParameters<N>,
  N extends string = Extract<keyof TMutation['response'], string>,
>({
  name,
  mutation,
  ...args
}: UseMutationResultArgs<TMutation, N>) => {
  const context = useContext(MutationResultContext);
  const [execute, isPending] = useMutation<TMutation>(mutation);

  const executeFn = (
    config: UseMutationExecuteArgs<TMutation, N> &
      Omit<UseMutationConfig<TMutation>, 'onCompleted' | 'onError'>,
  ) => {
    execute({
      ...config,
      onCompleted: (response: TMutation['response']) => {
        const result = response[name];

        if (!Object.hasOwn(result, '__typename')) {
          return;
        }

        if (result.__typename === `${name.toString()}Success`) {
          if (args.onSuccess) {
            void args.onSuccess(
              result as Extract<
                TMutation['response'][N],
                MutationResultSuccess<N>
              >,
            );
          }

          if (config.onSuccess) {
            void config.onSuccess(
              result as Extract<
                TMutation['response'][N],
                MutationResultSuccess<N>
              >,
            );
          }
        }

        if (result.__typename === `${name.toString()}Error`) {
          if (args.onError) {
            void args.onError(
              result as Extract<
                TMutation['response'][N],
                MutationResultError<N>
              >,
            );
          } else if (config.onError) {
            void config.onError(
              result as Extract<
                TMutation['response'][N],
                MutationResultError<N>
              >,
            );
          } else if (context.onError) {
            context.onError(result);
          }
        }
      },
      onError: (error) => {
        if (config.onGraphqlError) {
          config.onGraphqlError(error);
        } else if (args.onGraphqlError) {
          args.onGraphqlError(error);
        } else if (context.onGraphqlError) {
          context.onGraphqlError(error);
        }
      },
    });
  };

  return [executeFn, isPending] as const;
};
