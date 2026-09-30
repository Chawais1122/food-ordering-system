export enum IdentifierType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export interface ParsedIdentifier {
  type: IdentifierType;
  value: string;
}

export const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
export const normalizePhone = (phone: string): string => phone.replace(/[\s()-]/g, '');

export const parseIdentifier = (raw: string): ParsedIdentifier | undefined => {
  const trimmed = raw.trim();
  if (EMAIL_REGEX.test(trimmed)) {
    return { type: IdentifierType.EMAIL, value: normalizeEmail(trimmed) };
  }
  const phone = normalizePhone(trimmed);
  if (E164_PHONE_REGEX.test(phone)) {
    return { type: IdentifierType.PHONE, value: phone };
  }
  return undefined;
};

export const maskIdentifier = ({ type, value }: ParsedIdentifier): string => {
  if (type === IdentifierType.EMAIL) {
    const [local, domain] = value.split('@');
    return `${local.charAt(0)}***@${domain}`;
  }
  return `${value.slice(0, 3)}${'*'.repeat(Math.max(value.length - 5, 0))}${value.slice(-2)}`;
};
