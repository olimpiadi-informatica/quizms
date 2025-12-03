export default function getTitle(): string {
  return window.location.hostname.startsWith("fibonacci")
    ? "Giochi di Fibonacci"
    : "Olimpiadi di Informatica";
}
