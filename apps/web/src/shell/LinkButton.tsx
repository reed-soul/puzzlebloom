import type { AnchorHTMLAttributes, ReactNode } from 'react';
import {
  ButtonContent,
  buttonClass,
  type ButtonSize,
  type ButtonVariant,
  type IconName,
} from '@puzzlebloom/ui';
import { Link } from '../app/router';

interface Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: IconName;
  iconRight?: IconName;
  block?: boolean;
  children?: ReactNode;
}

/**
 * A router link wearing button clothes. Built here rather than in the design
 * kit because the kit must not know that a router exists.
 */
export function LinkButton({ to, variant = 'secondary', size = 'md', iconLeft, iconRight, block, children, className, ...rest }: Props) {
  return (
    <Link to={to} className={buttonClass({ variant, size, block }, className)} {...rest}>
      <ButtonContent iconLeft={iconLeft} iconRight={iconRight}>
        {children}
      </ButtonContent>
    </Link>
  );
}
