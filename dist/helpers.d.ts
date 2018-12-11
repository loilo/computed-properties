import { PlainObject } from './data-structures';
/**
 * Checks if value is a plain object
 */
export declare function isPlainObject(value: any): value is PlainObject;
/**
 * Checks if value is an observable object or array
 */
export declare function isObservable(value: any): boolean;
/**
 * Use this instead of Object.assign() for compatibility
 */
export declare function extend(...objects: PlainObject[]): any;
