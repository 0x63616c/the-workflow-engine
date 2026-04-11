export class Database {
  exec() {}
  close() {}
  query() {
    return { all: () => [], get: () => null, run: () => ({}) };
  }
}
