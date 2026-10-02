import { createContext, useContext, type Context } from 'react';

/**
 * A React context whose hook throws when used outside its provider, instead of
 * silently returning `undefined`. Returns the context (give its `.Provider` a
 * value in the provider component) and the hook consumers call.
 *
 *   const [SessionContext, useSession] = createStrictContext<Session>('Session');
 */
export function createStrictContext<T>(name: string): [Context<T | null>, () => T] {
  const Ctx = createContext<T | null>(null);
  Ctx.displayName = name;
  const useStrictContext = () => {
    const value = useContext(Ctx);
    if (value === null) throw new Error(`use${name} must be used inside ${name}Provider`);
    return value;
  };
  return [Ctx, useStrictContext];
}
