import { IconBase, type IconProps } from './IconBase';

/**
 * Open eye for "show" toggles on concealed values — passwords, temporary
 * credentials and hidden detail. The toggle must expose its current state
 * (shown / hidden) through the host button's accessible name.
 */
export function EyeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2 12C2 8 8 5.5 12 5.5C16 5.5 22 9 22 12C22 15 16 18.5 12 18.5C8 18.5 2 16 2 12Z" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </IconBase>
  );
}
