/**
 * Deterministic test doubles for infrastructure.
 *
 * `FakeIds` is a sequential id generator: the first `next('INV')` returns
 * `INV-0001`, the second `INV-0002`, and so on. Repository fakes are added in
 * later tasks (Task 27).
 */
export class FakeIds {
  private counter = 0;

  next(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${String(this.counter).padStart(4, '0')}`;
  }
}
