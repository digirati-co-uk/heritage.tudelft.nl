export function lazyValue<T>(loader: () => Promise<T>): LazyValue<T> {
  let isLoaded = false;
  let value: any = null;

  return {
    get value() {
      if (!isLoaded) {
        value = loader();
        isLoaded = true;
      }
      return value;
    },
  };
}

export interface LazyValue<T> {
  value: Promise<T>;
}
