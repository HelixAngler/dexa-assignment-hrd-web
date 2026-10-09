import { IconBase, type IconProps } from './IconBase';

/**
 * Plus mark for create actions — adding a record, starting a new entry or
 * appending a row. Decorative; pair with a visible label such as "Tambah"
 * on the primary button.
 */
export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}
