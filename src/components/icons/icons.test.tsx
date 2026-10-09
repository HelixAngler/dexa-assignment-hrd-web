import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IconProps } from './IconBase';
import * as iconSet from './index';
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CloseIcon,
  EditIcon,
  EyeIcon,
  HamburgerIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
} from './index';

const CURATED_NAMES = [
  'AlertIcon',
  'CheckIcon',
  'ChevronDownIcon',
  'ChevronLeftIcon',
  'ChevronRightIcon',
  'ChevronUpIcon',
  'CloseIcon',
  'EditIcon',
  'EyeIcon',
  'HamburgerIcon',
  'PlusIcon',
  'SearchIcon',
  'UploadIcon',
] as const;

const GLYPHS: ReadonlyArray<readonly [string, (props: IconProps) => ReactElement]> = [
  ['AlertIcon', AlertIcon],
  ['CheckIcon', CheckIcon],
  ['ChevronDownIcon', ChevronDownIcon],
  ['ChevronLeftIcon', ChevronLeftIcon],
  ['ChevronRightIcon', ChevronRightIcon],
  ['ChevronUpIcon', ChevronUpIcon],
  ['CloseIcon', CloseIcon],
  ['EditIcon', EditIcon],
  ['EyeIcon', EyeIcon],
  ['HamburgerIcon', HamburgerIcon],
  ['PlusIcon', PlusIcon],
  ['SearchIcon', SearchIcon],
  ['UploadIcon', UploadIcon],
];

function onlySvg(container: HTMLElement, name: string): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (svg === null) {
    throw new Error(`${name} rendered no <svg> element`);
  }
  return svg as SVGSVGElement;
}

describe('icon set', () => {
  it('exports exactly the curated icon names from the barrel', () => {
    const exported = Object.keys(iconSet)
      .filter((name) => name.endsWith('Icon'))
      .sort();
    expect(exported).toEqual([...CURATED_NAMES].sort());
  });

  it('renders every glyph as a decorative 24×24 currentColor drawing', () => {
    for (const [name, Glyph] of GLYPHS) {
      const { container, unmount } = render(<Glyph />);
      const svg = onlySvg(container, name);

      expect(svg, name).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg, name).toHaveAttribute('width', '24');
      expect(svg, name).toHaveAttribute('height', '24');
      expect(svg, name).toHaveAttribute('fill', 'none');
      expect(svg, name).toHaveAttribute('stroke', 'currentColor');
      expect(svg, name).toHaveAttribute('stroke-width', '2');
      expect(svg, name).toHaveAttribute('stroke-linecap', 'round');
      expect(svg, name).toHaveAttribute('stroke-linejoin', 'round');
      expect(svg, name).toHaveAttribute('aria-hidden', 'true');
      expect(svg, name).toHaveAttribute('focusable', 'false');
      expect(svg, name).not.toHaveAttribute('role');
      expect(
        svg.querySelector('path, circle, line, rect, polyline, polygon'),
        name,
      ).not.toBeNull();

      unmount();
    }
  });

  it('exposes a labelled image with a title when a title is supplied', () => {
    const label = 'Accessible glyph label';

    for (const [name, Glyph] of GLYPHS) {
      const { container, unmount } = render(<Glyph title={label} />);
      const svg = onlySvg(container, name);

      expect(svg, name).toHaveAttribute('role', 'img');
      expect(svg, name).not.toHaveAttribute('aria-hidden');
      expect(screen.getByTitle(label), name).toBeInTheDocument();

      unmount();
    }
  });

  it('scales through the size prop and passes class hooks to the svg', () => {
    const { container, unmount } = render(
      <AlertIcon size={32} className="h-8 w-8" />,
    );
    const svg = onlySvg(container, 'AlertIcon');

    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
    expect(svg).toHaveAttribute('class', 'h-8 w-8');

    unmount();

    const sized = render(<AlertIcon size="1em" />);
    expect(onlySvg(sized.container, 'AlertIcon')).toHaveAttribute('width', '1em');
    sized.unmount();
  });
});
