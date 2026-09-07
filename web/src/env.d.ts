/// <reference types="astro/client" />

declare module "*.py?raw" {
  const source: string;
  export default source;
}
