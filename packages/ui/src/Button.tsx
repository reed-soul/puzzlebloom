import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './icons';

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

interface Common {
  variant?: Variant;
  size?: Size;
  iconLeft?: IconName;
  iconRight?: IconName;
  block?: boolean;
  children?: ReactNode;
}

export const buttonClass = ({ variant = 'secondary', size = 'md', block }: Common, extra?: string) =>
  ['pb-btn', `pb-btn--${variant}`, `pb-btn--${size}`, block ? 'pb-btn--block' : '', extra ?? '']
    .filter(Boolean)
    .join(' ');

export const ButtonContent = ({ children, iconLeft, iconRight }: { children?: ReactNode; iconLeft?: IconName; iconRight?: IconName }) => (
  <>
    {iconLeft ? <Icon name={iconLeft} size={20} /> : null}
    {children ? <span className="pb-btn__label">{children}</span> : null}
    {iconRight ? <Icon name={iconRight} size={20} /> : null}
  </>
);

export type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label'?: string };

export function Button({ variant, size, iconLeft, iconRight, block, children, className, ...rest }: ButtonProps) {
  const shape: Common = { variant, size, block };
  return (
    <button
      type={rest.type ?? 'button'}
      className={buttonClass(shape, className)}
      {...rest}
    >
      <ButtonContent iconLeft={iconLeft} iconRight={iconRight}>{children}</ButtonContent>
    </button>
  );
}

export type ButtonLinkProps = Common & AnchorHTMLAttributes<HTMLAnchorElement>;

export function ButtonLink({ variant, size, iconLeft, iconRight, block, children, className, ...rest }: ButtonLinkProps) {
  const shape: Common = { variant, size, block };
  return (
    <a className={buttonClass(shape, className)} {...rest}>
      <ButtonContent iconLeft={iconLeft} iconRight={iconRight}>{children}</ButtonContent>
    </a>
  );
}
