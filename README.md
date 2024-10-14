# Relay Result

Relay Result is a tiny layer on top of Relay's libraries to add type-safe payloads for GraphQL mutations.

Example of the generated types:

```graphql
union UserLoginPayload = UserLoginSuccess | UserLoginError

type UserLoginSuccess {
  user: User!
  clientMutationId: String
}

type UserLoginError {
  error: String!
  clientMutationId: String
}

input UserLoginInput {
  """
  Email of the user attempting to log in
  """
  email: String!

  """
  Password of the user attempting to log in
  """
  password: String!
  clientMutationId: String
}
```

## Installation

Install `graphql-relay-result` in your backend:

```sh
npm install --save graphql graphql-relay graphql-relay-result
# Or Yarn
yarn add graphql graphql-relay graphql-relay-result
# Or PNPM
pnpm add graphql graphql-relay graphql-relay-result
# Or Bun
bun add graphql graphql-relay graphql-relay-result
```

Install `react-relay-result` in your frontend:

```sh
npm install --save react-relay react-relay-result
# Or Yarn
yarn add react-relay react-relay-result
# Or PNPM
pnpm add react-relay react-relay-result
# Or Bun
bun add react-relay react-relay-result
```

## Usage

```ts
import { GraphQLString, GraphQLInt, GraphQLNonNull } from 'graphql';
import { mutationWithResult } from 'graphql-relay-result';

type UserLoginInput = {
  email: string;
  password: number;
};

type UserLoginSuccess = {
  userId: string;
};

type UserLoginError = {
  error: string;
};

export const UserLogin = mutationWithResult<
  UserLoginInput,
  UserLoginSuccess,
  UserLoginError,
  __YourContext
>({
  name: 'UserLogin',
    inputFields: {
    email: {
      type: new GraphQLNonNull(GraphQLString),
    },
    password: {
      type: new GraphQLNonNull(GraphQLInt),
    },
  },
  mutateAndGetPayload: ({ email, password }) => {
    const userLoginResult = await userLogin({ email, password });

    if (!userLoginResult.success) {
      return {
        success: false,
        error: userLoginResult.error,
      };
    }

    const { user } = userLoginResult;

    return {
      userId: user.id,
    };
  },
  successFields: {
    user: {
      type: new GraphQLNonNull(UserType),
      resolve: (result) => userLoad(result.userId),
    },
  },
  errorFields: {
    error: {
      type: GraphQLString,
      resolve: (result) => result.error,
    },
  },
});
```

In the frontend:

```tsx
// UserLoginMutation.tsx
import { graphql } from 'react-relay';

export const UserLogin = graphql`
  mutation UserLoginMutation($input: UserLoginInput!) {
    userLogin(input: $input) {
      __typename

      ... on UserLoginSuccess {
        user {
          id
          name
        }
      }

      ... on UserLoginError {
        error
      }
    }
  }
`;

// LoginForm.tsx
import { useMutationResult } from 'react-relay-result';

import { UserLogin } from './UserLoginMutation';
import type { UserLoginMutation } from './__generated__/UserLoginMutation.graphql';

const LoginForm = () => {
  const [userLogin, isPending] = useMutationResult<UserLoginMutation>({
    name: 'UserLogin',
    mutation: UserLogin,
    onSuccess: ({ user }) => {
      console.log(user.id);
    },
    onError: ({ error }) => {
      console.log(error);
    },
  });

  return (
    // ...
  )
};

export default LoginForm;
```

## License

Relay Result is under the [MIT License](https://github.com/automatta-io/relay-result/blob/main/LICENSE).
