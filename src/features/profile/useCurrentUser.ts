import { defaultPerson, useScopeLabel, useSession } from '@/features/session';
import { useProfile } from './profileContext';

/** The signed-in person as the UI shows them — their own display name/photo
 *  if they set one in Profile settings, otherwise the seat's default person —
 *  plus what their session is scoped to. */
export function useCurrentUser() {
  const session = useSession();
  const { customName, avatarDataUrl } = useProfile();
  const scopeLabel = useScopeLabel();
  const person = defaultPerson(session);
  return {
    name: customName ?? person.name,
    defaultName: person.name,
    email: person.email,
    avatarUrl: avatarDataUrl,
    scopeLabel,
  };
}
