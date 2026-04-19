/** Shape of Spring Data {@code Page<T>} JSON. */
export type SpringPage<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}
