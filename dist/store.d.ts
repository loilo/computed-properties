import { FlatValue, FlatObject } from './data-structures';
export declare type ReactiveValue = string | number | boolean | ReactiveObject | ReactiveArray | Function;
export interface ReactiveInstance {
    $raw(): any;
    $set(...args: any[]): void;
    $destroy(): any;
}
export interface ReactiveObject extends ReactiveInstance {
    [prop: string]: ReactiveValue;
    $raw(): Array<ReactiveValue>;
    $set(prop: string, value: FlatValue): void;
    $destroy(): FlatObject;
}
export interface ReactiveArray extends Array<ReactiveValue>, ReactiveInstance {
    $raw(): Array<ReactiveValue>;
    $set(index: number, value: FlatValue): void;
    $destroy(): Array<FlatValue>;
}
export declare type StaticProp = FlatValue;
export declare type ReactiveProp = () => any;
export interface StoreData {
    [prop: string]: StaticProp | ReactiveProp;
}
declare type Store<U = any> = {
    [T in keyof U]: U[T];
} & {
    $raw(): U;
    $watch<T extends keyof U>(prop: T, callback: (now?: U[T], previous?: U[T]) => void): () => void;
};
declare function Store<T>(data: {
    [U in keyof T]: T[U] | ((this: T) => T[U]);
}, { verbose }?: {
    verbose?: boolean;
}): Store<T>;
export default Store;
