/**
 * Lock Screen Component
 *
 * Wrapper component for the unified AuthScreen in 'locked' mode.
 * Displayed when the vault is locked due to idle timeout.
 */

import { AuthScreen } from './AuthScreen';

export function LockScreen() {
  return <AuthScreen mode="locked" />;
}
