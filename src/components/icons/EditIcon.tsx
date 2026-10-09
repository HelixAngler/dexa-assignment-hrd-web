import { IconBase, type IconProps } from './IconBase';

/**
 * Pencil for edit affordances — row actions, profile-field links and "Ubah"
 * buttons. Decorative by default: the surrounding link or button must carry
 * the accessible name, and an icon-only edit control needs a 44×44 px box.
 */
export function EditIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 21 5 16 16 5a3 3 0 0 1 3 3L8 19Z" />
      <path d="M5 16 8 19" />
    </IconBase>
  );
}
