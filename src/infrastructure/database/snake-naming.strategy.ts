import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

const toSnakeCase = (value: string): string =>
  value
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  override columnName(propertyName: string, customName: string | undefined, prefixes: string[]): string {
    return toSnakeCase([...prefixes, customName ?? propertyName].join('_'));
  }

  override relationName(propertyName: string): string {
    return toSnakeCase(propertyName);
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnakeCase(`${relationName}_${referencedColumnName}`);
  }
}
