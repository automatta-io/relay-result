import { createContext, type ReactNode } from 'react';

export type MutationResultContextValue = {
  onGraphqlError?: (error: Error) => void;
  onError?: (result: { __typename: string; [K: string]: unknown }) => void;
};

export const MutationResultContext = createContext<MutationResultContextValue>(
  {},
);

type MutationResultProviderProps = MutationResultContextValue & {
  children: ReactNode;
};

export const MutationResultProvider = ({
  children,
  ...value
}: MutationResultProviderProps) => {
  return (
    <MutationResultContext.Provider value={value}>
      {children}
    </MutationResultContext.Provider>
  );
};
